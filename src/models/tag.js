import mongoose from "mongoose";
const { Schema } = mongoose;
const TagSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String },
  color: {
    type: String,
    default: "#6B7280",
    match: /^#([0-9A-Fa-f]{6})$/,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});
export default mongoose.model("Tag", TagSchema);
