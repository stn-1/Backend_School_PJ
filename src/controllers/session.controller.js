//import session from "../models/session.js";
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
    const { plannedDuration, started_at, timer_type, session_type } = req.body;
    const user_id = req.user.id;

    const session = new Session({
      user_id: user_id,
      completed: false,
      started_at: started_at,
      plannedDuration,
      ended_at: null,
      duration: 0,
      timer_type: timer_type,
      session_type: session_type,
      notes: "con kek",
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
    const { duration, completed, ended_at } = req.body;

    // 1. Tìm session đang chạy (chưa completed) của user đó
    const session = await Session.findOne({
      user_id: userId,
      completed: false,
    }).sort({ started_at: -1 });

    if (!session) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy phiên làm việc đang diễn ra." });
    }

    // 2. Cập nhật các trường nếu có dữ liệu gửi lên
    if (duration !== undefined) session.duration = Number(duration);

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
// export const heatmapData = async (req, res) => {
//   try {
//     // 0. Lấy userId an toàn
//     const maybeUserId = (req.query.user_id ?? req.user?.id);
//     if (!maybeUserId) return res.status(400).json({ error: "Missing user id" });
//     // validate ObjectId (tránh throw)
//     if (!mongoose.Types.ObjectId.isValid(maybeUserId)) {
//       return res.status(400).json({ error: "Invalid user id" });
//     }
//     const userObjectId = new mongoose.Types.ObjectId(maybeUserId);

//     // 1. Năm
//     const currentYear = new Date().getUTCFullYear();
//     const year = parseInt(req.query.year, 10) || currentYear;

//     // 2. Mốc UTC (dùng .999 để chắn chắn)
//     const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)); // YYYY-01-01T00:00:00.000Z
//     const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)); // YYYY-12-31T23:59:59.999Z

//     // 3. Aggregate: group theo ngày (đảm bảo timezone)
//     const rawSessions = await Session.aggregate([
//   {
//     $match: {
//       user_id: userObjectId,
//       started_at: { $gte: startOfYear, $lte: endOfYear }
//     }
//   },
//   {
//     $group: {
//       _id: {
//         $dateToString: {
//           format: "%Y-%m-%d",
//           date: "$started_at",
//           timezone: "+00:00"
//         }
//       },
//       duration: { $sum: "$duration" }
//     }
//   },
//   { $sort: { _id: 1 } }
// ]);
//     console.log(rawSessions);

//     // 4. Map
//     const dataMap = {};
//     rawSessions.forEach(item => { dataMap[item._id] = item.duration; });

//     // 5. Lặp theo UTC bằng setUTCDate
//     const durations = [];
//     const loopDate = new Date(startOfYear); // copy
//     while (loopDate.getTime() <= endOfYear.getTime()) {
//       const dateString = loopDate.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
//       durations.push(dataMap[dateString] || 0);
//       // tăng 1 ngày theo UTC
//       loopDate.setUTCDate(loopDate.getUTCDate() + 1);
//     }

//     // 6. Trả về
//     res.json({
//       year,
//       start_date: startOfYear.toISOString().split('T')[0],
//       end_date: endOfYear.toISOString().split('T')[0],
//       durations
//     });

//   } catch (err) {
//     console.error("[heatmapData ERROR]", err);
//     res.status(500).json({ error: err.message });
//   }
// };
export const heatmapData = async (req, res) => {
  try {
    // 0. Lấy userId và các tham số từ Frontend
    // Frontend gửi: startTime, endTime (ISO UTC), timezone (ví dụ: "+07:00")
    const { user_id, startTime, endTime } = req.query;
    const timezone = "+07:00";
    // Validate cơ bản
    const maybeUserId = user_id ?? req.user?.id;
    if (!maybeUserId || !mongoose.Types.ObjectId.isValid(maybeUserId)) {
      return res.status(400).json({ error: "Invalid or missing user id" });
    }
    if (!startTime || !endTime || !timezone) {
      return res
        .status(400)
        .json({ error: "Missing params: startTime, endTime, or timezone" });
    }

    const userObjectId = new mongoose.Types.ObjectId(maybeUserId);
    const start = new Date(startTime);
    const end = new Date(endTime);

    // 1. Aggregate: Group theo ngày (QUAN TRỌNG: Dùng timezone)
    const rawSessions = await Session.aggregate([
      {
        $match: {
          user_id: userObjectId,
          completed: true, // Nếu cần lọc session hoàn thành
          started_at: { $gte: start, $lte: end }, // Dùng đúng mốc Frontend gửi
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$started_at",
              timezone: timezone, // <--- BẮT BUỘC: Để gom nhóm đúng ngày địa phương
            },
          },
          duration: { $sum: "$duration" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 2. Tạo Map để tra cứu dữ liệu trả về từ DB
    const dataMap = {};
    rawSessions.forEach((item) => {
      dataMap[item._id] = item.duration;
    });

    // 3. Xử lý logic lặp để điền số 0 cho những ngày không làm việc
    const durations = [];

    // Tính toán Offset (độ lệch giờ) để tạo key string (YYYY-MM-DD) chính xác
    // Parse "+07:00" -> ra milliseconds
    const sign = timezone.startsWith("-") ? -1 : 1;
    const hours = parseInt(timezone.slice(1, 3), 10);
    const mins = parseInt(timezone.slice(4, 6), 10);
    const offsetMs = sign * (hours * 3600000 + mins * 60000);

    const oneDayMs = 24 * 60 * 60 * 1000;

    // Bắt đầu chạy từ startTime (đã là UTC chuẩn của 0h00 Local)
    let currentPointer = start.getTime();
    const endPointer = end.getTime();

    while (currentPointer <= endPointer) {
      // Tạo "thời gian ảo" bằng cách cộng lệch múi giờ vào timestamp UTC hiện tại
      // Mục đích: Để hàm toISOString() in ra đúng ngày YYYY-MM-DD của Local
      const fakeLocalDate = new Date(currentPointer + offsetMs);
      const dateString = fakeLocalDate.toISOString().split("T")[0]; // "2025-01-01"

      // Lấy dữ liệu từ Map, nếu không có thì là 0
      durations.push(dataMap[dateString] || 0);

      // Tăng lên 1 ngày
      currentPointer += oneDayMs;
    }

    // 4. Trả về kết quả
    // Trả về lại ngày bắt đầu/kết thúc dạng YYYY-MM-DD (Local) để Frontend dễ hiển thị nếu cần
    const startDateLocal = new Date(start.getTime() + offsetMs)
      .toISOString()
      .split("T")[0];
    const endDateLocal = new Date(end.getTime() + offsetMs)
      .toISOString()
      .split("T")[0];

    res.json({
      start_date: startDateLocal,
      end_date: endDateLocal,
      durations,
    });
  } catch (err) {
    console.error("[heatmapData ERROR]", err);
    res.status(500).json({ error: err.message });
  }
};

export const getHourlyStats = async (req, res) => {
  try {
    // Frontend gửi trực tiếp startTime và endTime (đã là chuẩn ISO UTC)
    // Ví dụ VN: startTime="2025-12-07T17:00:00.000Z", endTime="2025-12-08T16:59:59.999Z"
    const { startTime, endTime, userId } = req.query;

    if (!startTime || !endTime || !userId) {
      return res.status(400).json({ message: "Missing params" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    //phần sửa
    // 1. Query Database (Dùng đúng mốc Frontend gửi)
    const sessions = await Session.find({
      user_id: userId,
      completed: true,
      started_at: { $lte: end },
      ended_at: { $gte: start },
    });
    console.log(sessions);

    const hourlyStats = new Array(24).fill(0);

    sessions.forEach((session) => {
      const sessionStartMs = new Date(session.started_at).getTime();
      const sessionEndMs = new Date(session.ended_at).getTime();
      const totalElapsedMs = sessionEndMs - sessionStartMs;

      if (totalElapsedMs <= 0) return;

      const durationInSeconds = session.duration || totalElapsedMs / 1000;
      const focusRatio = Math.min(
        (durationInSeconds * 1000) / totalElapsedMs,
        1
      );

      // 2. Vòng lặp tính toán (Quan trọng: Dựa trên startTime)
      for (let i = 0; i < 24; i++) {
        // Khung giờ thứ i được tính TỪ startTime
        // Nếu startTime là 17:00 UTC (tức 0h VN), thì i=0 sẽ là khung 0h-1h VN
        const hourStartMs = start.getTime() + i * 60 * 60 * 1000;
        const hourEndMs = hourStartMs + 60 * 60 * 1000;

        const overlapStart = Math.max(sessionStartMs, hourStartMs);
        const overlapEnd = Math.min(sessionEndMs, hourEndMs);
        const overlapMs = overlapEnd - overlapStart;

        if (overlapMs > 0) {
          const focusedMinutes = (overlapMs * focusRatio) / 1000 / 60;
          hourlyStats[i] += focusedMinutes;
        }
      }
    });

    const result = hourlyStats.map((m) => Number(m.toFixed(2)));
    res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
export const getDailySession = async (req, res) => {
  try {
    const { startTime, endTime, userId } = req.query;

    if (!startTime || !endTime || !userId) {
      return res.status(400).json({ message: "Missing params" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    //phần sửa
    // 1. Query Database (Dùng đúng mốc Frontend gửi)
    const sessions = await Session.find({
      user_id: userId,
      completed: true,
      started_at: { $lte: end },
      ended_at: { $gte: start },
    });
    console.log(sessions);
    res.status(200).json(sessions);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
export const changeNote = async (req, res) => {
  try {
    const { session_id } = req.params;
    const { notes } = req.body;
    if (!notes) {
      return res.status(400).json({ message: "Notes is required" });
    }

    const session = await Session.findByIdAndUpdate(
      session_id,
      { notes },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    return res.status(200).json({
      message: "Note updated successfully",
      session,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
