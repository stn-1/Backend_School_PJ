import mongoose from "mongoose";
const { Schema } = mongoose;


// Subschema cho mỗi gift
const GiftSchema = new mongoose.Schema({
  senderName: { type: String, required: true },  // tên người gửi
  icon: { type: String, required: true },        // URL hoặc path icon PNG
  claimed: { type: Boolean, default: false },    // có nhận hay chưa
  claimedAt: { type: Date }                      // thời gian nhận
});

const ProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },

  coins: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  //phan phan tinh diem 
  current_xp: { type: Number, default: 0 },
  remaining_xp: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  total_hours: { type: Number, default: 0 },
  promo_complete: { type: Number, default: 0 },
  total_duration: { type: Number, default: 0 },            // tổng thời gian đã học (số giây hoặc phút)
  last_rewarded_duration: { type: Number, default: 0 },    // thời gian cuối cùng dùng để tính reward
  updated_at: { type: Date, default: Date.now },

  gifts: [GiftSchema]  // mảng gift
});


export default  mongoose.model("Progress", ProgressSchema);
