// models/Message.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const MessageSchema = new Schema({
  from_user: { type: Schema.Types.ObjectId, ref: "User", required: true },

  // either private (to_user) or group (room_id). keep one null.
  to_user: { type: Schema.Types.ObjectId, ref: "User", default: null },
  room_id: { type: Schema.Types.ObjectId, ref: "Room", default: null },

  message: { type: String, required: true },

  // optional fields
  attachments: [{ url: String, filename: String }],
  edited: { type: Boolean, default: false }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

// Ensure either to_user or room_id exist - lightweight validation
MessageSchema.pre("validate", function(next) {
  if (!this.to_user && !this.room_id) {
    next(new Error("Message must have either to_user (private) or room_id (group)."));
  } else {
    next();
  }
});

// Index for fast history queries
MessageSchema.index({ room_id: 1, created_at: -1 });
MessageSchema.index({ to_user: 1, created_at: -1 });

// text index for searching message content
MessageSchema.index({ message: "text" });

export default mongoose.model("Message", MessageSchema);
