import express from "express";
import {
  startSession,
  heatmapData,
  updateSession,
  getHourlyStats,
  getDailySession,
  changeNote,
  getLeaderboard,
} from "../controllers/session.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import {
  startSessionSchema,
  updateSessionSchema,
  timeRangeQuerySchema,
  changeNoteSchema,
} from "../validators/session.validator.js";

const router = express.Router();

router.use(verifyToken);

router.post("/", validate(startSessionSchema, "body"), startSession);
router.get("/heatmap", validate(timeRangeQuerySchema, "query"), heatmapData);
router.get(
  "/leaderboard",
  validate(timeRangeQuerySchema, "query"),
  getLeaderboard
);
router.patch("/", validate(updateSessionSchema, "body"), updateSession);
router.patch(
  "/:session_id/note",
  validate(changeNoteSchema, "body"),
  changeNote
);
router.get("/hourly", validate(timeRangeQuerySchema, "query"), getHourlyStats);
router.get("/daily", validate(timeRangeQuerySchema, "query"), getDailySession);
export default router;
