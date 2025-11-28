import express from "express";
import { getProgress } from "../controllers/progress.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
const router= express.Router();

router.use(verifyToken)
router.get("/getProgress",getProgress);

export default router;