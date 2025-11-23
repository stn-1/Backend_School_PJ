// models/Room.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const RoomSchema = new Schema({
  name: { type: String, required: true },

  // store only user ids to prevent document growth
  list_users: [{ type: Schema.Types.ObjectId, ref: "User" }],

  // optional meta
  created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  meta: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

// Index to find room fast
RoomSchema.index({ name: 1 });

export default mongoose.model("Room", RoomSchema);
