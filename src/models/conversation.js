import mongoose from "mongoose";
const { Schema } = mongoose;

const ConversationSchema = new Schema(
  {
    //dự phòng cho trường hợp làm thêm chat 1-1
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // Lưu tin nhắn cuối cùng để hiển thị preview nhanh mà không cần join bảng Message
    last_message: {
      content: String,
      sender_id: { type: Schema.Types.ObjectId, ref: "User" },
      created_at: Date,
      is_seen: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ members: 1 }); //thêm index để tăng tốc tìm kiếm

export default mongoose.model("Conversation", ConversationSchema);
