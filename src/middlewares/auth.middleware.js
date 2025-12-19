// middlewares/auth.middleware.js
import jwt from "jsonwebtoken";

// lấy secret key
const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || "access_secret_123";

export const verifyToken = (req, res, next) => {
  //mỗi request cần có header trên
  const authHeader = req.headers["authorization"];

  // Tách lấy phần token phía sau chữ "Bearer "
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "Access token not found" });
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, decodedUser) => {
    if (err) {
      //báo lỗi
      console.error("[AUTH MIDDLEWARE] Token invalid/expired:", err.message);
      return res.status(401).json({ message: "Token is invalid or expired" });
    }

    req.user = decodedUser;
    //phần này sẽ trả về user_id

    next();
  });
};
