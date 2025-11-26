import mongoose from "mongoose";
const { Schema } = mongoose;

const MessageSchema = new Schema({
  sender_id: { type: Schema.Types.ObjectId, ref: "User", required: true },

  // ID của Phòng (nếu chat nhóm) HOẶC ID của Conversation (nếu chat riêng)
  conversation_id: { type: Schema.Types.ObjectId, required: true },
  
  // Đánh dấu đây là tin nhắn trong 'Room' hay 'Conversation' (để populate cho đúng nếu cần)
  on_model: { type: String, enum: ["Room", "Conversation"], default: "Room" },

  content: { type: String, required: true },
  
  // Loại tin nhắn: văn bản, ảnh, hay thông báo hệ thống (ví dụ: "A đã vào phòng")
  type: { type: String, enum: ["text", "image", "system"], default: "text" },
  
  // Mảng những người đã xem (nếu muốn tính năng "Seen")
  seen_by: [{ type: Schema.Types.ObjectId, ref: "User" }]

}, {
  timestamps: true
});

// Index cực quan trọng để load lịch sử chat nhanh
// Khi user cuộn lên xem tin cũ, query sẽ rất mượt
MessageSchema.index({ conversation_id: 1, createdAt: -1 });

export default mongoose.model("Message", MessageSchema);