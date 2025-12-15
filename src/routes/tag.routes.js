import express from "express";
import {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getTagById, // <--- Import thêm hàm này
} from "../controllers/tag.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// GET /api/tags - Lấy tất cả
router.get("/", getTags);

// GET /api/tags/:tagId - Lấy 1 tag cụ thể (Thêm dòng này)
router.get("/:tagId", getTagById);

// POST /api/tags - Tạo mới
router.post("/", createTag);

// PUT /api/tags/:tagId - Sửa
router.put("/:tagId", updateTag);

// DELETE /api/tags/:tagId - Xóa
router.delete("/:tagId", deleteTag);

export default router;
