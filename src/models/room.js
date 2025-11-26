import mongoose from "mongoose";
const { Schema } = mongoose;

/* ---------------------------------------------
   SUBSCHEMA: Room Members
---------------------------------------------- */
const RoomMemberSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["admin", "member"], default: "member" },
  joined_at: { type: Date, default: Date.now },
  last_active_at: { type: Date, default: Date.now }
});

/* ---------------------------------------------
   MAIN ROOM SCHEMA
---------------------------------------------- */
const RoomSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },

  // --- SỬA Ở ĐÂY ---
  slug: {
    type: String,
    required: true,
    unique: true, // Chỉ cần dòng này là đủ (vừa unique, vừa có index)
    trim: true
    // Đã xóa dòng "index: true" để tránh duplicate
  },

  owner_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  is_public: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
  chat_during_pomodoro: { type: Boolean, default: true },

  background: {
    name: { type: String, default: "default_bg" },
    type: { type: String, enum: ["static", "animated"], default: "static" }
  },

  room_members: [RoomMemberSchema]

}, {
  timestamps: {
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
});

/* ---------------------------------------------
   INDEXES FOR PERFORMANCE
---------------------------------------------- */
RoomSchema.index({ name: "text", description: "text" });

// --- ĐÃ XÓA DÒNG RoomSchema.index({ slug: 1 }); ---
// Vì ở trên đã có unique: true rồi.

RoomSchema.index({ owner_id: 1 });
RoomSchema.index({ "room_members.user_id": 1 });

export default mongoose.model("Room", RoomSchema);