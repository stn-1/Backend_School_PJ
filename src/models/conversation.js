import mongoose from "mongoose";
const { Schema } = mongoose;

const ConversationSchema = new Schema({
  // Danh sách thành viên (thường là 2 người cho chat 1-1)
  members: [{ type: Schema.Types.ObjectId, ref: "User" }],

  // Lưu tin nhắn cuối cùng để hiển thị preview nhanh mà không cần join bảng Message
  last_message: {
    content: String,
    sender_id: { type: Schema.Types.ObjectId, ref: "User" },
    created_at: Date,
    is_seen: { type: Boolean, default: false }
  }
}, {
  timestamps: true // updated_at sẽ giúp sắp xếp hội thoại mới nhất lên đầu
});

// Index để tìm nhanh cuộc trò chuyện của 1 user
ConversationSchema.index({ members: 1 });

export default mongoose.model("Conversation", ConversationSchema);
