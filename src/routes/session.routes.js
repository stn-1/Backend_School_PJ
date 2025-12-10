import express from "express";
import { startSession,heatmapData,updateSession,getHourlyStats,getDailySession } from "../controllers/session.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js";

const router=express.Router();

router.use(verifyToken);

router.post("/",startSession);
router.get("/heatmap",heatmapData);
router.patch("/",updateSession);
router.get("/hourly",getHourlyStats)
router.get("/daily",getDailySession)
export default router;