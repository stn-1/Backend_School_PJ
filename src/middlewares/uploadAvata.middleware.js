import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
//import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import cloudinary from "../config/cloudinary.js";
dotenv.config();

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "avatars",
    allowed_formats: ["jpeg", "png", "jpg", "webp"],
    transformation: [{ width: 300, height: 300, crop: "fill" }] // Tối ưu avatar
  }
});

const uploadAvatar = multer({ storage });

export default uploadAvatar;
