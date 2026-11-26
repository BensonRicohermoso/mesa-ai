import { aiService } from "./ai.service.js";

export async function getAiStatus(_req, res, next) {
  try {
    res.json(aiService.getStatus());
  } catch (error) {
    next(error);
  }
}

export async function postAiBriefing(req, res, next) {
  try {
    const result = await aiService.getBriefing(req.body || {});
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function postAiForecast(req, res, next) {
  try {
    const result = await aiService.getForecast(req.body || {});
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function postAiQna(req, res, next) {
  try {
    const result = await aiService.askQuestion(req.body || {});
    res.json(result);
  } catch (error) {
    next(error);
  }
}
