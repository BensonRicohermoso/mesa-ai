import { createAuthError } from "../../lib/errors.js";
import { geminiClient } from "./gemini.client.js";

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 50;
const MAX_QUESTION_LENGTH = 500;
const MAX_HISTORY_TURNS = 6;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_PAYMENT_METHODS = new Set(["all", "cash", "gcash", "online"]);
const ALLOWED_SOURCE_MODES = new Set(["live", "preview"]);

const PREVIEW_SNAPSHOT_7D = {
  range: { from: "2026-11-19", to: "2026-11-25", timezone: "Asia/Manila" },
  comparisonRange: { from: "2026-11-12", to: "2026-11-18" },
  kpis: {
    grossSales: 84250.0,
    grossProfit: 52180.0,
    grossMarginPct: 61.93,
    cogs: 32070.0,
    paidOrdersCount: 248,
    averageOrderValue: 339.72,
    cancelledOrExpiredCount: 11,
  },
  deltasPct: {
    grossSales: 12.4,
    grossProfit: 14.1,
    grossMarginPct: 0.92,
    paidOrdersCount: 8.3,
    averageOrderValue: 3.8,
  },
  paymentBreakdown: [
    { method: "cash", orderCount: 146, amount: 47950.0, sharePct: 56.91 },
    { method: "gcash", orderCount: 102, amount: 36300.0, sharePct: 43.09 },
  ],
  peakHours: [
    { hour: 11, hourLabel: "11:00", orderCount: 32, grossSales: 10720.0, grossProfit: 6640.0, isPeak: true },
    { hour: 12, hourLabel: "12:00", orderCount: 42, grossSales: 14280.0, grossProfit: 8840.0, isPeak: true },
    { hour: 13, hourLabel: "13:00", orderCount: 36, grossSales: 12060.0, grossProfit: 7470.0, isPeak: true },
    { hour: 18, hourLabel: "18:00", orderCount: 28, grossSales: 9380.0, grossProfit: 5810.0, isPeak: true },
  ],
  menuEngineering: {
    quadrantCounts: { star: 4, plowhorse: 3, puzzle: 3, dog: 3 },
    topItems: [
      { itemName: "Chicken Adobo Rice Meal", unitsSold: 68, grossSales: 10200.0, grossProfit: 6460.0, grossMarginPct: 63.33, quadrant: "star" },
      { itemName: "Pork Sisig", unitsSold: 52, grossSales: 8840.0, grossProfit: 5460.0, grossMarginPct: 61.76, quadrant: "star" },
      { itemName: "Beef Tapa", unitsSold: 38, grossSales: 6840.0, grossProfit: 3800.0, grossMarginPct: 55.56, quadrant: "star" },
    ],
    lowPerformers: [
      { itemName: "Iced Tea", unitsSold: 8, grossSales: 480.0, grossProfit: 416.0, grossMarginPct: 86.67, quadrant: "dog" },
      { itemName: "Leche Flan", unitsSold: 4, grossSales: 280.0, grossProfit: 192.0, grossMarginPct: 68.57, quadrant: "dog" },
    ],
  },
  performance: {
    cashier: { avgHandlingSeconds: 42, paymentsConfirmedCount: 248 },
    kitchen: { avgQueueWaitSeconds: 65, avgPrepSeconds: 480, avgFulfillmentSeconds: 720, completedOrdersCount: 237 },
    orderOutcomes: { completed: 237, cancelled: 5, expired: 6, inProgress: 11 },
  },
};

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function defaultDateRange() {
  const now = new Date();
  const manilaOffsetMs = 8 * 60 * 60 * 1000;
  const manilaNow = new Date(now.getTime() + manilaOffsetMs);
  const to = manilaNow.toISOString().slice(0, 10);
  const fromDate = new Date(manilaNow.getTime() - 6 * 24 * 60 * 60 * 1000);
  const from = fromDate.toISOString().slice(0, 10);
  return { from, to };
}

