import mongoose from "mongoose";
import { nanoid } from "nanoid";
const { Schema } = mongoose;

const RoomMemberSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["admin", "member"], default: "member" },
  joined_at: { type: Date, default: Date.now },
  last_active_at: { type: Date, default: Date.now },
});

const ROOM_CODE_LENGTH = 8;

const RoomSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: () => nanoid(ROOM_CODE_LENGTH),
    },

    // --------------------------------------------------------

    owner_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    is_public: { type: Boolean, default: false },
    locked: { type: Boolean, default: false },
    chat_during_pomodoro: { type: Boolean, default: true },

    background: {
      name: { type: String, default: "aurora-2k.webp" },
      type: { type: String, enum: ["static", "animated"], default: "static" },
    },

    room_members: [RoomMemberSchema],
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

RoomSchema.index({ name: "text", description: "text" });

RoomSchema.index({ owner_id: 1 });
RoomSchema.index({ "room_members.user_id": 1 });

export default mongoose.model("Room", RoomSchema);
