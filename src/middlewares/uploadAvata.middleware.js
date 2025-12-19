import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
//import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import cloudinary from "../config/cloudinary.js";
dotenv.config();
//phần setting bên cloudy để lấy ảnh hoặc file ảnh
//lưu về dưới dạng link để trả về cho user
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "avatars",
    allowed_formats: ["jpeg", "png", "jpg", "webp"],
    transformation: [{ width: 300, height: 300, crop: "fill" }],
  },
});

const uploadAvatar = multer({ storage });

export default uploadAvatar;