function normalizeFilterParams(input = {}) {
  const defaults = defaultDateRange();
  const from = typeof input.from === "string" && DATE_RE.test(input.from) ? input.from : defaults.from;
  const to = typeof input.to === "string" && DATE_RE.test(input.to) ? input.to : defaults.to;
  if (from > to) {
    throw createAuthError(400, "INVALID_DATE_RANGE", "`from` date must be on or before `to` date.");
  }

  const tz = typeof input.tz === "string" && input.tz.trim() ? input.tz.trim() : "Asia/Manila";
  const categoryId = typeof input.categoryId === "string" && input.categoryId.trim() ? input.categoryId.trim() : "all";
  const paymentMethod =
    typeof input.paymentMethod === "string" && ALLOWED_PAYMENT_METHODS.has(input.paymentMethod)
      ? input.paymentMethod
      : "all";
  const sourceMode =
    typeof input.sourceMode === "string" && ALLOWED_SOURCE_MODES.has(input.sourceMode)
      ? input.sourceMode
      : "live";

  return {
    from,
    to,
    tz,
    compare: Boolean(input.compare),
    categoryId,
    paymentMethod,
    sourceMode,
    forceRefresh: Boolean(input.forceRefresh),
  };
}

/**
 * Compute deterministic anomaly flags from verified backend metrics so the LLM
 * only explains thresholds rather than doing arithmetic.
 */
export function computeAnomalyFlags(snapshot) {
  const kpis = snapshot?.kpis || {};
  const deltas = snapshot?.deltasPct || {};
  const perf = snapshot?.performance || {};
  const totalAttempts = Number(kpis.paidOrdersCount || 0) + Number(kpis.cancelledOrExpiredCount || 0);
  const cancellationRatePct = totalAttempts > 0 ? round2((Number(kpis.cancelledOrExpiredCount || 0) / totalAttempts) * 100) : 0;

  const flags = [];
  if (typeof deltas.grossMarginPct === "number" && deltas.grossMarginPct <= -3) {
    flags.push({
      type: "margin_drop",
      severity: "warning",
      metric: "grossMarginPctDelta",
      value: deltas.grossMarginPct,
      detail: `Gross margin shifted by ${deltas.grossMarginPct}% vs prior period.`,
    });
  }
  if (typeof deltas.grossSales === "number" && deltas.grossSales <= -10) {
    flags.push({
      type: "sales_drop",
      severity: "warning",
      metric: "grossSalesDelta",
      value: deltas.grossSales,
      detail: `Gross sales declined by ${Math.abs(deltas.grossSales)}% vs prior period.`,
    });
  }
  if (cancellationRatePct >= 10) {
    flags.push({
      type: "cancellation_spike",
      severity: "warning",
      metric: "cancellationRatePct",
      value: cancellationRatePct,
      detail: `Cancelled/expired orders represent ${cancellationRatePct}% of order volume.`,
    });
  }
  if (Number(perf?.kitchen?.avgPrepSeconds || 0) >= 600) {
    flags.push({
      type: "slow_kitchen_prep",
      severity: "warning",
      metric: "avgPrepSeconds",
      value: perf.kitchen.avgPrepSeconds,
      detail: `Average kitchen prep time is ${Math.round(perf.kitchen.avgPrepSeconds / 60)} minutes.`,
    });
  }
  if (Number(perf?.cashier?.avgHandlingSeconds || 0) >= 90) {
    flags.push({
      type: "slow_cashier_handling",
      severity: "info",
      metric: "avgHandlingSeconds",
      value: perf.cashier.avgHandlingSeconds,
      detail: `Average cashier handling time is ${perf.cashier.avgHandlingSeconds}s.`,
    });
  }

  return { cancellationRatePct, flags };
}

/**
 * Compute deterministic baseline forecast numbers from historical snapshot.
 */
