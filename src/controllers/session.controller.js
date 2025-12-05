import session from "../models/session.js";
import Session from "../models/session.js";
import User from "../models/user.js";
import mongoose from "mongoose";
// Helper: chuyển ISO string hoặc Date sang timestamp ms
const toTimestamp = (value) => {
  if (!value) return null;
  return new Date(value).getTime();
};

// Bắt đầu session mới
export const startSession = async (req, res) => {
  try {
    const { plannedDuration,  started_at, timer_type, session_type } = req.body;
    const userId = req.user.id;

    const ongoing = await Session.findOne({ user: userId, status: "in_progress" });
    if (ongoing) {
      return res.status(400).json({ message: "You already have an ongoing session" });
    }

    const session = new Session({
      user: userId,
      completed:false,
      started_at: user_id, 
      plannedDuration,
      ended_at:null,
      isPaused: false,
      pauseCount: 0,
      duration: 0,
      timer_type:timer_type,
      session_type:session_type,
    });

    await session.save();
    res.status(201).json({ message: "Session started", session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const updateSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { end, status, duration } = req.body;

    // Tìm session in_progress của user
    const session = await Session.findOne({ user: userId, status: "in_progress" });
    if (!session) return res.status(404).json({ message: "Session not found" });

    // Update
    if (end) session.end = new Date(end);
    if (status) session.status = status;
    if (duration !== undefined) session.duration = Number(duration);

    await session.save();

    res.status(200).json({ message: "Session updated", session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//phần trả về tất cả duration của user trong năm
export const heatmapData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 1. Lấy năm từ query param, nếu không có thì lấy năm hiện tại
    const currentYear = new Date().getFullYear();
    const year = parseInt(req.query.year) || currentYear;

    // 2. Xác định mốc thời gian đầu năm và cuối năm (theo giờ UTC để tránh lệch ngày)
    // startOfYear: 2025-01-01T00:00:00.000Z
    const startOfYear = new Date(Date.UTC(year, 0, 1)); 
    // endOfYear: 2025-12-31T23:59:59.999Z
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

    // 3. Query Database chỉ trong khoảng thời gian của năm đó
    const rawSessions = await Session.aggregate([
      { 
        $match: { 
          user: new mongoose.Types.ObjectId(userId),
          begin: { 
            $gte: startOfYear, 
            $lte: endOfYear 
          }
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$begin" }
          },
          duration: { $sum: "$duration" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 4. Tạo Map dữ liệu để tra cứu
    const dataMap = {};
    rawSessions.forEach(item => {
        dataMap[item._id] = item.duration;
    });

    // 5. Vòng lặp luôn chạy từ 01/01 đến 31/12 của năm đó
    // Để đảm bảo heatmap luôn đủ 365/366 ô
    const durations = [];
    let loopDate = new Date(startOfYear); // Bắt đầu từ 1/1

    while (loopDate <= endOfYear) {
        const dateString = loopDate.toISOString().split('T')[0];
        
        // Nếu ngày đang lặp > ngày hiện tại thực tế thì có thể dừng (tùy nhu cầu)
        // Nhưng thường heatmap sẽ trả về hết năm (các ngày tương lai là 0)
        
        const value = dataMap[dateString] || 0;
        durations.push(value);

        // Cộng thêm 1 ngày
        loopDate.setDate(loopDate.getDate() + 1);
    }

    // 6. Trả về kết quả
    res.json({
        year: year,
        start_date: startOfYear.toISOString().split('T')[0], // Luôn là YYYY-01-01
        end_date: endOfYear.toISOString().split('T')[0],     // Luôn là YYYY-12-31
        durations: durations
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
//lấy dữ liệu theo ngày



export const getHourlyStats = async (req, res) => {
  try {
    const { date, userId } = req.query;

    if (!date || !userId) {
      return res.status(400).json({ message: "Missing date or userId" });
    }

    const targetDate = new Date(date);

    // 1. Xác định khung giờ bắt đầu và kết thúc của ngày cần xem
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 2. Query Database
    // Chỉ lấy các session đã hoàn thành (completed) vì mới có thời gian kết thúc và duration chính xác
    const sessions = await Session.find({
      user: userId,
      status: "completed", 
      end: { $exists: true }, // Đảm bảo có end date
      $or: [
        // Session bắt đầu hoặc kết thúc trong ngày, hoặc bao trùm cả ngày
        { begin: { $gte: startOfDay, $lte: endOfDay } },
        { end: { $gte: startOfDay, $lte: endOfDay } },
        { begin: { $lt: startOfDay }, end: { $gt: endOfDay } },
      ],
    });

    const hourlyStats = new Array(24).fill(0);
    const startDayTs = startOfDay.getTime();
    const endDayTs = endOfDay.getTime();

    // 3. Xử lý logic chia thời gian
    sessions.forEach((session) => {
      // Thời gian thực tế session diễn ra (bao gồm cả lúc pause)
      const sessionBeginMs = session.begin.getTime();
      const sessionEndMs = session.end.getTime();
      const totalElapsedMs = sessionEndMs - sessionBeginMs;

      if (totalElapsedMs <= 0) return; // Bỏ qua nếu lỗi thời gian

      // Lấy duration thực tế (giây) từ DB. Giả sử duration lưu bằng giây (seconds).
      // Nếu duration lưu bằng phút thì bỏ phép nhân * 1000 bên dưới.
      const actualFocusMs = (session.duration || 0) * 1000; 
      
      // Tính tỷ lệ tập trung: (Thời gian tập trung thực / Tổng thời gian trôi qua)
      // Ví dụ: Ngồi 60 phút (elapsed), nhưng chỉ tập 30 phút (focus), tỷ lệ là 0.5
      let focusRatio = actualFocusMs / totalElapsedMs;
      
      // Fallback: Nếu không có duration hoặc ratio > 1 (lỗi data), coi như full thời gian
      if (!session.duration || focusRatio > 1) focusRatio = 1;

      // Cắt session vào khung giờ của ngày được chọn
      let current = Math.max(sessionBeginMs, startDayTs);
      const end = Math.min(sessionEndMs, endDayTs);

      while (current < end) {
        const currentHour = new Date(current).getHours();

        // Xác định thời điểm kết thúc của giờ hiện tại (VD: 8:00 -> 9:00)
        const nextHourDate = new Date(current);
        nextHourDate.setHours(currentHour + 1, 0, 0, 0);
        const nextHourTs = nextHourDate.getTime();

        // Đoạn thời gian nằm trong giờ này
        const segmentEnd = Math.min(nextHourTs, end);
        const segmentDurationMs = segmentEnd - current;

        // Tính số phút tập trung TRONG KHUNG GIỜ NÀY
        // Công thức: (Khoảng thời gian * Tỷ lệ tập trung) / đổi ra phút
        const focusedMinutesInSegment = (segmentDurationMs * focusRatio) / 1000 / 60;

        if (currentHour >= 0 && currentHour < 24) {
          hourlyStats[currentHour] += focusedMinutesInSegment;
        }

        current = segmentEnd;
      }
    });

    // Làm tròn số liệu trả về
    res.status(200).json(hourlyStats.map((m) => Math.round(m)));

  } catch (error) {
    console.error("Error in getHourlyStats:", error);
    res.status(500).json({ message: "Server error" });
  }
};