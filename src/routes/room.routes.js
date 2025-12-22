import express from "express";

import {
  getPublicRooms,
  getRoomBySlug,
  getRoomByid,
  joinRoom,
  leaveRoom,
  updateRoom,
  getRoomMembers,
  kickMember,
  changeBackground,
} from "../controllers/room.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js";
import { verifyRoomMembership } from "../middlewares/roomAuth.js";
import { validate } from "../middlewares/validate.js";
import redisRateLimit from "../middlewares/redisRateLimit.js";
import {
  roomIdParamSchema,
  roomSlugParamSchema,
  updateRoomSchema,
  kickMemberSchema,
  changeBackgroundSchema,
} from "../validators/room.validator.js";

const router = express.Router();

router.use(verifyToken);

const joinLeaveLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 10, // Chỉ cho phép đổi phòng/vào ra 10 lần/phút
  keyPrefix: "rl:room-join",
});

// 2. Giới hạn các thao tác Quản lý (Update, Kick, Background)
// Những hành động này làm thay đổi trạng thái phòng và ảnh hưởng đến mọi người đang tập trung.
const roomAdminLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5, // Chỉ cho phép chỉnh sửa 5 lần/phút
  keyPrefix: "rl:room-admin",
});

// 3. Giới hạn xem danh sách phòng/thành viên (Đọc dữ liệu)
const roomReadLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  keyPrefix: "rl:room-read",
});

router.get("/public", roomReadLimit, getPublicRooms);

router.get(
  "/slug/:slug",
  validate(roomSlugParamSchema, "params"),
  roomReadLimit,
  getRoomBySlug
);

router.get(
  "/id/:id",
  roomReadLimit,
  validate(roomIdParamSchema, "params"),
  getRoomByid
);

router.post(
  "/:id/join",
  joinLeaveLimit,
  validate(roomIdParamSchema, "params"),
  joinRoom
);

router.post(
  "/:id/leave",
  joinLeaveLimit,
  validate(roomIdParamSchema, "params"),
  leaveRoom
);

router.get(
  "/:id/members",
  roomReadLimit,
  validate(roomIdParamSchema, "params"),
  verifyRoomMembership,
  getRoomMembers
);

router.patch(
  "/:id",
  roomAdminLimit,
  validate(roomIdParamSchema, "params"),
  validate(updateRoomSchema, "body"),
  updateRoom
);

router.patch(
  "/:id/background",
  roomAdminLimit,
  validate(roomIdParamSchema, "params"),
  validate(changeBackgroundSchema, "body"),
  changeBackground
);

router.post(
  "/:id/kick",
  roomAdminLimit,
  validate(roomIdParamSchema, "params"),
  validate(kickMemberSchema, "body"),
  kickMember
);

export default router;
