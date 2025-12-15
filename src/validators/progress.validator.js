import Joi from "joi";
import { objectId } from "./custom.js";

/* =======================
   GET PROGRESS
======================= */
export const getProgressSchema = Joi.object({
  userId: objectId.required(),
});

/* =======================
   GET GIFTS
======================= */
export const getGiftsSchema = Joi.object({
  userId: objectId.required(),
});
