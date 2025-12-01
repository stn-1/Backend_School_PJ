// controllers/auth.controller.js
import User from "../models/user.js";
import jwt from "jsonwebtoken";
import Progress from "../models/progress.js";
import { v2 as cloudinary } from "cloudinary";
import Room from "../models/room.js";
// --- CONFIG ---
// Nên để trong file .env thực tế
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret_123";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh_secret_456";
const ACCESS_TOKEN_EXPIRES = "15m";
const REFRESH_TOKEN_EXPIRES = "7d";
// -------------------- HELPERS --------------------
// Tạo Access Token (để gọi API)
function signAccessToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
}

// Tạo Refresh Token (để cấp lại Access Token)
function signRefreshToken(user) {
  return jwt.sign(
    { id: user._id },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES }
  );
}

// -------------------- REGISTER --------------------
export const register = async (req, res) => {
  try {
    const { username, password, name } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: "Missing username or password" });

    const existed = await User.findOne({ username });
    if (existed)
      return res.status(400).json({ message: "Username already taken" });

    const user = new User({
      username,
      name: name || "",
    });

    // Virtual field xử lý hash pass
    user.password = password;
    
    // Tạo 2 token
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Lưu Refresh Token vào DB
    user.refreshToken = refreshToken;
    user.status = "online"; // Đăng ký xong online luôn

    await user.save();
     // 👉 Tạo Progress mặc định
    await Progress.create({
      user: user._id,
      coins: 0,
      level: 1,
      current_xp: 0,
      remaining_xp: 100, // ví dụ để lên level tiếp theo
      total_duration: 0,
      last_rewarded_duration: 0,
      gifts: []
    });
    //phần tạo phòng mặc định
    const newRoom = new Room({
      name: `${user.name || user.username}'s Room`,
      description: "Your personal space!",
      owner_id: user._id,
      room_members: [
        {
          user_id: user._id,
          role: "admin"
        }
      ]
    });
    user.default_room_id = newRoom._id;
    user.current_room_id = newRoom._id;

    await newRoom.save();
    await user.save(); 
    return res.status(201).json({
      message: "Register success",
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
      },
      access_token: accessToken,
      refresh_token: refreshToken, // Client cần lưu cái này an toàn
    });
  } catch (err) {
    console.error("[REGISTER ERROR]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// -------------------- LOGIN --------------------
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: "Missing username or password" });

    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ message: "User not found" });

    const ok = await user.comparePassword(password);
    if (!ok)
      return res.status(400).json({ message: "Incorrect password" });

    // Tạo mới cặp token
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Cập nhật DB: status và token mới
    user.status = "online";
    user.refreshToken = refreshToken; // Ghi đè token cũ (nếu có) -> token cũ ở máy khác sẽ vô hiệu
    await user.save();

    return res.json({
      message: "Login success",
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        status: user.status
      },
      access_token: accessToken,
      refresh_token: refreshToken
    });
  } catch (err) {
    console.error("[LOGIN ERROR]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// -------------------- REFRESH TOKEN (NEW) --------------------
// API này được gọi khi Access Token hết hạn (Client nhận lỗi 401 -> gọi API này)
export const requestRefreshToken = async (req, res) => {
  try {
    // Lấy refresh token từ body (hoặc cookie nếu bạn làm cookie)
    const { refresh_token } = req.body; 

    if (!refresh_token) 
      return res.status(401).json({ message: "No refresh token provided" });

    // 1. Verify xem token có hợp lệ (chưa hết hạn, đúng secret) không
    let decoded;
    try {
      decoded = jwt.verify(refresh_token, REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(403).json({ message: "Invalid or expired refresh token" });
    }

    // 2. Tìm user trong DB
    const user = await User.findById(decoded.id);
    if (!user) 
      return res.status(403).json({ message: "User not found" });

    // 3. Quan trọng: So sánh token gửi lên với token trong DB
    // Nếu khác nhau (User đã logout hoặc đăng nhập nơi khác), từ chối
    if (user.refreshToken !== refresh_token) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // 4. Nếu mọi thứ OK -> Cấp Access Token MỚI
    const newAccessToken = signAccessToken(user);

    // (Tùy chọn) Có thể cấp luôn Refresh Token mới để xoay vòng (Rotation)
    // Ở đây giữ nguyên refresh token cũ cho đơn giản
    
    return res.json({ 
      access_token: newAccessToken 
    });

  } catch (err) {
    console.error("[REFRESH ERROR]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// -------------------- GET PROFILE --------------------
export const getProfile = async (req, res) => {
  try {
    // req.user được gán từ middleware verify ACCESS_TOKEN
    const user = await User.findById(req.user.id).select("-password_hash -refreshToken"); 
    //chỗ sửa
    const data=user;
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// -------------------- LOGOUT --------------------
export const logout = async (req, res) => {
  try {
    // Khi logout, ta xóa refresh token trong DB
    // Lần sau kẻ trộm có refresh token cũ cũng không đổi được access token mới
    const user = await User.findById(req.user.id);
    
    if (user) {
      user.status = "offline";
      user.refreshToken = null; // Xóa token
      await user.save();
    }

    return res.json({ message: "Logout success" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
//phần upload link ảnh 
export const updateAvatar = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy từ auth middleware
    const user = await User.findById(userId);

    if (!req.file)
      return res.status(400).json({ error: "No image uploaded" });

    // Nếu có avatar cũ → xóa trên Cloudinary
    if (user.avatar_public_id) {
      try {
        await cloudinary.uploader.destroy(user.avatar_public_id);
      } catch (err) {
        console.log("Error removing old avatar: ", err.message);
      }
    }

    // Cập nhật dữ liệu mới
    user.avatar = req.file.path;
    user.avatar_public_id = req.file.filename;
    await user.save();

    res.json({ success: true, avatar: user.avatar });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Upload failed" });
  }
};
// controllers/auth.controller.js -> Thêm vào cuối file

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy từ token
    // Lấy các trường cho phép sửa
    const { name, username, bio, password, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Cập nhật Username (có check trùng)
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      user.username = username;
    }

    // 2. Cập nhật thông tin cơ bản
    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio; // Nếu bạn đã thêm field bio vào Model

    // 3. Cập nhật Mật khẩu
    // Logic: User phải gửi password MỚI để đổi.
    // (Tốt hơn là bắt user gửi cả password CŨ để xác nhận, nhưng làm đơn giản trước)
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      // Gán vào virtual field, hook pre('save') sẽ tự hash
      user.password = password; 
    }

    await user.save();

    return res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        bio: user.bio,
        avatar: user.avatar,
        status: user.status
      }
    });

  } catch (err) {
    console.error("[UPDATE PROFILE ERROR]", err);
    // Bắt lỗi validation từ Mongoose (ví dụ lỗi password ngắn trong virtual set)
    if (err.message.includes("Password must be at least")) {
       return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: "Server error" });
  }
};
//phần lấy id 
export const getProfilebyID= async(req,res)=>{
  try {
    const userId = req.params.id;
    if (!userId) return res.status(400).json({ message: "Thiếu user_id" });
    
    const data = await User.findById(userId).select("-password"); // 👈 Sửa ở đây

    if (!data) return res.status(404).json({ message: "Không tìm thấy người dùng" });

    return res.json({ data });
  } catch (err) {
    console.error("[GET PROFILE BY ID ERROR]", err);
    return res.status(500).json({ message: "Server error" });
  }
} 