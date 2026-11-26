import test from "node:test";
import assert from "node:assert/strict";
import {
  createGeminiClient,
  stripJsonFences,
} from "../src/modules/ai/gemini.client.js";
import {
  computeAnomalyFlags,
  computeBaselineForecast,
  createAiService,
  buildFallbackPlanningInterpretation,
} from "../src/modules/ai/ai.service.js";

test("stripJsonFences removes markdown code fences", () => {
  assert.equal(stripJsonFences('```json\n{"ok":true}\n```'), '{"ok":true}');
  assert.equal(stripJsonFences('```\n{"ok":true}\n```'), '{"ok":true}');
  assert.equal(stripJsonFences('{"ok":true}'), '{"ok":true}');
});

test("createGeminiClient throws GEMINI_NOT_CONFIGURED when apiKey is missing", async () => {
  const client = createGeminiClient({ apiKey: "" });
  assert.equal(client.isConfigured, false);
  await assert.rejects(
    () => client.generateText({ contents: "Hello" }),
    (err) => err.code === "GEMINI_NOT_CONFIGURED" && err.statusCode === 503
  );
});

test("createGeminiClient.generateJson parses fenced JSON and handles 429", async () => {
  let seenHeaders = null;
  const okClient = createGeminiClient({
    apiKey: "test-key",
    model: "gemini-2.5-flash",
    fetchFn: async (_url, init) => {
      seenHeaders = init.headers;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: '```json\n{"summary":"All good"}\n```' }],
              },
            },
          ],
        }),
      };
    },
  });

  const parsed = await okClient.generateJson({ contents: "Summarize" });
  assert.deepEqual(parsed, { summary: "All good" });
  assert.equal(seenHeaders["x-goog-api-key"], "test-key");

  const rateLimitedClient = createGeminiClient({
    apiKey: "test-key",
    fetchFn: async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: "Quota exceeded" } }),
    }),
  });

  await assert.rejects(
    () => rateLimitedClient.generateJson({ contents: "Summarize" }),
    (err) => err.code === "GEMINI_RATE_LIMITED" && err.statusCode === 429
  );
});

test("computeAnomalyFlags detects margin drop, cancellation spike, and slow prep", () => {
  const result = computeAnomalyFlags({
    kpis: { paidOrdersCount: 80, cancelledOrExpiredCount: 20 },
    deltasPct: { grossMarginPct: -4.2, grossSales: -12.5 },
    performance: {
      kitchen: { avgPrepSeconds: 720 },
      cashier: { avgHandlingSeconds: 105 },
    },
  });

  assert.equal(result.cancellationRatePct, 20);
  const types = result.flags.map((f) => f.type);
  assert.deepEqual(types, [
    "margin_drop",
    "sales_drop",
    "cancellation_spike",
    "slow_kitchen_prep",
    "slow_cashier_handling",
  ]);
});

test("computeBaselineForecast projects orders, sales, and gross profit", () => {
  const forecast = computeBaselineForecast(
    {
      range: { from: "2026-11-19", to: "2026-11-25" },
      kpis: {
        paidOrdersCount: 70,
        grossSales: 7000,
        grossProfit: 4200,
        grossMarginPct: 60,
      },
      peakHours: [
        { hourLabel: "11:00", isPeak: false },
        { hourLabel: "12:00", isPeak: true },
      ],
    },
    7
  );

  assert.equal(forecast.observedDays, 7);
  assert.equal(forecast.expectedOrders, 70);
  assert.equal(forecast.expectedGrossSales, 7000);
  assert.equal(forecast.expectedGrossProfit, 4200);
  assert.deepEqual(forecast.peakHours, ["12:00"]);
});

test("aiService.getBriefing falls back deterministically when Gemini is unconfigured", async () => {
  const service = createAiService({
    gemini: createGeminiClient({ apiKey: "" }),
  });

  const res = await service.getBriefing({
    from: "2026-11-19",
    to: "2026-11-25",
    sourceMode: "preview",
  });

  assert.equal(res.meta.source, "fallback");
  assert.equal(res.meta.sourceMode, "preview");
  assert.ok(res.facts.kpis.grossProfit > 0);
  assert.ok(res.interpretation.summary.includes("gross profit"));
});

