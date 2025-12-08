import { Router } from "express";
import { health} from "../controllers/home.controller.js";

const router = Router();

// Quan trọng: Tại đây để là "/" 
// Vì bên server.js ta sẽ ghép nó vào prefix "/home"
// => Kết quả cuối cùng là: /home + / = /home
router.get("/", health);

export default router;