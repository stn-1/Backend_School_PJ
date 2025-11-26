// controllers/auth.controller.js
import User from "../models/user.js";
import jwt from "jsonwebtoken";

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

    return res.json({ user });
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