test("aiService.getBriefing caches responses, deduplicates in-flight calls, and honors forceRefresh", async () => {
  let calls = 0;
  const mockGemini = {
    isConfigured: true,
    model: "gemini-2.5-flash",
    async generateJson() {
      calls += 1;
      await new Promise((r) => setTimeout(r, 15));
      return {
        summary: `Gemini briefing #${calls}`,
        alerts: ["No critical alerts."],
        watchItems: ["Watch 12:00 peak."],
      };
    },
    async generateText() {
      return "OK";
    },
  };

  const service = createAiService({ gemini: mockGemini });
  const params = { from: "2026-11-19", to: "2026-11-25", sourceMode: "preview" };

  const [first, concurrent] = await Promise.all([
    service.getBriefing(params),
    service.getBriefing(params),
  ]);
  assert.equal(calls, 1);
  assert.equal(first.meta.source, "gemini");
  assert.equal(concurrent.interpretation.summary, "Gemini briefing #1");

  const cached = await service.getBriefing(params);
  assert.equal(calls, 1);
  assert.equal(cached.meta.cached, true);

  const refreshed = await service.getBriefing({ ...params, forceRefresh: true });
  assert.equal(calls, 2);
  assert.equal(refreshed.interpretation.summary, "Gemini briefing #2");
});

test("aiService.getBriefing rejects live mode with 501 when analytics adapter is missing", async () => {
  const service = createAiService({
    gemini: createGeminiClient({ apiKey: "" }),
  });

  await assert.rejects(
    () => service.getBriefing({ from: "2026-11-19", to: "2026-11-25", sourceMode: "live" }),
    (err) => err.code === "ANALYTICS_NOT_READY" && err.statusCode === 501
  );
});

test("aiService.askQuestion validates input, bounds history to 6 turns, and validates date range", async () => {
  let seenContents = null;
  const service = createAiService({
    gemini: {
      isConfigured: true,
      model: "gemini-2.5-flash",
      async generateText({ contents }) {
        seenContents = contents;
        return "Gross margin is 61.93%.";
      },
      async generateJson() {
        return {};
      },
    },
  });

  await assert.rejects(
    () => service.askQuestion({ question: "   ", sourceMode: "preview" }),
    (err) => err.code === "QUESTION_REQUIRED"
  );

  await assert.rejects(
    () => service.askQuestion({ question: "a".repeat(501), sourceMode: "preview" }),
    (err) => err.code === "QUESTION_TOO_LONG"
  );

  await assert.rejects(
    () =>
      service.askQuestion({
        question: "How is margin?",
        from: "2026-11-25",
        to: "2026-11-19",
        sourceMode: "preview",
      }),
    (err) => err.code === "INVALID_DATE_RANGE"
  );

  const longHistory = Array.from({ length: 10 }, (_, idx) => ({
    role: idx % 2 === 0 ? "user" : "assistant",
    content: `Turn ${idx}`,
  }));

  const answer = await service.askQuestion({
    question: "Why did gross margin improve?",
    history: longHistory,
    from: "2026-11-19",
    to: "2026-11-25",
    sourceMode: "preview",
  });

  assert.equal(answer.meta.source, "gemini");
  assert.equal(answer.answer, "Gross margin is 61.93%.");
  // 6 sanitized history turns + 1 current user question = 7
  assert.equal(seenContents.length, 7);
});

test("planning interpretation accepts only verified action keys and falls back from unsafe claims", async () => {
  const facts = {
    forecast: { expectedGrossProfit: 12000, expectedGrossMarginPct: 60 },
    alerts: [{ recommendationKey: "restock-chicken", severity: "critical", message: "Buy 12 kg chicken." }],
    setupWarnings: [],
  };
  const safeService = createAiService({
    gemini: { isConfigured: true, model: "test", generateJson: async () => ({ summary: "Stock coverage needs attention before the next service.", prioritizedRecommendationKeys: ["restock-chicken"] }) },
  });
  const safe = await safeService.interpretPlanning(facts);
  assert.equal(safe.meta.source, "gemini");
  assert.deepEqual(safe.interpretation.prioritizedActions, [{ recommendationKey: "restock-chicken", severity: "critical", text: "Buy 12 kg chicken." }]);

  const unsafeService = createAiService({
    gemini: { isConfigured: true, model: "test", generateJson: async () => ({ summary: "I automatically ordered chicken and forecast net profit of 9000.", prioritizedRecommendationKeys: ["invented"] }) },
  });
  const unsafe = await unsafeService.interpretPlanning(facts);
  assert.equal(unsafe.meta.source, "fallback");
  assert.equal(unsafe.meta.fallbackReason, "GEMINI_UNSAFE_OR_INVALID_PLANNING_OUTPUT");
  assert.deepEqual(unsafe.interpretation, buildFallbackPlanningInterpretation(facts));
});
