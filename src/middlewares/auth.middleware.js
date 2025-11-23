// middlewares/auth.middleware.js
import jwt from "jsonwebtoken";

// Lấy Secret Key từ biến môi trường (Phải KHỚP với bên Controller)
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret_123";

export const verifyToken = (req, res, next) => {
  // 1. Lấy token từ header Authorization
  // Định dạng chuẩn: "Bearer <token_abcxyz>"
  const authHeader = req.headers["authorization"];
  
  // Tách lấy phần token phía sau chữ "Bearer "
  const token = authHeader && authHeader.split(" ")[1];

  // 2. Nếu không có token -> Báo lỗi 401 (Unauthorized)
  if (!token) {
    return res.status(401).json({ message: "Access token not found" });
  }

  // 3. Verify token
  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, decodedUser) => {
    if (err) {
      // Token hết hạn hoặc sai chữ ký
      // Client nhận lỗi 403 này sẽ biết là cần gọi API /refresh
      console.error("[AUTH MIDDLEWARE] Token invalid/expired:", err.message);
      return res.status(403).json({ message: "Token is invalid or expired" });
    }

    // 4. Nếu ngon lành -> Gắn thông tin user vào req để controller phía sau dùng
    req.user = decodedUser; 
    // decodedUser chính là object { id, username } ta đã sign lúc login
    
    next();
  });
};