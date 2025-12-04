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
import xss from "xss-clean";
import mongoSanitize from "express-mongo-sanitize";

import connectDB from './models/db.js'; 
import http from "http";
import { Server } from "socket.io";
import chatSocket from "./sockets/chat.socket.js";

import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

// ======= Paths =======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======= HTTP Server + Socket.io =======
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://rizumu-sage.vercel.app/pomodoro"], // domain frontend của bạn
    methods: ["GET", "POST"],
    credentials: true // cho phép gửi cookie
  }
});
chatSocket(io);

// ======= Middlewares =======
app.use(helmet()); // Thêm header bảo mật
app.use(cors({
  origin: "https://rizumu-sage.vercel.app/pomodoro", // domain FE
  credentials: true // bắt buộc nếu dùng cookie
}));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(xss());
app.use(mongoSanitize());

// Static files
app.use(express.static(path.join(__dirname, "./public")));
console.log("STATIC PATH:", path.join(__dirname, "./public"));

// ======= Routes =======
app.use("/api/home", homeRoute);
app.use("/api/auth", authRoutes);
app.use("/api/friend", friendRoutes);
app.use("/api/room", roomRoutes);
app.use("/api", messageRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/session", sessionRoutes);

// ======= Start server =======
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server bắt đầu trên cổng ${PORT}`);
    console.log(`Truy cập thử: http://localhost:${PORT}/home.html`);
  });
}).catch(err => {
  console.error("Kết nối database thất bại:", err);
});
