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
import redisRateLimit from "../middlewares/redisRateLimit.js";
const router = express.Router();

router.use(verifyToken);
const sendRequestLimit = redisRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: "rl:friend-send",
});

// 2. Giới hạn các thao tác khác (Chấp nhận, Xóa)
// Ví dụ: 20 thao tác mỗi phút
const actionLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  keyPrefix: "rl:friend-action",
});

// 3. Giới hạn việc lấy danh sách (Chống spam API lấy dữ liệu)
const listLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60, // 60 lần mỗi phút là quá đủ cho người dùng bình thường
  keyPrefix: "rl:friend-list",
});
// Gửi lời mời (Dùng sendRequestLimit)
router.post(
  "/request",
  sendRequestLimit,
  validate(sendFriendRequestSchema, "body"),
  sendFriendRequest
);

// Chấp nhận (Dùng actionLimit)
router.put(
  "/accept",
  actionLimit,
  validate(acceptFriendRequestSchema, "body"),
  acceptFriendRequest
);

// Xóa bạn (Dùng actionLimit)
router.delete(
  "/:friendshipId",
  actionLimit,
  validate(removeFriendshipSchema, "params"),
  removeFriendship
);

// Lấy danh sách (Dùng listLimit)
router.get("/requests/received", listLimit, getFriendRequests);
router.get("/list", listLimit, getFriendList);

export default router;
