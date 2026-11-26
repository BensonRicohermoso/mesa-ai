import { env } from "../../config/server-config.js";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 12000;

/**
 * Create a structured error for Gemini client failures so callers can
 * distinguish configuration, timeout, rate-limit, and parse errors.
 */
function createGeminiError(code, message, statusCode = 502) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

/**
 * Strip optional Markdown code fences (e.g. ```json ... ```) around JSON text.
 * @param {string} raw
 * @returns {string}
 */
export function stripJsonFences(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/**
 * Extract concatenated text parts from a Gemini generateContent response.
 * @param {object} payload
 * @returns {string}
 */
export function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

/**
 * Normalize an array of conversation turns or a single user prompt into
 * Gemini REST API `contents` format.
 * @param {string | Array<{ role: string, content?: string, parts?: Array }>} input
 */
function normalizeContents(input) {
  if (typeof input === "string") {
    return [{ role: "user", parts: [{ text: input }] }];
  }
  if (!Array.isArray(input) || input.length === 0) {
    throw createGeminiError(
      "GEMINI_INVALID_INPUT",
      "Gemini contents must be a non-empty string or message array.",
      400
    );
  }
  return input.map((turn) => {
    if (Array.isArray(turn.parts)) {
      return { role: turn.role === "assistant" ? "model" : turn.role, parts: turn.parts };
    }
    return {
      role: turn.role === "assistant" || turn.role === "model" ? "model" : "user",
      parts: [{ text: String(turn.content ?? "") }],
    };
  });
}

/**
 * Create a thin Gemini REST API client with timeout and JSON parsing support.
 */
export function createGeminiClient({
  apiKey = env.GEMINI_API_KEY,
  model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchFn = fetch,
} = {}) {
  const trimmedKey = typeof apiKey === "string" ? apiKey.trim() : "";
  const resolvedModel =
    typeof model === "string" && model.trim()
      ? model.trim()
      : DEFAULT_GEMINI_MODEL;

  async function callGenerateContent({
    systemInstruction,
    contents,
    temperature = 0.3,
    maxOutputTokens = 1024,
    responseMimeType,
  }) {
    if (!trimmedKey) {
      throw createGeminiError(
        "GEMINI_NOT_CONFIGURED",
        "GEMINI_API_KEY is not configured on the server.",
        503
      );
    }

    const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(resolvedModel)}:generateContent`;
    const body = {
      contents: normalizeContents(contents),
      generationConfig: {
        temperature,
        maxOutputTokens,
        ...(responseMimeType ? { responseMimeType } : {}),
      },
      ...(systemInstruction
        ? {
            systemInstruction: {
              parts: [{ text: String(systemInstruction) }],
            },
          }
        : {}),
    };

    let response;
    try {
      response = await fetchFn(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": trimmedKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (error?.name === "TimeoutError" || error?.name === "AbortError") {
        throw createGeminiError(
          "GEMINI_TIMEOUT",
          `Gemini request timed out after ${timeoutMs}ms.`,
          504
        );
      }
      throw createGeminiError(
        "GEMINI_NETWORK_ERROR",
        error?.message || "Failed to reach Gemini API.",
        502
      );
    }

    if (!response.ok) {
      let detail = "";
      try {
        const errPayload = await response.json();
        detail = errPayload?.error?.message || "";
      } catch {
        // Ignore non-JSON error body
      }
      const code =
        response.status === 429 ? "GEMINI_RATE_LIMITED" : "GEMINI_API_ERROR";
      throw createGeminiError(
        code,
        detail
          ? `Gemini API error (${response.status}): ${detail}`
          : `Gemini API returned status ${response.status}.`,
        response.status === 429 ? 429 : 502
      );
    }

    const payload = await response.json();
    const text = extractGeminiText(payload);
    if (!text) {
      throw createGeminiError(
        "GEMINI_EMPTY_RESPONSE",
        "Gemini returned an empty response.",
        502
      );
    }

    return text;
  }

  return {
    isConfigured: Boolean(trimmedKey),
    model: resolvedModel,

    async generateText(options) {
      return callGenerateContent(options);
    },

    async generateJson(options) {
      const rawText = await callGenerateContent({
        ...options,
        responseMimeType: "application/json",
      });
      const cleaned = stripJsonFences(rawText);
      try {
        return JSON.parse(cleaned);
      } catch {
        throw createGeminiError(
          "GEMINI_INVALID_JSON",
          "Gemini returned malformed JSON output.",
          502
        );
      }
    },
  };
}

export const geminiClient = createGeminiClient();