export function computeBaselineForecast(snapshot, horizonDays = 7) {
  const clampedDays = Math.min(30, Math.max(1, Number.parseInt(horizonDays, 10) || 7));
  const kpis = snapshot?.kpis || {};
  const fromDate = new Date(`${snapshot?.range?.from || "2026-11-19"}T00:00:00Z`);
  const toDate = new Date(`${snapshot?.range?.to || "2026-11-25"}T00:00:00Z`);
  const observedDays = Math.max(1, Math.round((toDate - fromDate) / (24 * 60 * 60 * 1000)) + 1);

  const dailyOrders = Number(kpis.paidOrdersCount || 0) / observedDays;
  const dailySales = Number(kpis.grossSales || 0) / observedDays;
  const dailyProfit = Number(kpis.grossProfit || 0) / observedDays;

  return {
    horizonDays: clampedDays,
    observedDays,
    expectedOrders: Math.round(dailyOrders * clampedDays),
    expectedGrossSales: round2(dailySales * clampedDays),
    expectedGrossProfit: round2(dailyProfit * clampedDays),
    expectedGrossMarginPct: round2(kpis.grossMarginPct || 0),
    peakHours: (snapshot?.peakHours || []).filter((h) => h.isPeak).map((h) => h.hourLabel),
  };
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (item) =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim().length > 0
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, MAX_QUESTION_LENGTH),
    }));
}

function buildFallbackBriefing(facts) {
  const { kpis, deltasPct, anomalies } = facts;
  const salesTrend =
    typeof deltasPct?.grossSales === "number"
      ? ` (${deltasPct.grossSales >= 0 ? "+" : ""}${deltasPct.grossSales}% vs prior period)`
      : "";
  const alerts =
    anomalies.flags.length > 0
      ? anomalies.flags.map((f) => f.detail)
      : ["No critical operational anomalies detected in the selected range."];

  return {
    summary: `Recorded ${kpis.paidOrdersCount} paid orders generating PHP ${kpis.grossSales.toLocaleString("en-PH")} in gross sales${salesTrend}, with PHP ${kpis.grossProfit.toLocaleString("en-PH")} gross profit (${kpis.grossMarginPct}% gross margin).`,
    alerts,
    watchItems: [
      `Cancellation/expiry rate stands at ${anomalies.cancellationRatePct}% (${kpis.cancelledOrExpiredCount} orders).`,
      `Average kitchen prep time is ${Math.round((facts.performance?.kitchen?.avgPrepSeconds || 0) / 60)} min.`,
    ],
  };
}

function buildFallbackForecast(facts) {
  const { forecast, menuEngineering } = facts;
  const topStar = menuEngineering?.topItems?.[0]?.itemName || "top-selling items";
  const topDog = menuEngineering?.lowPerformers?.[0]?.itemName || "low-volume items";
  const peakList = forecast.peakHours.length > 0 ? forecast.peakHours.join(", ") : "11:00–13:00";

  return {
    outlookSummary: `Over the next ${forecast.horizonDays} days, baseline trends project ~${forecast.expectedOrders} paid orders, PHP ${forecast.expectedGrossSales.toLocaleString("en-PH")} gross sales, and PHP ${forecast.expectedGrossProfit.toLocaleString("en-PH")} gross profit at ${forecast.expectedGrossMarginPct}% gross margin.`,
    peakHourAdvice: `Peak demand is concentrated around ${peakList}; ensure prep stations and cashier coverage are staffed ahead of those windows.`,
    recommendations: [
      `Feature ${topStar} as a primary combo anchor to protect gross profit volume.`,
      `Review ${topDog} (low popularity, high margin) for bundle pairing or menu placement.`,
    ],
  };
}

