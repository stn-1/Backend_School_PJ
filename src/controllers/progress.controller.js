// import Proccess from "../models/progress.js" // LƯU Ý: Tên mô hình thường viết hoa, ví dụ: Progress
import Progress from "../models/progress.js"; // Đã đổi tên biến import thành Progress để dễ theo dõi
import User from "../models/user.js";
import Session from "../models/session.js";
import mongoose from "mongoose";
//import user from "../models/user.js";
//import Progress from "../models/progress.js";

export const getStreakStats = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const TIMEZONE_STRING = "+07:00"; // Múi giờ Việt Nam

    // 1. Aggregation: Lấy danh sách ngày tập (Unique & Sorted Tăng dần)
    const datesResult = await Session.aggregate([
      {
        $match: {
          user_id: userObjectId,
          completed: true,
        },
      },
      {
        $project: {
          // Chuyển sang chuỗi YYYY-MM-DD theo giờ VN
          dateStr: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$started_at",
              timezone: TIMEZONE_STRING,
            },
          },
        },
      },
      {
        $group: { _id: "$dateStr" }, // Gom nhóm (loại bỏ trùng lặp trong ngày)
      },
      {
        $sort: { _id: 1 }, // Sắp xếp: Cũ -> Mới
      },
    ]);

    // Nếu chưa tập buổi nào
    if (!datesResult || datesResult.length === 0) {
      return res.status(200).json({ currentStreak: 0, bestStreak: 0 });
    }

    // Convert kết quả DB thành mảng string đơn giản: ['2023-10-01', '2023-10-02', ...]
    const sortedDates = datesResult.map((item) => item._id);

    // 2. Thuật toán "Một vòng lặp" tính cả 2 chỉ số
    let tempStreak = 1; // Chuỗi tạm thời đang đếm
    let maxStreak = 1; // Kỷ lục

    for (let i = 0; i < sortedDates.length - 1; i++) {
      const currentDate = new Date(sortedDates[i]);
      const nextDate = new Date(sortedDates[i + 1]);

      // Tính khoảng cách ngày
      const diffTime = nextDate - currentDate;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Nếu liên tiếp: Tăng chuỗi tạm
        tempStreak++;
      } else {
        // Nếu đứt quãng: Reset chuỗi tạm về 1
        tempStreak = 1;
      }

      // Cập nhật kỷ lục nếu chuỗi tạm vượt qua kỷ lục cũ
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
      }
    }

    // 3. Xác định Current Streak (Chuỗi hiện tại)
    // tempStreak lúc này chính là chuỗi liên tiếp tính đến ngày CUỐI CÙNG trong list.
    // NHƯNG: Ta phải check xem ngày cuối cùng đó có phải là Hôm nay hoặc Hôm qua không.
    // Nếu ngày cuối cùng là 3 ngày trước -> Chuỗi hiện tại đã bị đứt (= 0).

    let currentStreak = 0;

    // Lấy ngày hôm nay và hôm qua theo giờ VN
    const now = new Date();
    const nowInVN = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayStr = nowInVN.toISOString().split("T")[0];

    const yesterdayInVN = new Date(nowInVN);
    yesterdayInVN.setUTCDate(yesterdayInVN.getUTCDate() - 1);
    const yesterdayStr = yesterdayInVN.toISOString().split("T")[0];

    const lastWorkoutDate = sortedDates[sortedDates.length - 1];

    if (lastWorkoutDate === todayStr || lastWorkoutDate === yesterdayStr) {
      currentStreak = tempStreak;
    } else {
      currentStreak = 0; // Đã bỏ tập quá lâu
    }

    return res.status(200).json({
      currentStreak,
      bestStreak: maxStreak,
    });
  } catch (err) {
    console.error("Get Streak Stats Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getProgress = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // --- CẤU HÌNH TIMEZONE ---
    const TIMEZONE_OFFSET = 7;
    const TIMEZONE_STRING = "+07:00";
    const now = new Date();
    const nowInVN = new Date(now.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);

    // Tính startOfWeek (UTC)
    const currentDayVN = nowInVN.getUTCDay() || 7;
    const startOfWeekVN = new Date(nowInVN);
    startOfWeekVN.setUTCDate(startOfWeekVN.getUTCDate() - currentDayVN + 1);
    startOfWeekVN.setUTCHours(0, 0, 0, 0);
    const queryStartOfWeek = new Date(
      startOfWeekVN.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000
    );

    // --- AGGREGATION ---
    const [sessionStats, giftSentResult] = await Promise.all([
      Session.aggregate([
        {
          $match: {
            user_id: userObjectId,
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
              { $match: { started_at: { $gte: queryStartOfWeek } } },
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
              { $sort: { _id: -1 } }, // Sắp xếp: Mới nhất -> Cũ nhất
            ],
          },
        },
      ]),
      // Query Gifts
      Progress.aggregate([
        { $unwind: "$gifts" },
        { $match: { "gifts.senderId": userObjectId } },
        { $count: "sent_count" },
      ]),
    ]);

    // --- XỬ LÝ SỐ LIỆU ---
    const stats = sessionStats[0];
    const overall = stats.overall[0] || {
      totalPromo: 0,
      totalDuration: 0,
      uniqueDays: [],
    };
    const weekCount = stats.weekly[0] ? stats.weekly[0].count : 0;
    const sortedDates = stats.datesForStreak.map((d) => d._id); // Mảng ngày: [Hôm nay, Hôm qua, Hôm kia...]
    const calculatedGiftsSent = giftSentResult[0]
      ? giftSentResult[0].sent_count
      : 0;

    const calculatedTotalHours = parseFloat(
      (overall.totalDuration / 3600).toFixed(2)
    );
    const activeDaysCount = overall.uniqueDays.length;
    const calculatedDailyAvg =
      activeDaysCount > 0
        ? parseFloat((calculatedTotalHours / activeDaysCount).toFixed(2))
        : 0;

    // --- LOGIC TÍNH CẢ CURRENT STREAK VÀ BEST STREAK ---
    let currentStreak = 0;
    let bestStreak = 0;

    const todayStr = nowInVN.toISOString().split("T")[0];
    const yesterdayInVN = new Date(nowInVN);
    yesterdayInVN.setUTCDate(yesterdayInVN.getUTCDate() - 1);
    const yesterdayStr = yesterdayInVN.toISOString().split("T")[0];

    if (sortedDates.length > 0) {
      let tempStreak = 1;
      let isFirstBlock = true; // Cờ đánh dấu đây có phải là chuỗi đầu tiên (mới nhất) không

      // Kiểm tra xem chuỗi mới nhất có hợp lệ để tính Current Streak không (phải là hôm nay hoặc hôm qua)
      const isLatestValid =
        sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr;

      for (let i = 0; i < sortedDates.length; i++) {
        // Nếu không phải phần tử cuối cùng, so sánh với phần tử kế tiếp
        if (i < sortedDates.length - 1) {
          const current = new Date(sortedDates[i]);
          const previous = new Date(sortedDates[i + 1]); // Vì sort -1 nên previous là ngày cũ hơn

          const diffTime = current - previous;
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            // Vẫn liên tiếp
            tempStreak++;
          } else {
            // Đã bị ngắt quãng (Gap) -> Tổng kết chuỗi vừa rồi

            // 1. Cập nhật Best Streak
            if (tempStreak > bestStreak) {
              bestStreak = tempStreak;
            }

            // 2. Cập nhật Current Streak (Chỉ lấy chuỗi đầu tiên nếu nó hợp lệ)
            if (isFirstBlock) {
              if (isLatestValid) {
                currentStreak = tempStreak;
              }
              isFirstBlock = false; // Các chuỗi sau (trong quá khứ) không còn là current nữa
            }

            // Reset temp để đếm chuỗi mới trong quá khứ
            tempStreak = 1;
          }
        } else {
          // Đây là phần tử cuối cùng của mảng -> Kết thúc chuỗi đang đếm
          if (tempStreak > bestStreak) {
            bestStreak = tempStreak;
          }
          if (isFirstBlock && isLatestValid) {
            currentStreak = tempStreak;
          }
        }
      }
    }

    // --- TRẢ VỀ JSON ---
    return res.status(200).json({
      success: true,
      data: {
        streak: currentStreak, // Chuỗi hiện tại
        best_streak: bestStreak, // Chuỗi kỷ lục
        total_hours: calculatedTotalHours,
        promo_complete: overall.totalPromo,
        week_promo_complete: weekCount,
        daily_average: calculatedDailyAvg,
        gifts_sent: calculatedGiftsSent,
      },
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
const calculateNextLevelXp = (currentLevel) => {
  const baseXP = 100;
  return Math.floor(baseXP * Math.pow(1.2, currentLevel));
};
export const increaseUserProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    // Lưu ý: current_xp ở body request đóng vai trò là lượng XP ĐƯỢC CỘNG THÊM
    const { current_xp: xpToAdd, coins } = req.body;

    if (xpToAdd === undefined && coins === undefined) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    if (
      (xpToAdd !== undefined && typeof xpToAdd !== "number") ||
      (coins !== undefined && typeof coins !== "number")
    ) {
      return res.status(400).json({ message: "Values must be numbers" });
    }

    // 1. Tìm bản ghi Progress hiện tại
    let progress = await Progress.findOne({ user: userId });

    if (!progress) {
      return res.status(404).json({ message: "Progress not found" });
    }

    // 2. Xử lý cộng Coins (nếu có)
    if (coins !== undefined) {
      progress.coins += coins;
    }

    // 3. Xử lý cộng XP và Tăng Level (Logic quan trọng)
    if (xpToAdd !== undefined) {
      // Cộng XP mới vào XP hiện có
      progress.current_xp += xpToAdd;

      // Xử lý trường hợp khởi tạo nếu remaining_xp đang là 0
      if (progress.remaining_xp === 0) {
        progress.remaining_xp = calculateNextLevelXp(progress.level);
      }

      // Vòng lặp kiểm tra: Nếu current_xp vượt quá remaining_xp thì lên cấp
      // Dùng while để xử lý trường hợp cộng 1 lượng XP lớn đủ để lên nhiều cấp cùng lúc
      while (progress.current_xp >= progress.remaining_xp) {
        // Trừ đi lượng XP đã dùng để lên cấp (giữ lại phần dư)
        progress.current_xp -= progress.remaining_xp;

        // Tăng level
        progress.level += 1;

        // Tính toán remaining_xp mới cho level tiếp theo
        progress.remaining_xp = calculateNextLevelXp(progress.level);
      }
    }

    // 4. Lưu lại vào database
    await progress.save();

    return res.json({
      success: true,
      data: {
        level: progress.level,
        current_xp: progress.current_xp,
        remaining_xp: progress.remaining_xp, // Trả về để FE hiển thị thanh progress
        coins: progress.coins,
      },
    });
  } catch (err) {
    console.error("Increase Progress Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getUserProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const progress = await Progress.findOne({ user: userId });
    if (!progress) {
      return res.status(404).json({ message: "Progress not found" });
    }

    return res.json({
      success: true,
      data: {
        current_xp: progress.current_xp,
        coins: progress.coins,
      },
    });
  } catch (err) {
    console.error("Get User Progress Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
