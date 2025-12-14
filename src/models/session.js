import mongoose from "mongoose";
const { Schema } = mongoose;

const SessionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  completed: { type: Boolean, required: true },
  started_at: { type: Date, required: true },
  ended_at: { type: Date }, // Chỉ có khi session hoàn thành
  timer_type: { type: String },
  session_type: { type: String },
  //duration: { type: Number, default: 0 }, // tính bằng giây hoặc phút

  plannedDuration: { type: Number }, // VD: 25 phút (mục tiêu)
  duration: { type: Number, default: 0 }, // thời gian thực tế tập trung, không tính pause

  notes: { type: String }, // Ghi chú của user (optional)
});

export default mongoose.model("Session", SessionSchema);