function buildFallbackQna(question, facts) {
  const { kpis, deltasPct, anomalies } = facts;
  const q = question.toLowerCase();
  if (q.includes("margin") || q.includes("profit")) {
    return `For ${facts.range.from} to ${facts.range.to}, gross profit is PHP ${kpis.grossProfit.toLocaleString("en-PH")} at a ${kpis.grossMarginPct}% gross margin (${deltasPct?.grossMarginPct >= 0 ? "+" : ""}${deltasPct?.grossMarginPct ?? 0}% vs prior period).`;
  }
  if (q.includes("cancel") || q.includes("expire")) {
    return `There were ${kpis.cancelledOrExpiredCount} cancelled or expired orders (${anomalies.cancellationRatePct}% of total order volume) in the selected period.`;
  }
  return `Based on verified metrics (${facts.range.from} to ${facts.range.to}): ${kpis.paidOrdersCount} paid orders, PHP ${kpis.grossSales.toLocaleString("en-PH")} gross sales, PHP ${kpis.grossProfit.toLocaleString("en-PH")} gross profit, and ${kpis.grossMarginPct}% gross margin.`;
}

const SYSTEM_RULES = [
  "You are MESA AI, an executive restaurant analytics advisor.",
  "Use ONLY the verified JSON metrics provided. Never invent, extrapolate, or alter any numbers.",
  "Always use 'gross profit' and 'gross margin' terminology. Never say 'net profit' or 'net margin'.",
  "Do not suggest or claim to execute automatic database or menu edits.",
].join(" ");

