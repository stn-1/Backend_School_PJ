import mongoose from "mongoose";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;
const { Schema } = mongoose;

const UserSchema = new Schema({
  // --- AUTHENTICATION (GIỮ NGUYÊN) ---
  username: { type: String, required: true, unique: true },
  password_hash: { type: String },
  refreshToken: { type: String, default: null },

  // --- INFO ---
  name: { type: String, default: "" },
  avatar: { type: String, default: null },

  // --- POMODORO ---
  streak: { type: Number, default: 0 },
  total_hours: { type: Number, default: 0 },
  promo_complete: { type: Number, default: 0 },

  // --- CHAT & ROOM STATUS (TỐI ƯU) ---
  // Thay vì object {is_in, room_id}, chỉ cần lưu ID. Null nghĩa là không ở phòng nào.
  current_room_id: { type: Schema.Types.ObjectId, ref: "Room", default: null },

  // Trạng thái hiển thị (online/focus...)
  status: { 
    type: String, 
    enum: ["online", "offline", "focus", "break"], 
    default: "offline" 
  },

  // Bạn bè
  //friends: [{ type: Schema.Types.ObjectId, ref: "User" }]
}, {
  timestamps: true
});

// --- VIRTUALS & HOOKS (GIỮ NGUYÊN) ---
UserSchema.virtual("password")
  .set(function(password) { this._password = password; })
  .get(function() { return this._password; });

UserSchema.pre("save", async function() {
  if (this.isModified("password_hash")) return;
  if (this._password) {
    this.password_hash = await bcrypt.hash(this._password, SALT_ROUNDS);
  }
});

UserSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password_hash);
};

export default mongoose.model("User", UserSchema);