import express from "express";

// 1. IMPORT CONTROLLERS
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

// 2. IMPORT MIDDLEWARES
import { verifyToken } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";

// 3. IMPORT SCHEMAS
import {
  roomIdParamSchema,
  roomSlugParamSchema,
  updateRoomSchema,
  kickMemberSchema,
  changeBackgroundSchema,
} from "../validators/room.validator.js"; // Nhớ đổi tên file validation cho đúng

const router = express.Router();

// Middleware xác thực (Bắt buộc đăng nhập cho mọi thao tác)
router.use(verifyToken);

/* =========================================
   PUBLIC / LIST ROOMS
========================================= */

// 1. Lấy danh sách phòng công khai
// GET /api/rooms/public
router.get("/public", getPublicRooms);

/* =========================================
   FIND ROOM (SLUG & ID)
========================================= */

// 2. Lấy phòng theo Slug
// GET /api/rooms/slug/:slug
// Validate params: slug
router.get(
  "/slug/:slug",
  validate(roomSlugParamSchema, "params"),
  getRoomBySlug
);

// 3. Lấy phòng theo ID
// GET /api/rooms/:id
// Validate params: id (ObjectId)
router.get("/id/:id", validate(roomIdParamSchema, "params"), getRoomByid);

/* =========================================
   MEMBER ACTIONS (JOIN / LEAVE)
========================================= */

// 4. Tham gia phòng
// POST /api/rooms/:id/join
router.post("/:id/join", validate(roomIdParamSchema, "params"), joinRoom);

// 5. Rời phòng
// POST /api/rooms/:id/leave
router.post("/:id/leave", validate(roomIdParamSchema, "params"), leaveRoom);

// 6. Lấy danh sách thành viên trong phòng
// GET /api/rooms/:id/members
router.get(
  "/:id/members",
  validate(roomIdParamSchema, "params"),
  getRoomMembers
);

/* =========================================
   ADMIN / SETTINGS ACTIONS
========================================= */

// 7. Cập nhật thông tin phòng (Tên, mô tả, public...)
// PUT /api/rooms/:id
// Validate params: id | Validate body: name, description...
router.patch(
  "/:id",
  validate(roomIdParamSchema, "params"),
  validate(updateRoomSchema, "body"),
  updateRoom
);

// 8. Đổi hình nền (Background)
// PATCH /api/rooms/:id/background
// Validate params: id | Validate body: name, type
router.patch(
  "/:id/background",
  validate(roomIdParamSchema, "params"),
  validate(changeBackgroundSchema, "body"),
  changeBackground
);

// 9. Kick thành viên
// POST /api/rooms/:id/kick
// Validate params: id | Validate body: user_id (người bị kick)
router.post(
  "/:id/kick",
  validate(roomIdParamSchema, "params"),
  validate(kickMemberSchema, "body"),
  kickMember
);

export default router;
