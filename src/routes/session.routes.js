import express from "express";
import { startSession,heatmapData,updateSession } from "../controllers/session.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js";

const router=express.Router();

router.use(verifyToken);

router.post("/startSession",startSession);
router.get("/heatmap",heatmapData);
router.patch("/update",updateSession);
export default router;