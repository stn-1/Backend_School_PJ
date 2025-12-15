import mongoose from "mongoose";
const { Schema } = mongoose;

// Subschema cho mỗi gift
const GiftSchema = new mongoose.Schema({
  receiveId: { type: String, required: true },
  senderId: { type: String, required: true }, // tên người gửi
  icon: { type: String, required: true }, // URL hoặc path icon PNG
  claimed: { type: Boolean, default: false }, // có nhận hay chưa
  claimedAt: { type: Date }, // thời gian nhận
});

const ProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },

  coins: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  //phan phan tinh diem
  current_xp: { type: Number, default: 0 },
  remaining_xp: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  total_hours: { type: Number, default: 0 }, //dạng giờ phút
  promo_complete: { type: Number, default: 0 }, //tổng số đã hoàn thành
  week_promo_complete: { type: Number, default: 0 },
  daily_average: { type: Number, default: 0 },
  gifts_sent: { type: Number, default: 0 },

  updated_at: { type: Date, default: Date.now },

  gifts: [GiftSchema], // mảng gift
});

export default mongoose.model("Progress", ProgressSchema);
