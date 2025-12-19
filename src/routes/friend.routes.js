import express from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  getFriendRequests,
  getFriendList,
} from "../controllers/friend.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js"; // Ví dụ middleware
import { validate } from "../middlewares/validate.js";
import {
  sendFriendRequestSchema,
  acceptFriendRequestSchema,
  removeFriendshipSchema,
} from "../validators/friend.validator.js";
const router = express.Router();

router.use(verifyToken);

router.post(
  "/request",
  validate(sendFriendRequestSchema, "body"),
  sendFriendRequest
);

router.put(
  "/accept",
  validate(acceptFriendRequestSchema, "body"),
  acceptFriendRequest
);

router.delete(
  "/:friendshipId",
  validate(removeFriendshipSchema, "params"),
  removeFriendship
);

router.get("/requests/received", getFriendRequests);

router.get("/list", getFriendList);

export default router;
