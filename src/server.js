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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//thiết lập socket
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://rizumu-sage.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});
chatSocket(io);

//hemet giúp chống Clickjacking và MIME Sniffing
app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://rizumu-sage.vercel.app"],
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
