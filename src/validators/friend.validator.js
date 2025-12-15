import Joi from "joi";
import { objectId, cleanText } from "./custom.js";

export const sendFriendRequestSchema = Joi.object({
  recipientId: objectId.required(),
});

export const acceptFriendRequestSchema = Joi.object({
  friendshipId: objectId.required(),
});
export const removeFriendshipSchema = Joi.object({
  friendshipId: objectId.required(),
});
