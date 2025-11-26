import User from "../models/user.js"; // Import Model User của bạn

export default function chatSocket(io) {
  
  // Middleware: Xác thực và Lấy thông tin User từ DB
  io.use(async (socket, next) => {
    try {
      const userId = socket.handshake.auth.userId;
      
      // Tìm user trong Database
      const user = await User.findById(userId);

      if (!user) {
        return next(new Error("User not found"));
      }

      // Lưu thông tin user vào socket để dùng sau
      socket.currentUser = {
        _id: user._id.toString(),
        name: user.username, // Hoặc user.fullName tùy database của bạn
        avatar: user.avatar
      };

      next();
    } catch (e) {
      next(new Error("Database Error"));
    }
  });

  io.on("connection", (socket) => {
    
    socket.on("test_message", (msgContent) => {
      
      // Chuẩn bị dữ liệu gửi đi
      const messageData = {
        senderId: socket.currentUser._id,   // ID người gửi
        senderName: socket.currentUser.name,// Tên người gửi (Lấy từ DB)
        content: msgContent,
        timestamp: new Date().toISOString()
      };

      // Gửi cho tất cả mọi người
      io.emit("test_message", messageData);
    });

  });
}