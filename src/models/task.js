// models/Task.js
import mongoose from "mongoose";
const { Schema } = mongoose;
//chức năng này bên front-end chưa phát triển
const TaskSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    time_complete: { type: Number, default: 0 },
    is_complete: { type: Boolean, default: false },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

TaskSchema.index({ user_id: 1, is_complete: 1, createdAt: -1 });

export default mongoose.model("Task", TaskSchema);
