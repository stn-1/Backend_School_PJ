import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import router from "./routes/index.js";
import connectDB from './config/db.js'; 
import authRoutes from "./routes/auth.routes.js";
dotenv.config();
const app = express();

// Middlewares
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Routes
app.use("/", router); // Chỉ mount router tổng hợp
app.use("/api/auth", authRoutes);
// Start server
const PORT = process.env.PORT || 3000;
// kết nối database
connectDB().then(()=>{
    app.listen(PORT,()=>{
        console.log(`server bắt đầu trên cổng ${PORT}`);
    })
})


