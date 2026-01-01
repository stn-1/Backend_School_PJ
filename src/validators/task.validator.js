import Joi from "joi";
import { objectId, cleanText } from "./custom.js";

// 1. Validation khi tạo Task mới (POST)
export const createTaskSchema = Joi.object({
  title: Joi.string().max(200).custom(cleanText).required().messages({
    "string.empty": "Tiêu đề không được để trống",
    "any.required": "Tiêu đề là bắt buộc",
  }),
  note: Joi.string().max(1000).custom(cleanText).allow("").optional(),
  is_complete: Joi.boolean().default(false),
});

// 2. Validation khi cập nhật Task (PATCH)
// Sử dụng .min(1) để đảm bảo có ít nhất một trường được gửi lên
export const updateTaskSchema = Joi.object({
  title: Joi.string().max(2000).custom(cleanText),
  note: Joi.string().max(1000).custom(cleanText).allow(""),
  is_complete: Joi.boolean(),
}).min(1);

// 3. Validation cho Query Parameters khi lấy danh sách Task (GET)
export const taskQuerySchema = Joi.object({
  // Vì query param từ URL luôn là string nên ta validate string hợp lệ
  is_complete: Joi.string().valid("true", "false").optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

// 4. Validation cho ID trên Params (/:id)
export const taskIdSchema = Joi.object({
  id: objectId.required(),
});
