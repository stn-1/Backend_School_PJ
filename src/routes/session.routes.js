import express from "express";
import {
  startSession,
  heatmapData,
  updateSession,
  getHourlyStats,
  getDailySession,
  changeNote,
  changeTag,
  getLeaderboard,
  getLeaderboardFriends,
} from "../controllers/session.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import {
  startSessionSchema,
  updateSessionSchema,
  timeRangeQuerySchema,
  changeNoteSchema,
  changeTagSchema,
} from "../validators/session.validator.js";
import redisRateLimit from "../middlewares/redisRateLimit.js";
const router = express.Router();

router.use(verifyToken);

const sessionWriteLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 10, // Không ai start/update session quá 10 lần/phút được
  keyPrefix: "rl:session-write",
});

// 2. Giới hạn lấy dữ liệu thống kê (Heatmap, Hourly, Daily)
// Những hàm này thường dùng Aggregation (Group, Match) rất nặng cho DB
const statsReadLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20, // 20 lần/phút
  keyPrefix: "rl:session-stats",
});

// 3. Giới hạn Bảng xếp hạng (Cực nặng vì phải Sort toàn bộ User)
const leaderboardLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10, // Chỉ cho phép xem bảng xếp hạng 10 lần/phút
  keyPrefix: "rl:leaderboard",
});

router.post(
  "/",
  sessionWriteLimit,
  validate(startSessionSchema, "body"),
  startSession
);
router.get(
  "/heatmap",
  statsReadLimit,
  validate(timeRangeQuerySchema, "query"),
  heatmapData
);
router.get(
  "/leaderboard",
  leaderboardLimit,
  validate(timeRangeQuerySchema, "query"),
  getLeaderboard
);
router.get(
  "/leaderboard_friend",
  leaderboardLimit,
  validate(timeRangeQuerySchema, "query"),
  getLeaderboardFriends
);
router.patch(
  "/",
  sessionWriteLimit,
  validate(updateSessionSchema, "body"),
  updateSession
);
router.patch(
  "/:session_id/note",
  sessionWriteLimit,
  validate(changeNoteSchema, "body"),
  changeNote
);
router.patch(
  "/:session_id/tag",
  sessionWriteLimit,
  validate(changeTagSchema, "body"),
  changeTag
);
router.get(
  "/hourly",
  statsReadLimit,
  validate(timeRangeQuerySchema, "query"),
  getHourlyStats
);
router.get(
  "/daily",
  statsReadLimit,
  validate(timeRangeQuerySchema, "query"),
  getDailySession
);
export default router;
