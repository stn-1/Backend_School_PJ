// routes/auth.routes.js
import express from "express";
import {
  register,
  login,
  requestRefreshToken,
  getProfile,
  logout,
  updateProfile,
  getProfilebyID,
  searchUsers,
} from "../controllers/auth.controller.js";
import uploadAvatar from "../middlewares/uploadAvata.middleware.js";
import { updateAvatar } from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
//phần vadiate dữ liệu
import { validate } from "../middlewares/validate.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  getProfileByIdSchema,
  searchUserSchema,
} from "../validators/auth.validator.js";
import redisRateLimit from "../middlewares/redisRateLimit.js";
const router = express.Router();

// 1. Dành cho Đăng ký/Đăng nhập (Chống Brute-force)
const authStrictLimit = redisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10, // Chỉ cho phép 10 lần thử
  keyPrefix: "rl:auth-strict",
});

// 2. Dành cho các thao tác cập nhật (Chống spam upload/update)
const updateLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 5, // Chỉ cho phép 5 lần cập nhật/phút
  keyPrefix: "rl:auth-update",
});

// 3. Dành cho các thao tác đọc dữ liệu (Profile, Search)
const generalLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 30, // 30 requests/phút
  keyPrefix: "rl:auth-general",
});

router.post("/register", authStrictLimit, validate(registerSchema), register);
router.post("/login", authStrictLimit, validate(loginSchema), login);

// Refresh token
router.post(
  "/refresh",
  generalLimit,
  validate(refreshTokenSchema),
  requestRefreshToken
);

// Profile: Phải đặt SAU verifyToken để lấy được req.user.id
router.get("/profile", verifyToken, generalLimit, getProfile);

router.post("/logout", verifyToken, logout);

// Upload ảnh: Giới hạn chặt vì tốn băng thông server
router.post(
  "/avatar",
  verifyToken,
  updateLimit,
  uploadAvatar.single("avatar"),
  updateAvatar
);

router.patch(
  "/profile",
  verifyToken,
  updateLimit,
  validate(updateProfileSchema),
  updateProfile
);

router.get(
  "/profile/:id",
  verifyToken,
  generalLimit,
  validate(getProfileByIdSchema, "params"),
  getProfilebyID
);

router.get(
  "/search",
  verifyToken,
  generalLimit,
  validate(searchUserSchema, "query"),
  searchUsers
);
export default router;
