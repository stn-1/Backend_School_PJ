import express from "express";
import { getRoomMessages } from "../controllers/message.controller.js";

const router = express.Router();
import { validate } from "../middlewares/validate.js";
import { getRoomMessagesSchema } from "../validators/message.validator.js";
// GET /rooms/:roomId/messages?before=timestamp&limit=30
router.get(
  "/:roomId/messages",
  validate(getRoomMessagesSchema.params, "params"), // Bước 1: Check roomId
  validate(getRoomMessagesSchema.query, "query"),
  getRoomMessages
);

export default router;
