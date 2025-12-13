// chat.socket.js
import User from "../models/user.js";
import Room from "../models/room.js";
import Message from "../models/message.js";

export default function chatSocket(io) {
  // -------------------------
  // Middleware xác thực user
  // -------------------------
  io.use(async (socket, next) => {
    try {
      const tokenUserId = socket.handshake.auth.userId;
      if (!tokenUserId) return next(new Error("No userId provided"));

      const user = await User.findById(tokenUserId);
      if (!user) return next(new Error("User not found"));

      if (!user.current_room_id)
        return next(new Error("You are not in a room!"));

      // Lưu thông tin user vào socket
      socket.currentUser = {
        _id: user._id.toString(),
        name: user.username,
        avatar: user.avatar,
        currentRoomId: user.current_room_id.toString(), // Room ID dùng làm socket room key
      };

      // Join socket vào room
      socket.join(socket.currentUser.currentRoomId);

      next();
    } catch (err) {
      console.error(err);
      next(new Error("Authentication error"));
    }
  });

  // -------------------------
  // Xử lý các event
  // -------------------------
  io.on("connection", (socket) => {
    console.log(
      `${socket.currentUser.name} connected to room ${socket.currentUser.currentRoomId}`
    );

    // User gửi tin nhắn
    socket.on("send_message", async (msgContent) => {
      try {
        const messageData = {
          sender_id: socket.currentUser._id,
          //senderName: socket.currentUser.name,
          content: msgContent,
          createdAt: new Date().toISOString(),
          type: "text",
        };

        // Lưu vào DB
        await Message.create({
          sender_id: socket.currentUser._id,
          conversation_id: socket.currentUser.currentRoomId,
          on_model: "Room",
          content: msgContent,
        });

        // Emit cho tất cả socket trong cùng room
        io.to(socket.currentUser.currentRoomId).emit(
          "new_message",
          messageData
        );
      } catch (err) {
        console.error("Error saving message:", err);
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(
        `${socket.currentUser.name} disconnected from room ${socket.currentUser.currentRoomId}`
      );
    });
  });
}
