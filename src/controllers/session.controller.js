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
    const user_id = req.user.id;

    const ongoing = await Session.findOne({ user: user_id, completed: false });
    if (ongoing) {
      return res.status(400).json({ message: "You already have an ongoing session" });
    }

    const session = new Session({
      user_id: user_id,
      completed:false,
      started_at: started_at, 
      plannedDuration,
      ended_at:null,
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
    const userId = req.user.id; // Lấy ID user từ middleware xác thực
    
    // Lấy các dữ liệu cần update từ body
    const { 
      duration, 
      completed, 
      notes,  
      ended_at 
    } = req.body;

    // 1. Tìm session đang chạy (chưa completed) của user đó
    const session = await Session.findOne({ user_id: userId, completed: false });

    if (!session) {
      return res.status(404).json({ message: "Không tìm thấy phiên làm việc đang diễn ra." });
    }

    // 2. Cập nhật các trường nếu có dữ liệu gửi lên
    if (duration !== undefined) session.duration = Number(duration);
    if (notes !== undefined) session.notes = notes;
    

    // 3. Xử lý khi kết thúc session
    if (completed === true) {
      session.completed = true;
      // Nếu client gửi ended_at thì dùng, không thì lấy thời gian hiện tại
      session.ended_at = ended_at ? new Date(ended_at) : new Date();
    }

    // Lưu lại thay đổi
    await session.save();

    res.status(200).json({ message: "Cập nhật session thành công", session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

//phần trả về tất cả duration của user trong năm
export const heatmapData = async (req, res) => {
  try {
    // 0. Lấy userId an toàn
    const maybeUserId = (req.query.user_id ?? req.user?.id);
    if (!maybeUserId) return res.status(400).json({ error: "Missing user id" });
    // validate ObjectId (tránh throw)
    if (!mongoose.Types.ObjectId.isValid(maybeUserId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const userObjectId = new mongoose.Types.ObjectId(maybeUserId);

    // 1. Năm
    const currentYear = new Date().getUTCFullYear();
    const year = parseInt(req.query.year, 10) || currentYear;

    // 2. Mốc UTC (dùng .999 để chắn chắn)
    const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)); // YYYY-01-01T00:00:00.000Z
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)); // YYYY-12-31T23:59:59.999Z

    // 3. Aggregate: group theo ngày (đảm bảo timezone)
    const rawSessions = await Session.aggregate([
  {
    $match: {
      user_id: userObjectId,
      started_at: { $gte: startOfYear, $lte: endOfYear }
    }
  },
  {
    $group: {
      _id: {
        $dateToString: { 
          format: "%Y-%m-%d", 
          date: "$started_at",
          timezone: "+00:00"
        }
      },
      duration: { $sum: "$duration" }
    }
  },
  { $sort: { _id: 1 } }
]);
    console.log(rawSessions);

    // 4. Map
    const dataMap = {};
    rawSessions.forEach(item => { dataMap[item._id] = item.duration; });

    // 5. Lặp theo UTC bằng setUTCDate
    const durations = [];
    const loopDate = new Date(startOfYear); // copy
    while (loopDate.getTime() <= endOfYear.getTime()) {
      const dateString = loopDate.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
      durations.push(dataMap[dateString] || 0);
      // tăng 1 ngày theo UTC
      loopDate.setUTCDate(loopDate.getUTCDate() + 1);
    }

    // 6. Trả về
    res.json({
      year,
      start_date: startOfYear.toISOString().split('T')[0],
      end_date: endOfYear.toISOString().split('T')[0],
      durations
    });

  } catch (err) {
    console.error("[heatmapData ERROR]", err);
    res.status(500).json({ error: err.message });
  }
};



export const getHourlyStats = async (req, res) => {
  try {
    const { date, userId } = req.query; // date format: YYYY-MM-DD
    if (!date || !userId) {
      return res.status(400).json({ message: "Missing date or userId" });
    }

    // 1. CHUẨN HÓA NGÀY THEO UTC (Quan trọng)
    // Giả sử date gửi lên là "2025-12-08"
    const startOfDay = new Date(date);
    // Ép cứng về 00:00:00 UTC
    startOfDay.setUTCHours(0, 0, 0, 0); 
    
    const endOfDay = new Date(startOfDay);
    // Ép cứng về 23:59:59 UTC
    endOfDay.setUTCHours(23, 59, 59, 999);

    // 2. Query Database (Giờ đã khớp với UTC trong DB)
    const sessions = await Session.find({
      user_id: userId,
      completed: true,
      started_at: { $lte: endOfDay }, 
      ended_at: { $gte: startOfDay }, 
    });
    console.log(sessions);

    // Mảng kết quả 24h (Tương ứng 00:00 UTC -> 23:00 UTC)
    const hourlyStats = new Array(24).fill(0);

    sessions.forEach((session) => {
      const sessionStartMs = new Date(session.started_at).getTime();
      const sessionEndMs = new Date(session.ended_at).getTime();
      const totalElapsedMs = sessionEndMs - sessionStartMs;

      if (totalElapsedMs <= 0) return;

      // Tính tỷ lệ tập trung (Logic cũ của bạn)
      const durationInSeconds = session.duration || (totalElapsedMs / 1000);
      const actualFocusMs = durationInSeconds * 1000;
      let focusRatio = actualFocusMs / totalElapsedMs;
      // Fix nhỏ: tránh trường hợp focusRatio quá nhỏ do quên tắt máy (như đã bàn)
      // Nhưng nếu bạn muốn giữ nguyên logic cũ thì cứ để dòng dưới
      if (focusRatio > 1) focusRatio = 1; 

      // 3. Vòng lặp xử lý logic (Dùng setUTCHours)
      for (let i = 0; i < 24; i++) {
        // Tạo khung giờ i theo UTC
        const hourStart = new Date(startOfDay); 
        hourStart.setUTCHours(i, 0, 0, 0); // <--- QUAN TRỌNG: Dùng UTC
        const hourStartMs = hourStart.getTime();

        const hourEnd = new Date(startOfDay);
        hourEnd.setUTCHours(i + 1, 0, 0, 0); // <--- QUAN TRỌNG: Dùng UTC
        const hourEndMs = hourEnd.getTime();

        // Tính giao thoa
        const overlapStart = Math.max(sessionStartMs, hourStartMs);
        const overlapEnd = Math.min(sessionEndMs, hourEndMs);
        const overlapMs = overlapEnd - overlapStart;

        if (overlapMs > 0) {
          const focusedMinutes = (overlapMs * focusRatio) / 1000 / 60;
          hourlyStats[i] += focusedMinutes;
        }
      }
    });

    // 4. Trả về kết quả
    const result = hourlyStats.map((m) => Number(m.toFixed(2))); 
    res.status(200).json(result);

  } catch (error) {
    console.error("Error in getHourlyStats:", error);
    res.status(500).json({ message: "Server error" });
  }
};