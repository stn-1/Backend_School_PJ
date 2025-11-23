import { Router } from "express";
// 1. Thêm requestRefreshToken vào dòng import
import { 
  register, 
  login, 
  getProfile, 
  logout, 
  requestRefreshToken // <-- Bổ sung cái này
} from "../controllers/auth.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

// --- Public Routes ---
router.post("/register", register);
router.post("/login", login);

// 2. Thêm Route xử lý Refresh Token
// Frontend sẽ gọi vào đây khi Access Token hết hạn
router.post("/refresh", requestRefreshToken); 

// --- Protected Routes ---
router.get("/profile", verifyToken, getProfile);
router.post("/logout", verifyToken, logout);

export default router;