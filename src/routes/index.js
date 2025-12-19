import { Router } from "express";

import authRoutes from "./auth.routes.js";
import homeRoutes from "./home.routes.js";
import friendRoutes from "./friend.routes.js";

const router = Router();

router.use("/auth", authRoutes);

router.use("/", homeRoutes);
router.use("/friend", friendRoutes);
export default router;
//phần này để quản lý nếu các route phức tạp nhưng tạm thời chưa được trọng dụng
