import express from "express";
import {
  // createRoom, // (Bỏ comment nếu bạn muốn cho user tạo thêm phòng mới ngoài phòng mặc định)
  getRoomBySlug,
  joinRoom,
  leaveRoom,
  updateRoom,
  getRoomMembers,
  kickMember
} from "../controllers/room.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

/* =========================================
   MIDDLEWARE
========================================= */
// Áp dụng verifyToken cho TOÀN BỘ các routes bên dưới
// (Bảo vệ tất cả các endpoint của Room)
router.use(verifyToken); 

/* =========================================
   ROUTES
========================================= */

// --- 1. Tạo phòng (Optional) ---
// Nếu bạn muốn user tạo thêm phòng khác ngoài phòng mặc định
// router.post("/", createRoom);


// --- 2. Thông tin phòng ---

// Lấy thông tin phòng bằng Slug (hoặc room_code)
// GET /api/rooms/my-cool-room
router.get("/:slug", getRoomBySlug);

// Lấy danh sách thành viên trong phòng
// GET /api/rooms/64b1f.../members
router.get("/:id/members", getRoomMembers);


// --- 3. Hành động User (Join/Leave) ---

// Tham gia phòng
// POST /api/rooms/64b1f.../join
router.post("/:id/join", joinRoom);

// Rời phòng (Tự động về phòng mặc định)
// POST /api/rooms/64b1f.../leave
router.post("/:id/leave", leaveRoom);


// --- 4. Hành động Admin (Update/Kick) ---

// Cập nhật thông tin phòng (Tên, mô tả, background...)
// PATCH /api/rooms/64b1f...
router.patch("/:id", updateRoom);

// Mời thành viên ra khỏi phòng (Kick)
// POST /api/rooms/64b1f.../kick
// Body: { "user_id": "..." }
router.post("/:id/kick", kickMember);


export default router;