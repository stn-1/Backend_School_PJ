import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import homeRoute from "./routes/home.routes.js";
import authRoutes from "./routes/auth.routes.js";
import friendRoutes from "./routes/friend.routes.js";
import roomRoutes from "./routes/room.routes.js";
import messageRoutes from "./routes/message.routes.js";
import progressRoutes from "./routes/progress.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import tagRoute from "./routes/tag.routes.js";
//import xss from "xss-clean";
//import mongoSanitize from "express-mongo-sanitize";

import connectDB from "./models/db.js";
import http from "http";
import { Server } from "socket.io";
import chatSocket from "./sockets/chat.socket.js";

import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

// Trust proxy để lấy IP thật của client sau reverse proxy
// Số 1 nghĩa là tin tưởng first proxy hop
// Nếu có nhiều proxies (VD: Cloudflare -> Nginx -> App), dùng số lớn hơn hoặc true
app.set("trust proxy", true);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//thiết lập socket
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "https://localhost:5173",
      "http://localhost:5173",
      "https://rizumu-sage.vercel.app",
      "https://192.168.1.3:5173",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Export io instance để dùng trong controllers
export { io };

chatSocket(io);

//hemet giúp chống Clickjacking và MIME Sniffing
app.use(
  helmet({
    // 1. Content Security Policy (CSP): Quan trọng nhất
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Cho phép script từ domain của bạn và các nguồn tin cậy
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://rizumu-sage.vercel.app",
        ],
        // Cho phép Socket.io kết nối (Rất quan trọng cho chatSocket)
        connectSrc: [
          "'self'",
          "https://rizumu-sage.vercel.app",
          "ws://localhost:3000", // Thay 3000 bằng cổng bạn dùng
          "wss://your-backend-domain.com", // Domain thật của backend khi deploy
          "http://localhost:5173",
          "https://192.168.1.3:5173",
        ],
        // Cho phép hiển thị ảnh từ base64 (data:) hoặc các link ảnh (nếu có)
        imgSrc: [
          "'self'",
          "data:",
          "https://res.cloudinary.com",
          "https://*.googleusercontent.com",
        ],
        // Cho phép font từ Google hoặc các nguồn khác
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        // Chống nhúng trang web vào iframe để tránh Clickjacking
        frameAncestors: ["'self'", "https://rizumu-sage.vercel.app"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [], // Tự động chuyển HTTP sang HTTPS
      },
    },
    // 2. Cross-Origin Resource Policy: Cho phép frontend load tài nguyên từ backend
    crossOriginResourcePolicy: { policy: "cross-origin" },

    // 3. X-Frame-Options: Chống Clickjacking (chỉ cho phép domain cùng nguồn)
    xFrameOptions: { action: "sameorigin" },

    // 4. HSTS: Ép trình duyệt dùng HTTPS (chỉ kích hoạt khi đã có SSL/HTTPS)
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },

    // 5. Ẩn thông tin công nghệ (X-Powered-By: Express)
    hidePoweredBy: true,

    // 6. Chống đánh cắp thông tin qua MIME sniffing
    xContentTypeOptions: true,
  })
);

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://rizumu-sage.vercel.app",
      "https://localhost:5173",
      "https://192.168.1.3:5173/",
    ],
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

//phần dể test phần chat
app.use(express.static(path.join(__dirname, "./public")));
console.log("STATIC PATH:", path.join(__dirname, "./public"));

app.use("/api/health", homeRoute);
app.use("/api/auth", authRoutes);
app.use("/api/friend", friendRoutes);
app.use("/api/room", roomRoutes);
app.use("/api", messageRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/tags", tagRoute);
//bắt đầu server
const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server bắt đầu trên cổng ${PORT}`);
      console.log(`Truy cập thử: http://localhost:${PORT}/home.html`);
    });
  })
  .catch((err) => {
    console.error("Kết nối database thất bại:", err);
  });
