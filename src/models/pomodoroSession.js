// models/PomodoroSession.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const PomodoroSessionSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  duration: { type: Number, required: true }, // minutes
  tag: { type: String, default: null },
  completed_at: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Index for fast stats per user & time range
PomodoroSessionSchema.index({ user_id: 1, completed_at: -1 });

export default mongoose.model("PomodoroSession", PomodoroSessionSchema);
