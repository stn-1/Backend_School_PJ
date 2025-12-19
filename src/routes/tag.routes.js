import express from "express";
import {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getTagById,
} from "../controllers/tag.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", getTags);

router.get("/:tagId", getTagById);

router.post("/", createTag);

router.put("/:tagId", updateTag);

router.delete("/:tagId", deleteTag);

export default router;
