import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import homeRoute from "./routes/home.routes.js";
import connectDB from './models/db.js'; 
import authRoutes from "./routes/auth.routes.js";
import friendRoutes from "./routes/friend.routes.js"
import roomRoutes from "./routes/room.routes.js";
import http from "http";
import { Server } from "socket.io";
import chatSocket from "./sockets/chat.socket.js";
import path from "path";
import { fileURLToPath } from "url";
import messageRoutes from "./routes/message.routes.js"
import progressRoutes from "./routes/progress.routes.js";
dotenv.config();
const app = express();
//phần thử chatsocket
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const server = http.createServer(app);
const io = new Server(server, {
   cors: {
    origin: ["https://backend-school-pj-1.onrender.com"], // 🔥 không dùng '*' khi deploy
    methods: ["GET", "POST"],
  }
});
// Middlewares
app.use(cors());
app.use(express.static(path.join(__dirname, "./public")));
console.log("STATIC PATH:", path.join(__dirname, "./public"));

// nhúng socket
chatSocket(io);

app.use(morgan("dev"));
app.use(express.json());
//test
app.use("/api/home", homeRoute);
// Routes
app.use("/api/auth", authRoutes);

app.use("/api/friend",friendRoutes);

app.use("/api/room",roomRoutes);

app.use("/api",messageRoutes);

app.use("/api/progress",progressRoutes);
// Start server
const PORT = process.env.PORT || 3000;
//kết nối database
// connectDB().then(()=>{
//     app.listen(PORT,()=>{
//         console.log(`server bắt đầu trên cổng ${PORT}`);
//     })
// })
connectDB().then(()=>{
    server.listen(PORT, () => {
        console.log(`Server bắt đầu trên cổng ${PORT}`);
        console.log(`Truy cập thử: http://localhost:${PORT}/home.html`);
    });
})


