import Joi from "joi";
import { objectId, cleanText } from "./custom.js";

/* =====================
   START SESSION
===================== */
export const startSessionSchema = Joi.object({
  plannedDuration: Joi.number()
    .min(0)
    .max(24 * 3600),
  started_at: Joi.date(),
  timer_type: Joi.string(),
  session_type: Joi.string(),
});

/* =====================
   UPDATE SESSION
===================== */
export const updateSessionSchema = Joi.object({
  duration: Joi.number().min(0),
  completed: Joi.boolean(),
  ended_at: Joi.date(),
}).min(1);

/* =====================
   HEATMAP / STATS QUERY
===================== */
export const timeRangeQuerySchema = Joi.object({
  startTime: Joi.date().required(),
  endTime: Joi.date().greater(Joi.ref("startTime")).required(),
  userId: objectId.optional(),
  user_id: objectId.optional(), // CHỈ dùng nếu admin
});

/* =====================
   CHANGE NOTE
===================== */
export const changeNoteSchema = Joi.object({
  notes: Joi.string().max(500).custom(cleanText).required(),
});
