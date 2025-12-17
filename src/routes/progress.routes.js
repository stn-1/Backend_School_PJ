import express from "express";
import {
  getProgress,
  getStreakStats,
  increaseUserProgress,
  getUserProgress,
} from "../controllers/progress.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.use(verifyToken);
router.patch("/stats", increaseUserProgress);
router.get("/stats", getUserProgress);
router.get("/", getStreakStats);
router.get("/:userId", getProgress);

export default router;
