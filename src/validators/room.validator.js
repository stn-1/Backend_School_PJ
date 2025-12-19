import Joi from "joi";
import { objectId, cleanText } from "./custom.js";

export const roomIdParamSchema = Joi.object({
  id: objectId.required(),
});

export const roomSlugParamSchema = Joi.object({
  slug: Joi.string().min(3).max(50).required(),
});

export const kickMemberSchema = Joi.object({
  user_id: objectId.required(),
});

export const updateRoomSchema = Joi.object({
  name: Joi.string().max(100).custom(cleanText),
  description: Joi.string().max(500).allow("").custom(cleanText),
  is_public: Joi.boolean(),
}).min(1);

export const changeBackgroundSchema = Joi.object({
  name: Joi.string().max(100).custom(cleanText),
  type: Joi.string().valid("static", "animated"),
}).min(1);
