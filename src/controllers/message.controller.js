import Message from "../models/message.js";
import Room from "../models/room.js";

// Lấy lịch sử tin nhắn của room
export const getRoomMessages = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const limit = parseInt(req.query.limit) || 30;
    const before = req.query.before ? new Date(req.query.before) : new Date();

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const messages = await Message.find({
      conversation_id: room._id,
      on_model: "Room",
      createdAt: { $lt: before },
    })
      .sort({ createdAt: 1 }) // mới nhất lên đầu
      .limit(limit)
      .populate("sender_id", "username avatar") // lấy tên + avatar
      .lean();
    // Đảo mảng để hiện từ cũ → mới
    //messages.reverse();
    const message2 = messages.map((msg) => ({
      id: msg._id,
      content: msg.content,
      type: msg.type,
      createdAt: msg.createdAt,
      sender_id: msg.sender_id?._id,
    }));
    const hasMore = messages.length === limit;
    res.json({
      message2,
      hasMore,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
