import mongoose from "mongoose";
const { Schema } = mongoose;

const SessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  begin: { type: Date, required: true },
  pauses: [
    {
      start: { type: Date, required: true },
      check_point: { type: Date } // null nếu đang pause
    }
  ],
  end: { type: Date },            // Chỉ có khi session hoàn thành

  isPaused: { type: Boolean, default: false },
  pauseCount: { type: Number, default: 0 },  // số lần pause trong 1 session

  //duration: { type: Number, default: 0 }, // tính bằng giây hoặc phút

  plannedDuration: { type: Number },  // VD: 25 phút (mục tiêu)
  duration: { type: Number, default: 0 }, // thời gian thực tế tập trung, không tính pause

  status: {
    type: String,
    enum: ["completed", "canceled", "in_progress"],
    default: "in_progress"
  },

  notes: { type: String }, // Ghi chú của user (optional)
});

export default  mongoose.model("Session", SessionSchema);