// models/PomodoroSession.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const PomodoroSessionSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    duration: { type: Number, required: true },
    tag: { type: String, default: null },
    completed_at: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

//thêm index để tìm kiếm cho nhanh
PomodoroSessionSchema.index({ user_id: 1, completed_at: -1 });

export default mongoose.model("PomodoroSession", PomodoroSessionSchema);
