import Joi from "joi";
import { objectId, cleanText } from "./custom.js";

/* =======================
   REGISTER
======================= */
export const registerSchema = Joi.object({
  username: Joi.string().email().max(100).required(),

  password: Joi.string().min(6).max(128).required(),

  name: Joi.string().max(50).allow("").custom(cleanText),
});

/* =======================
   LOGIN
======================= */
export const loginSchema = Joi.object({
  username: Joi.string().email().required(),

  password: Joi.string().required(),
});

/* =======================
   REFRESH TOKEN
======================= */
export const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

/* =======================
   UPDATE PROFILE
======================= */
export const updateProfileSchema = Joi.object({
  username: Joi.string().email().max(100),

  name: Joi.string().max(50).allow("").custom(cleanText),

  bio: Joi.string().max(500).allow("").custom(cleanText),

  country: Joi.string().max(50).allow("").custom(cleanText),

  password: Joi.string().min(6).max(128),
});

/* =======================
   GET PROFILE BY ID
======================= */
export const getProfileByIdSchema = Joi.object({
  id: objectId.required(),
});

/* =======================
   SEARCH USER
======================= */
export const searchUserSchema = Joi.object({
  q: Joi.string().min(1).max(50).custom(cleanText).required(),
});
