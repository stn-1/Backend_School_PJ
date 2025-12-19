import mongoose from "mongoose";
const { Schema } = mongoose;

const MessageSchema = new Schema(
  {
    sender_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    conversation_id: { type: Schema.Types.ObjectId, required: true },
    on_model: { type: String, enum: ["Room", "Conversation"], default: "Room" },
    content: { type: String, required: true },
    type: { type: String, enum: ["text", "image", "system"], default: "text" },
    seen_by: [{ type: Schema.Types.ObjectId, ref: "User" }], //chức năng này phát triển sau
  },
  {
    timestamps: true,
  }
);

//thêm index để tăng tốc tìm kiếm
MessageSchema.index({ conversation_id: 1, createdAt: -1 });

export default mongoose.model("Message", MessageSchema);
