import { Router } from "express";
import { hello,goodbye } from "../controllers/home.controller.js";

const router = Router();

// Quan trọng: Tại đây để là "/" 
// Vì bên server.js ta sẽ ghép nó vào prefix "/home"
// => Kết quả cuối cùng là: /home + / = /home
router.get("/hello", hello);
router.get("/goodbye",goodbye);

export default router;