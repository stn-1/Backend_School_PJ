// routes/index.js (Router Tổng)
import { Router } from "express";

// 1. Import các Route con
import authRoutes from "./auth.routes.js";
import homeRoutes from "./home.routes.js"; 
import friendRoutes from "./friend.routes.js"
// import productRoutes from "./product.routes.js"; (Sau này thêm vào đây)

const router = Router();

// 2. Gom nhóm và đặt tên đường dẫn
// Tất cả request liên quan đến auth sẽ có tiền tố /auth
router.use("/auth", authRoutes); 

// Tất cả request liên quan đến home sẽ có tiền tố /home
router.use("/", homeRoutes);
//phần bạn bè
router.use("/friend",friendRoutes)
export default router;