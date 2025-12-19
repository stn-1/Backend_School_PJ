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
const router = express.Router();

router.post("/register", validate(registerSchema), register);

router.post("/login", validate(loginSchema), login);

router.post("/refresh", validate(refreshTokenSchema), requestRefreshToken);

router.get("/profile", verifyToken, getProfile);

router.post("/logout", verifyToken, logout);

router.post(
  "/avatar",
  verifyToken,
  uploadAvatar.single("avatar"),
  updateAvatar
);
router.patch(
  "/profile",
  verifyToken,
  validate(updateProfileSchema),
  updateProfile
);
router.get(
  "/profile/:id",
  verifyToken,
  validate(getProfileByIdSchema, "params"),
  getProfilebyID
);
router.get(
  "/search",
  verifyToken,
  validate(searchUserSchema, "query"),
  searchUsers
);
export default router;
