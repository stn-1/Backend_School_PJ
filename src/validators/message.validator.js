import Joi from "joi";
import { objectId } from "./custom.js"; // Import hàm check objectId của bạn

export const getRoomMessagesSchema = {
  // 1. Validate phần URL Param (:roomId)
  params: Joi.object({
    roomId: objectId.required(),
  }),

  // 2. Validate phần Query String (?limit=...&before=...)
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).optional(), // Giới hạn max 100 tin để tránh lag server
    before: Joi.date().iso().optional(), // Kiểm tra định dạng ngày (ISO string)
  }),
};
