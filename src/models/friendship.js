// models/friendship.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const FriendshipSchema = new Schema({
  user1: { type: Schema.Types.ObjectId, ref: "User", required: true },
  user2: { type: Schema.Types.ObjectId, ref: "User", required: true },

  status: {
    type: String,
    enum: ["pending", "accepted", "blocked"],
    default: "pending",
  },

  requester: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  receiver: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Unique index để đảm bảo không có duplicate friendship
FriendshipSchema.index({ user1: 1, user2: 1 }, { unique: true });

// tự động sắp xếp theo tên
FriendshipSchema.pre("validate", function () {
  if (this.user1 && this.user2) {
    const a = this.user1.toString();
    const b = this.user2.toString();

    if (a > b) {
      const tmp = this.user1;
      this.user1 = this.user2;
      this.user2 = tmp;
    }
  }
});

FriendshipSchema.pre("save", function () {
  this.updated_at = new Date();
});

export default mongoose.model("Friendship", FriendshipSchema);