export function createAiService({
  gemini = geminiClient,
  analytics = null,
  ttlMs = DEFAULT_TTL_MS,
  maxCacheSize = MAX_CACHE_SIZE,
} = {}) {
  const cache = new Map();
  const inFlight = new Map();

  function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.value;
  }

  function setCached(key, value) {
    if (cache.size >= maxCacheSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
    cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async function getVerifiedMetricsSnapshot(filter) {
    if (filter.sourceMode === "preview") {
      return {
        ...PREVIEW_SNAPSHOT_7D,
        range: { from: filter.from, to: filter.to, timezone: filter.tz },
      };
    }

    if (analytics && typeof analytics.getAnalyticsSnapshot === "function") {
      return analytics.getAnalyticsSnapshot(filter);
    }

    throw createAuthError(
      501,
      "ANALYTICS_NOT_READY",
      "Live analytics endpoints are not yet implemented. Switch to Preview mode to use AI Advisor."
    );
  }

  async function withCache(cacheKey, forceRefresh, producer) {
    if (!forceRefresh) {
      const hit = getCached(cacheKey);
      if (hit) {
        return { ...hit, meta: { ...hit.meta, cached: true } };
      }
      const pending = inFlight.get(cacheKey);
      if (pending) return pending;
    }

    const promise = producer()
      .then((result) => {
        setCached(cacheKey, result);
        return result;
      })
      .finally(() => {
        inFlight.delete(cacheKey);
      });

    inFlight.set(cacheKey, promise);
    return promise;
  }

  return {
    getStatus() {
      return {
        configured: Boolean(gemini.isConfigured),
        model: gemini.model,
        mode: gemini.isConfigured ? "gemini" : "fallback",
        cacheEntries: cache.size,
      };
    },

    async getBriefing(rawInput = {}) {
      const filter = normalizeFilterParams(rawInput);
      const { forceRefresh, ...cacheFilter } = filter;
      const cacheKey = JSON.stringify({ endpoint: "briefing", ...cacheFilter });

      return withCache(cacheKey, forceRefresh, async () => {
        const snapshot = await getVerifiedMetricsSnapshot(filter);
        const anomalies = computeAnomalyFlags(snapshot);
        const facts = {
          range: snapshot.range,
          kpis: snapshot.kpis,
          deltasPct: snapshot.deltasPct,
          anomalies,
          performance: snapshot.performance,
        };

        let interpretation;
        let source = "fallback";
        if (gemini.isConfigured) {
          try {
            const parsed = await gemini.generateJson({
              systemInstruction: `${SYSTEM_RULES} Return JSON with keys: summary (string), alerts (string[]), watchItems (string[]).`,
              contents: `Analyze these verified restaurant metrics and explain any anomalies:\n${JSON.stringify(facts)}`,
            });
            if (typeof parsed?.summary === "string") {
              interpretation = {
                summary: parsed.summary,
                alerts: Array.isArray(parsed.alerts) ? parsed.alerts.map(String) : [],
                watchItems: Array.isArray(parsed.watchItems) ? parsed.watchItems.map(String) : [],
              };
              source = "gemini";
            }
          } catch {
            // Fall through to deterministic fallback
          }
        }

        if (!interpretation) {
          interpretation = buildFallbackBriefing(facts);
        }

        return {
          facts,
          interpretation,
          meta: {
            source,
            model: gemini.model,
            generatedAt: new Date().toISOString(),
            cached: false,
            sourceMode: filter.sourceMode,
          },
        };
      });
    },

    async getForecast(rawInput = {}) {
      const filter = normalizeFilterParams(rawInput);
      const { forceRefresh, ...cacheFilter } = filter;
      const horizonDays = Math.min(30, Math.max(1, Number.parseInt(rawInput.horizonDays, 10) || 7));
      const cacheKey = JSON.stringify({ endpoint: "forecast", ...cacheFilter, horizonDays });

      return withCache(cacheKey, forceRefresh, async () => {
        const snapshot = await getVerifiedMetricsSnapshot(filter);
        const forecast = computeBaselineForecast(snapshot, horizonDays);
        const facts = {
          range: snapshot.range,
          forecast,
          menuEngineering: snapshot.menuEngineering,
        };

        let interpretation;
        let source = "fallback";
        if (gemini.isConfigured) {
          try {
            const parsed = await gemini.generateJson({
              systemInstruction: `${SYSTEM_RULES} Return JSON with keys: outlookSummary (string), peakHourAdvice (string), recommendations (string[]).`,
              contents: `Explain this baseline forecast and suggest read-only menu/promo recommendations:\n${JSON.stringify(facts)}`,
            });
            if (typeof parsed?.outlookSummary === "string") {
              interpretation = {
                outlookSummary: parsed.outlookSummary,
                peakHourAdvice: typeof parsed.peakHourAdvice === "string" ? parsed.peakHourAdvice : "",
                recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
              };
              source = "gemini";
            }
          } catch {
            // Fall through to deterministic fallback
          }
        }

        if (!interpretation) {
          interpretation = buildFallbackForecast(facts);
        }

        return {
          facts,
          interpretation,
          meta: {
            source,
            model: gemini.model,
            generatedAt: new Date().toISOString(),
            cached: false,
            sourceMode: filter.sourceMode,
          },
        };
      });
    },

    async askQuestion(rawInput = {}) {
      const question = typeof rawInput.question === "string" ? rawInput.question.trim() : "";
      if (!question) {
        throw createAuthError(400, "QUESTION_REQUIRED", "A non-empty question is required.");
      }
      if (question.length > MAX_QUESTION_LENGTH) {
        throw createAuthError(
          400,
          "QUESTION_TOO_LONG",
          `Question must be at most ${MAX_QUESTION_LENGTH} characters.`
        );
      }

      const filter = normalizeFilterParams(rawInput);
      const history = sanitizeHistory(rawInput.history);
      const snapshot = await getVerifiedMetricsSnapshot(filter);
      const anomalies = computeAnomalyFlags(snapshot);
      const dataUsed = {
        range: snapshot.range,
        kpis: snapshot.kpis,
        deltasPct: snapshot.deltasPct,
        anomalies,
        menuEngineering: snapshot.menuEngineering,
      };

      let answer = "";
      let source = "fallback";
      if (gemini.isConfigured) {
        try {
          answer = await gemini.generateText({
            systemInstruction: `${SYSTEM_RULES} Answer the owner's question concisely in plain text using only these verified metrics:\n${JSON.stringify(dataUsed)}`,
            contents: [...history, { role: "user", content: question }],
          });
          source = "gemini";
        } catch {
          // Fall through to deterministic fallback
        }
      }

      if (!answer) {
        answer = buildFallbackQna(question, dataUsed);
      }

      return {
        answer,
        dataUsed,
        meta: {
          source,
          model: gemini.model,
          generatedAt: new Date().toISOString(),
          sourceMode: filter.sourceMode,
        },
      };
    },
  };
}

export const aiService = createAiService();
