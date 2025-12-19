import Session from "../models/session.js";
import User from "../models/user.js";
import mongoose from "mongoose";

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
      notes: "",
      tag_id: tag_id,
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

    const { duration, completed, ended_at } = req.body;

    const session = await Session.findOne({
      user_id: userId,
      completed: false,
    }).sort({ started_at: -1 });

    if (!session) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy phiên làm việc đang diễn ra." });
    }

    if (duration !== undefined) session.duration = Number(duration);

    if (completed === true) {
      session.completed = true;
      session.ended_at = ended_at ? new Date(ended_at) : new Date();
    }

    await session.save();

    res.status(200).json({ message: "Cập nhật session thành công", session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
//start time và end time được nhận từ user để đảm bảo sử lý thời gian
export const heatmapData = async (req, res) => {
  try {
    const { user_id, startTime, endTime } = req.query;
    const timezone = "+07:00";
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

    const rawSessions = await Session.aggregate([
      {
        $match: {
          user_id: userObjectId,
          completed: true,
          started_at: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$started_at",
              timezone: timezone,
            },
          },
          duration: { $sum: "$duration" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dataMap = {};
    rawSessions.forEach((item) => {
      dataMap[item._id] = item.duration;
    });

    const durations = [];
    //phần tính toán thời gian
    const sign = timezone.startsWith("-") ? -1 : 1;
    const hours = parseInt(timezone.slice(1, 3), 10);
    const mins = parseInt(timezone.slice(4, 6), 10);
    const offsetMs = sign * (hours * 3600000 + mins * 60000);

    const oneDayMs = 24 * 60 * 60 * 1000;

    let currentPointer = start.getTime();
    const endPointer = end.getTime();

    while (currentPointer <= endPointer) {
      // Tạo "thời gian ảo" bằng cách cộng lệch múi giờ vào timestamp UTC hiện tại
      const fakeLocalDate = new Date(currentPointer + offsetMs);
      const dateString = fakeLocalDate.toISOString().split("T")[0];

      // Lấy dữ liệu từ Map, nếu không có thì là 0
      durations.push(dataMap[dateString] || 0);
      currentPointer += oneDayMs;
    }

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
    const { startTime, endTime, userId } = req.query;

    if (!startTime || !endTime || !userId) {
      return res.status(400).json({ message: "Missing params" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

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

      // Vòng lặp tính toán (Quan trọng: Dựa trên startTime)
      for (let i = 0; i < 24; i++) {
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
    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      return res
        .status(400)
        .json({ error: "Missing params: startTime or endTime" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    const leaderboard = await Session.aggregate([
      {
        $match: {
          completed: true,
          started_at: { $gte: start, $lte: end },
        },
      },

      {
        $group: {
          _id: "$user_id",
          totalDuration: { $sum: "$duration" }, // Cộng dồn duration
          sessionsCount: { $sum: 1 },
        },
      },

      {
        $sort: { totalDuration: -1 },
      },
      //lấy top 50
      {
        $limit: 50,
      },

      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },

      {
        $unwind: "$userInfo",
      },

      //lấy dữ liệu chuẩn trả về front-end
      {
        $project: {
          id: 1,
          totalDuration: 1,
          sessionsCount: 1,
          name: "$userInfo.name",
          avatar: "$userInfo.avatar",
          username: "$userInfo.username",
        },
      },
    ]);

    //Trả về kết quả
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
