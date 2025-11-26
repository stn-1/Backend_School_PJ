import express from "express";
import { 
  sendFriendRequest, 
  acceptFriendRequest, 
  removeFriendship, 
  getFriendRequests, 
  getFriendList 
} from "../controllers/friend.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js"; // Ví dụ middleware

const router = express.Router();

// Middleware xác thực cho tất cả các routes bên dưới
router.use(verifyToken);

// POST: Gửi lời mời
// Body: { "recipientId": "..." }
router.post("/request", sendFriendRequest);

// PUT: Chấp nhận lời mời
// Body: { "friendshipId": "..." }
router.put("/accept", acceptFriendRequest);

// DELETE: Từ chối lời mời HOẶC Hủy kết bạn (Unfriend)
// Param: friendshipId
router.delete("/:friendshipId", removeFriendship);

// GET: Lấy danh sách lời mời ĐÃ NHẬN (để hiển thị thông báo)
router.get("/requests/received", getFriendRequests);

// GET: Lấy danh sách bạn bè đã accept
router.get("/list", getFriendList);

export default router;