// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;
const { Schema } = mongoose;

// Schema phụ cho phòng hiện tại
const CurrentRoomSchema = new Schema({
  is_in: { type: Boolean, default: false },
  room_id: { type: Schema.Types.ObjectId, ref: "Room", default: null }
}, { _id: false });

// Schema chính User
const UserSchema = new Schema({
  // unique: true đã tự động tạo index, nên không cần khai báo index thừa ở dưới
  username: { type: String, required: true, unique: true }, 
  
  // KHÔNG để required: true ở đây, vì nó được sinh ra tự động trong pre-save
  password_hash: { type: String }, 

  name: { type: String, default: "" },
  avatar: { type: String, default: null },

  // Pomodoro fields
  streak: { type: Number, default: 0 },
  total_hours: { type: Number, default: 0 },
  promo_complete: { type: Number, default: 0 },

  current_room: { type: CurrentRoomSchema, default: () => ({}) },

  status: { type: String, enum: ["online", "offline", "focus", "break"], default: "offline" },
  
  // Lưu Refresh Token
  refreshToken: { type: String, default: null }, 

  friends: [{ type: Schema.Types.ObjectId, ref: "User" }]
}, {
  timestamps: true
});

// --- VIRTUAL PASSWORD (để nhận password thô từ controller) ---
UserSchema.virtual("password")
  .set(function(password) {
    this._password = password;
  })
  .get(function() {
    return this._password;
  });

// --- PRE-SAVE HOOK (Đã sửa lỗi 'next is not a function') ---
UserSchema.pre("save", async function() {
  // 1. Nếu password_hash đã có sự thay đổi (do code khác cập nhật), bỏ qua
  if (this.isModified("password_hash")) {
    return;
  }

  // 2. Nếu có password thô (_password) được set qua virtual
  if (this._password) {
    // Tự động hash và gán vào password_hash
    const hash = await bcrypt.hash(this._password, SALT_ROUNDS);
    this.password_hash = hash;
  }
  
  // Lưu ý: Với async function, Mongoose tự biết đợi xong mới save.
  // KHÔNG cần gọi next() ở đây nữa.
});

// --- METHODS ---
UserSchema.methods.comparePassword = function(password) {
  // Kiểm tra password nhập vào có khớp hash không
  return bcrypt.compare(password, this.password_hash);
};

export default mongoose.model("User", UserSchema);