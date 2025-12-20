import express from "express";
import {
  getProgress,
  getStreakStats,
  increaseUserProgress,
  getUserProgress,
  getUserProgressbyId,
} from "../controllers/progress.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.use(verifyToken);
router.patch("/stats", increaseUserProgress);
router.get("/stats", getUserProgress);
router.get("/stats/:userId", getUserProgressbyId);
router.get("/", getStreakStats);
router.get("/:userId", getProgress);

export default router;
