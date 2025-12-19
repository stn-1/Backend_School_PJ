import { Router } from "express";
import { health } from "../controllers/home.controller.js";

const router = Router();

router.get("/", health);

export default router;
