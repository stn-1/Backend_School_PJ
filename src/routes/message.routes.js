import express from "express";
import { getRoomMessages } from "../controllers/message.controller.js";

const router = express.Router();
import { validate } from "../middlewares/validate.js";
import { getRoomMessagesSchema } from "../validators/message.validator.js";
import redisRateLimit from "../middlewares/redisRateLimit.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
const readMessageLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000,
  max: 40,
  keyPrefix: "rl:msg-read",
});

router.get(
  "/:roomId/messages",
  verifyToken,
  readMessageLimit,
  validate(getRoomMessagesSchema.params, "params"),
  validate(getRoomMessagesSchema.query, "query"),
  getRoomMessages
);

export default router;
