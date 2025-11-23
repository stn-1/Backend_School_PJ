// models/Friendship.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const FriendshipSchema = new Schema({
  user1: { type: Schema.Types.ObjectId, ref: "User", required: true },
  user2: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "blocked"], default: "pending" },
  requester: { type: Schema.Types.ObjectId, ref: "User", required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Keep pair uniqueness: store with sorted ids to prevent duplicate inverse entries
FriendshipSchema.index({ user1: 1, user2: 1 }, { unique: true });

// Pre-save: ensure ordering (optional convenience)
FriendshipSchema.pre("validate", function(next) {
  // normalize ordering so user1 < user2 lexicographically by ObjectId string
  if (this.user1 && this.user2) {
    const a = this.user1.toString();
    const b = this.user2.toString();
    if (a > b) {
      // swap
      const tmpUser = this.user1;
      this.user1 = this.user2;
      this.user2 = tmpUser;
    }
  }
  next();
});

export default mongoose.model("Friendship", FriendshipSchema);
