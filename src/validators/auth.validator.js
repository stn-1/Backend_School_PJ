import Joi from "joi";
import { objectId, cleanText } from "./custom.js";

export const registerSchema = Joi.object({
  username: Joi.string().email().max(100).required(),

  password: Joi.string().min(6).max(128).required(),

  name: Joi.string().max(50).allow("").custom(cleanText),
});

export const loginSchema = Joi.object({
  username: Joi.string().email().required(),

  password: Joi.string().required(),
});

export const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

export const updateProfileSchema = Joi.object({
  username: Joi.string().email().max(100),

  name: Joi.string().max(50).allow("").custom(cleanText),

  bio: Joi.string().max(500).allow("").custom(cleanText),

  country: Joi.string().max(50).allow("").custom(cleanText),

  password: Joi.string().min(6).max(128),
});

export const getProfileByIdSchema = Joi.object({
  id: objectId.required(),
});

export const searchUserSchema = Joi.object({
  q: Joi.string().min(1).max(50).custom(cleanText).required(),
});
