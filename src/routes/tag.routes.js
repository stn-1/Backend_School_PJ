import express from "express";
import {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getTagById,
} from "../controllers/tag.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import redisRateLimit from "../middlewares/redisRateLimit.js";
const router = express.Router();

const tagWriteLimit = redisRateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 15, // Chỉ cho phép tạo/sửa/xóa 15 tag trong 5 phút
  keyPrefix: "rl:tag-write",
});

// 2. Giới hạn xem danh sách Tag
const tagReadLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60, // 60 lần/phút
  keyPrefix: "rl:tag-read",
});

router.use(verifyToken);

router.get("/", tagReadLimit, getTags);

router.get("/:tagId", tagReadLimit, getTagById);

router.post("/", tagWriteLimit, createTag);

router.put("/:tagId", tagWriteLimit, updateTag);

router.delete("/:tagId", tagWriteLimit, deleteTag);

export default router;
