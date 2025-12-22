import express from "express";
import {
  getProgress,
  getStreakStats,
  increaseUserProgress,
  getUserProgress,
  getUserProgressbyId,
  sendGift,
  getGifts,
  getGiftsbyId,
} from "../controllers/progress.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import redisRateLimit from "../middlewares/redisRateLimit.js";
const router = express.Router();

const pomodoroCompleteLimit = redisRateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 2, // Không ai hoàn thành > 2 phiên trong 5 phút được
  keyPrefix: "rl:pomodoro-complete",
});

// 2. Giới hạn gửi quà
// Sau khi xong 1 phiên mới được tặng quà, nên giới hạn này cũng cần chặt.
const giftLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3, // Chỉ cho tặng 3 món quà/phút để tránh spam notification cho bạn bè
  keyPrefix: "rl:gift",
});
const viewLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000,
  max: 40,
  keyPrefix: "rl:view",
});
router.use(verifyToken);
router.get("/gift", getGifts);
router.get("/gift/:userId", getGiftsbyId);
router.post("/gift", giftLimit, sendGift);
router.get("/stats", viewLimit, getUserProgress);
router.patch("/stats", pomodoroCompleteLimit, increaseUserProgress);
router.get("/stats/:userId", viewLimit, getUserProgressbyId);
router.get("/", getStreakStats);
router.get("/:userId", getProgress);

export default router;
