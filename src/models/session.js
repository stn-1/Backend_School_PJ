import mongoose from "mongoose";
const { Schema } = mongoose;
//phần này là các phiên pomodoro của người dùng được tách riêng và sử dụng hai index do
//phần này luôn được duyệt thường xuyên và một user có thể có rất nhiều session nên rất cần index
const SessionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  completed: { type: Boolean, required: true },
  started_at: { type: Date, required: true },
  ended_at: { type: Date },
  timer_type: { type: String },
  session_type: { type: String },

  plannedDuration: { type: Number },
  duration: { type: Number, default: 0 },

  notes: { type: String },
});
SessionSchema.index({ user_id: 1, completed: 1, started_at: 1 });
SessionSchema.index({ completed: 1, started_at: 1 });
export default mongoose.model("Session", SessionSchema);
