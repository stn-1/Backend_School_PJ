import express from "express";
import { getRoomMessages } from "../controllers/message.controller.js";

const router = express.Router();
import { validate } from "../middlewares/validate.js";
import { getRoomMessagesSchema } from "../validators/message.validator.js";
router.get(
  "/:roomId/messages",
  validate(getRoomMessagesSchema.params, "params"),
  validate(getRoomMessagesSchema.query, "query"),
  getRoomMessages
);

export default router;
