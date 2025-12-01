// routes/auth.routes.js
import express from "express";
import { 
  register, 
  login, 
  requestRefreshToken, 
  getProfile, 
  logout,
  updateProfile
} from "../controllers/auth.controller.js"; // Nhớ thêm .js nếu dùng ES Modules
import uploadAvatar from "../middlewares/uploadAvata.middleware.js";
import {updateAvatar} from "../controllers/auth.controller.js";
import { verifyToken} from "../middlewares/auth.middleware.js";


const router = express.Router();

// --- PUBLIC ROUTES (Không cần đăng nhập) ---

// Đăng ký: POST /api/auth/register
router.post("/register", register);

// Đăng nhập: POST /api/auth/login
router.post("/login", login);

// Xin cấp lại Access Token mới: POST /api/auth/refresh
// (Lưu ý: Route này KHÔNG dùng verifyToken, vì Access Token đã hết hạn rồi mới gọi vào đây)
router.post("/refresh", requestRefreshToken);


// --- PROTECTED ROUTES (Phải có Access Token hợp lệ) ---

// Lấy thông tin cá nhân: GET /api/auth/profile
router.get("/profile", verifyToken, getProfile);

// Đăng xuất: POST /api/auth/logout
router.post("/logout", verifyToken, logout);

// phần thay đổi avata
router.post("/avatar", verifyToken , uploadAvatar.single("avatar"), updateAvatar);
router.patch("/updataProfile",verifyToken,updateProfile);
export default router;