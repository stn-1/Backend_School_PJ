import Joi from "joi";
import { objectId } from "./custom.js";

export const getRoomMessagesSchema = {
  params: Joi.object({
    roomId: objectId.required(),
  }),

  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).optional(),
    before: Joi.date().iso().optional(),
  }),
};
