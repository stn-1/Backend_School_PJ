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
export const getLeaderboard = async (req, res) => {
  try {
    // 1. Lấy tham số từ Frontend
    const { startTime, endTime } = req.query;

    // Validate
    if (!startTime || !endTime) {
      return res
        .status(400)
        .json({ error: "Missing params: startTime or endTime" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // 2. Thực hiện Aggregation
    const leaderboard = await Session.aggregate([
      // BƯỚC 1: Lọc dữ liệu theo thời gian và trạng thái hoàn thành
      {
        $match: {
          completed: true, // Chỉ lấy các session đã hoàn thành
          started_at: { $gte: start, $lte: end },
        },
      },

      // BƯỚC 2: Gom nhóm theo User và tính tổng duration
      {
        $group: {
          _id: "$user_id", // Gom theo ID người dùng
          totalDuration: { $sum: "$duration" }, // Cộng dồn duration
          sessionsCount: { $sum: 1 }, // (Tùy chọn) Đếm xem họ đã học bao nhiêu session
        },
      },

      // BƯỚC 3: Sắp xếp giảm dần theo tổng thời gian (Người cao nhất lên đầu)
      {
        $sort: { totalDuration: -1 },
      },

      // BƯỚC 4: Lấy Top 50
      {
        $limit: 50,
      },

      // BƯỚC 5: Join với collection 'users' để lấy thông tin (Tên, Avatar...)
      // Lưu ý: 'users' là tên collection trong MongoDB (thường là số nhiều, viết thường)
      {
        $lookup: {
          from: "users", // Tên collection User trong DB
          localField: "_id", // Trường _id ở step Group (chính là user_id)
          foreignField: "_id", // Trường _id bên collection users
          as: "userInfo", // Tên field tạm chứa kết quả join
        },
      },

      // BƯỚC 6: Làm phẳng mảng userInfo (vì lookup trả về mảng)
      // Nếu user không tồn tại (đã bị xóa), bản ghi này sẽ bị loại bỏ
      {
        $unwind: "$userInfo",
      },

      // BƯỚC 7: Chỉ lấy các trường cần thiết để trả về Frontend
      {
        $project: {
          _id: 1, // User ID
          totalDuration: 1,
          sessionsCount: 1,
          name: "$userInfo.name", // Lấy tên từ object userInfo
          avatar: "$userInfo.avatar", // Lấy avatar
          email: "$userInfo.email", // (Tùy chọn)
        },
      },
    ]);

    // 3. Trả về kết quả
    res.json({
      data: leaderboard,
      startTime: start,
      endTime: end,
    });
  } catch (err) {
    console.error("[getLeaderboard ERROR]", err);
    res.status(500).json({ error: err.message });
  }
};
