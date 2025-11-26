import express from "express";
import {
  createRoom,
  getRoomBySlug,
  joinRoom,
  leaveRoom,
  deleteRoom,
  updateRoom,
  getRoomMembers,
  kickMember
} from "../controllers/room.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js"; // middleware xác thực JWT

const router = express.Router();

/* -------------------------------
   ROUTES CHÍNH
--------------------------------*/

// Tạo phòng (người dùng đã login)
router.post("/", verifyToken, createRoom);

// Lấy phòng theo slug (public)
router.get("/:slug", verifyToken, getRoomBySlug);

// Join phòng
router.post("/:id/join", verifyToken, joinRoom);

// Leave phòng
router.post("/:id/leave", verifyToken, leaveRoom);

// Xoá phòng (admin/owner)
router.delete("/:id", verifyToken, deleteRoom);

// Update phòng (admin/owner)
router.patch("/:id", verifyToken, updateRoom);

// Lấy danh sách thành viên
router.get("/:id/members", verifyToken, getRoomMembers);

// Kick member (admin/owner)
router.post("/:id/kick", verifyToken, kickMember);

export default router;
