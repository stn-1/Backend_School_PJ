import express from "express";
import { getRoomMessages } from "../controllers/message.controller.js";

const router = express.Router();

// GET /rooms/:roomId/messages?before=timestamp&limit=30
router.get("/:roomId/messages", getRoomMessages);

export default router;