import Joi from "joi";
import { objectId } from "./custom.js";

export const getProgressSchema = Joi.object({
  userId: objectId.required(),
});

export const getGiftsSchema = Joi.object({
  userId: objectId.required(),
});
