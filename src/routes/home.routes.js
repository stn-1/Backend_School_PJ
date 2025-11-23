import { Router } from "express";
import { home } from "../controllers/home.controller.js"; // Dùng destructuring vì export const

const router = Router();
router.get("/", home);

export default router;
