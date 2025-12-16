// import Proccess from "../models/progress.js" // LƯU Ý: Tên mô hình thường viết hoa, ví dụ: Progress
import Progress from "../models/progress.js"; // Đã đổi tên biến import thành Progress để dễ theo dõi
import User from "../models/user.js";
import Session from "../models/session.js";
import mongoose from "mongoose";

export const getBeststreak = async (req, res) => {
  try {
    const userId = req.user.id;

    const userProgress = await Progress.findOne({ user: userId });

    if (!userProgress) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy tiến trình của người dùng này" });
    }

    return res.json(userProgress.streak);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getProgress = async (req, res) => {
  try {
    // --- FIX 1: Lấy userId đúng cách ---
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Chuyển userId sang ObjectId để dùng cho Aggregation
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // --- CẤU HÌNH TIMEZONE ---
    const TIMEZONE_OFFSET = 7;
    const TIMEZONE_STRING = "+07:00";

    // --- XỬ LÝ NGÀY GIỜ (Logic của bạn đã khá ổn, giữ nguyên logic tính startOfWeek) ---
    const now = new Date();
    const nowInVN = new Date(now.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
    const currentDayVN = nowInVN.getUTCDay() || 7; // 1 (Thứ 2) -> 7 (CN)

    const startOfWeekVN = new Date(nowInVN);
    startOfWeekVN.setUTCDate(startOfWeekVN.getUTCDate() - currentDayVN + 1);
    startOfWeekVN.setUTCHours(0, 0, 0, 0);

    // Convert ngược lại UTC để query DB
    const queryStartOfWeek = new Date(
      startOfWeekVN.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000
    );

    // --- BƯỚC 3: Aggregation ---
    const sessionStats = await Session.aggregate([
      {
        $match: {
          user_id: userObjectId, // Dùng ObjectId đã convert
          completed: true,
        },
      },
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                totalPromo: { $sum: 1 },
                totalDuration: { $sum: "$duration" },
                uniqueDays: {
                  $addToSet: {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$started_at",
                      timezone: TIMEZONE_STRING,
                    },
                  },
                },
              },
            },
          ],
          weekly: [
            {
              $match: { started_at: { $gte: queryStartOfWeek } },
            },
            { $count: "count" },
          ],
          datesForStreak: [
            {
              $project: {
                dateStr: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$started_at",
                    timezone: TIMEZONE_STRING,
                  },
                },
              },
            },
            { $group: { _id: "$dateStr" } },
            { $sort: { _id: -1 } }, // Ngày mới nhất lên đầu
          ],
        },
      },
    ]);

    const stats = sessionStats[0];
    const overall = stats.overall[0] || {
      totalPromo: 0,
      totalDuration: 0,
      uniqueDays: [],
    };
    const weekCount = stats.weekly[0] ? stats.weekly[0].count : 0;
    const sortedDates = stats.datesForStreak.map((d) => d._id);

    // --- TÍNH TOÁN ---
    const calculatedTotalHours = parseFloat(
      (overall.totalDuration / 3600).toFixed(2)
    );
    const activeDaysCount = overall.uniqueDays.length;
    const calculatedDailyAvg =
      activeDaysCount > 0
        ? parseFloat((calculatedTotalHours / activeDaysCount).toFixed(2))
        : 0;

    // --- LOGIC STREAK (Đã review) ---
    let currentStreak = 0;
    const todayStr = nowInVN.toISOString().split("T")[0];

    // Tính yesterday an toàn hơn
    const yesterdayInVN = new Date(nowInVN);
    yesterdayInVN.setUTCDate(yesterdayInVN.getUTCDate() - 1);
    const yesterdayStr = yesterdayInVN.toISOString().split("T")[0];

    if (sortedDates.length > 0) {
      // Chỉ bắt đầu tính streak nếu lần tập gần nhất là hôm nay hoặc hôm qua
      if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
        currentStreak = 1;

        for (let i = 0; i < sortedDates.length - 1; i++) {
          // Parse lại về Date object để trừ (mặc định sẽ là UTC 00:00:00 của ngày đó)
          const current = new Date(sortedDates[i]);
          const previous = new Date(sortedDates[i + 1]);

          const diffTime = current - previous; // Milliseconds
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // Dùng Math.round an toàn hơn cho mốc 00:00

          if (diffDays === 1) {
            currentStreak++;
          } else {
            break; // Đứt chuỗi
          }
        }
      }
    }

    // --- FIX 2: Aggregation Gifts Sent ---
    const giftSentResult = await Progress.aggregate([
      // Lưu ý: Collection name trong aggregate thường không cần import model nếu bạn dùng Model.aggregate
      // Tuy nhiên Progress.aggregate là đúng nếu Progress là model
      { $unwind: "$gifts" },
      {
        $match: {
          "gifts.senderId": userObjectId, // PHẢI DÙNG ObjectId
        },
      },
      { $count: "sent_count" },
    ]);

    const calculatedGiftsSent = giftSentResult[0]
      ? giftSentResult[0].sent_count
      : 0;

    // --- UPDATE PROGRESS ---
    const updatedProgress = await Progress.findOneAndUpdate(
      { user: userId }, // Ở đây Mongoose tự cast String -> ObjectId nên OK
      {
        $set: {
          streak: currentStreak,
          total_hours: calculatedTotalHours,
          promo_complete: overall.totalPromo,
          week_promo_complete: weekCount,
          daily_average: calculatedDailyAvg,
          gifts_sent: calculatedGiftsSent,
          updated_at: new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate("user", "name email");

    return res.status(200).json({
      success: true,
      data: updatedProgress,
    });
  } catch (error) {
    console.error("Get Progress Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
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
