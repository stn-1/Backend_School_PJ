// import Proccess from "../models/progress.js" // LƯU Ý: Tên mô hình thường viết hoa, ví dụ: Progress
import Progress from "../models/progress.js" // Đã đổi tên biến import thành Progress để dễ theo dõi
import User from "../models/user.js";
import Session from "../models/session.js";
import mongoose from "mongoose";


// export const getProgress=async(req,res)=>{
//     try{
//         const userId = req.user.id;
    
//         const userProgress = await Progress.findOne({ user: userId }); 
        
//         if(!userProgress) {
//             return res.status(404).json({ message: "Không tìm thấy tiến trình của người dùng này" });
//         }
        
       
//         return res.json({ userProgress });
//     }catch(err){
//         console.error(err); 
//         return res.status(500).json({ message: "Server error" });
//     }
// }

export const getProgress = async (req, res) => {
  try {
    // 1. Lấy userId (dùng ?. để an toàn)
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const userIdStr = userId.toString();

    // --- CẤU HÌNH MÚI GIỜ VIỆT NAM ---
    const TIMEZONE_OFFSET = 7; // Giờ
    const TIMEZONE_STRING = "+07:00"; // Dùng cho MongoDB Aggregation

    // 2. Xử lý thời gian trong JS để tìm "Đầu tuần" và "Hôm nay" theo giờ VN
    const now = new Date();
    
    // Tạo bản sao thời gian hiện tại đã cộng thêm 7 tiếng (Giả lập giờ VN)
    // Lưu ý: Biến này chỉ dùng để lấy ngày/thứ, không dùng để query trực tiếp
    const nowInVN = new Date(now.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);

    // Tính ngày đầu tuần (Thứ 2) dựa trên giờ VN
    // getUTCDay() trên nowInVN chính là thứ hiện tại ở VN (0=CN, 1=T2...)
    const currentDayVN = nowInVN.getUTCDay() || 7; 
    
    // Set về 00:00:00 sáng Thứ 2 (theo giờ VN)
    const startOfWeekVN = new Date(nowInVN);
    startOfWeekVN.setUTCDate(startOfWeekVN.getUTCDate() - currentDayVN + 1);
    startOfWeekVN.setUTCHours(0, 0, 0, 0);

    // QUAN TRỌNG: Đổi ngược lại về UTC thực tế để query Database
    // Ví dụ: 00:00 T2 (VN) = 17:00 CN (UTC)
    const queryStartOfWeek = new Date(startOfWeekVN.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

    // --- BƯỚC 3: Aggregation với Timezone ---
    const sessionStats = await Session.aggregate([
      { 
        $match: { 
          user_id: new mongoose.Types.ObjectId(userId), 
          completed: true 
        } 
      },
      {
        $facet: {
          "overall": [
            {
              $group: {
                _id: null,
                totalPromo: { $sum: 1 },
                totalDuration: { $sum: "$duration" },
                // Thêm timezone vào đây để group đúng ngày theo giờ VN
                uniqueDays: { 
                  $addToSet: { 
                    $dateToString: { format: "%Y-%m-%d", date: "$started_at", timezone: TIMEZONE_STRING } 
                  } 
                }
              }
            }
          ],
          "weekly": [
            {
              // So sánh với mốc thời gian đã quy đổi
              $match: { started_at: { $gte: queryStartOfWeek } }
            },
            { $count: "count" }
          ],
          "datesForStreak": [
            {
              $project: {
                // Quan trọng: format ngày theo múi giờ +7
                dateStr: { 
                  $dateToString: { format: "%Y-%m-%d", date: "$started_at", timezone: TIMEZONE_STRING } 
                }
              }
            },
            { $group: { _id: "$dateStr" } },
            { $sort: { _id: -1 } }
          ]
        }
      }
    ]);

    const stats = sessionStats[0];
    const overall = stats.overall[0] || { totalPromo: 0, totalDuration: 0, uniqueDays: [] };
    const weekCount = stats.weekly[0] ? stats.weekly[0].count : 0;
    const sortedDates = stats.datesForStreak.map(d => d._id);

    // --- BƯỚC 4: Logic tính toán ---

    // Total Hours
    const calculatedTotalHours = parseFloat((overall.totalDuration / 3600).toFixed(2));

    // Daily Average
    const activeDaysCount = overall.uniqueDays.length;
    const calculatedDailyAvg = activeDaysCount > 0 
      ? parseFloat((calculatedTotalHours / activeDaysCount).toFixed(2)) 
      : 0;

    // --- TÍNH STREAK (Theo giờ VN) ---
    let currentStreak = 0;
    
    // Lấy chuỗi ngày hôm nay và hôm qua theo giờ VN
    const todayStr = nowInVN.toISOString().split('T')[0]; // YYYY-MM-DD
    const yesterdayInVN = new Date(nowInVN);
    yesterdayInVN.setUTCDate(yesterdayInVN.getUTCDate() - 1);
    const yesterdayStr = yesterdayInVN.toISOString().split('T')[0];

    // Debug log để kiểm tra (có thể xóa)
    // console.log("Timezone check:", { todayStr, yesterdayStr, sortedDates });

    if (sortedDates.length > 0) {
      // Logic cũ: Chỉ cần so sánh string là đủ vì string đã được format theo timezone +7
      if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
        currentStreak = 1;
        
        for (let i = 0; i < sortedDates.length - 1; i++) {
          const current = new Date(sortedDates[i]);
          const previous = new Date(sortedDates[i+1]);
          
          // Tính khoảng cách ngày
          const diffTime = Math.abs(current - previous);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // --- BƯỚC 5: Tính Gifts Sent ---
    const giftSentResult = await Progress.aggregate([
      { $unwind: "$gifts" },
      { $match: { "gifts.senderId": userIdStr } },
      { $count: "sent_count" }
    ]);
    const calculatedGiftsSent = giftSentResult[0] ? giftSentResult[0].sent_count : 0;

    // --- BƯỚC 6: Update Progress ---
    const updatedProgress = await Progress.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          streak: currentStreak,
          total_hours: calculatedTotalHours,
          promo_complete: overall.totalPromo,
          week_promo_complete: weekCount,
          daily_average: calculatedDailyAvg,
          gifts_sent: calculatedGiftsSent,
          updated_at: new Date() // Lưu thời gian update (vẫn lưu UTC là chuẩn)
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate("user", "name email");

    return res.status(200).json({
      success: true,
      data: updatedProgress
    });

  } catch (error) {
    console.error("Get Progress Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      error: error.message 
    });
  }
};
export const giveGift = async (req, res) => {
  try {
    const senderId = req.user.id; // người gửi lấy từ token
    const { receiverId, icon } = req.body;

    // Tìm progress của người nhận
    const receiverProgress = await Progress.findOne({ user: receiverId });
    if (!receiverProgress)
      return res.status(404).json({ message: "Receiver not found" });

    const newGift = {
      senderId,
      receiveId: receiverId,
      icon,
      claimed: false
    };

    receiverProgress.gifts.push(newGift);
    await receiverProgress.save();

    return res.status(200).json({
      message: "Gift sent successfully!",
      gifts: receiverProgress.gifts
    });

  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getGifts = async (req, res) => {
  try {
    const { userId } = req.params; // lấy userId từ URL

    const progress = await Progress.findOne({ user: userId });

    if (!progress) {
      return res.status(404).json({ message: "User progress not found" });
    }

    return res.json({ gifts: progress.gifts }); 
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

