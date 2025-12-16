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

// Middleware xác thực cho tất cả các routes bên dưới
router.use(verifyToken);

router.post(
  "/request",
  validate(sendFriendRequestSchema, "body"),
  sendFriendRequest
);

// PUT: Chấp nhận lời mời
// Body: { "friendshipId": "..." } -> Check req.body
router.put(
  "/accept",
  validate(acceptFriendRequestSchema, "body"),
  acceptFriendRequest
);

// DELETE: Từ chối lời mời HOẶC Hủy kết bạn (Unfriend)
// Param: friendshipId -> LƯU Ý: Check req.params vì route là /:friendshipId
router.delete(
  "/:friendshipId",
  validate(removeFriendshipSchema, "params"),
  removeFriendship
);

// GET: Lấy danh sách lời mời ĐÃ NHẬN
router.get("/requests/received", getFriendRequests);

// GET: Lấy danh sách bạn bè đã accept
router.get("/list", getFriendList);

export default router;
