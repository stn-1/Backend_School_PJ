import mongoose from "mongoose";
const { Schema } = mongoose;

// Subschema cho mỗi gift
const GiftSchema = new mongoose.Schema({
  //receiveId: { type: String, required: true },
  senderId: { type: String, required: true },
  icon: { type: String, required: true },
  claimed: { type: Boolean, default: false },
  claimedAt: { type: Date },
});
//đây là phần phục vụ cho profile của mỗi user
//cũng có thể cân nhắc việc sử dụng index khi có nhiều
const ProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },

  coins: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  current_xp: { type: Number, default: 0 },
  remaining_xp: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  total_hours: { type: Number, default: 0 },
  promo_complete: { type: Number, default: 0 },
  week_promo_complete: { type: Number, default: 0 },
  daily_average: { type: Number, default: 0 },
  gifts_sent: { type: Number, default: 0 },

  updated_at: { type: Date, default: Date.now },

  gifts: [GiftSchema],
});

export default mongoose.model("Progress", ProgressSchema);
