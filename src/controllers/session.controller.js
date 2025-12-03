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
    const { plannedDuration, begin } = req.body;
    const userId = req.user.id;

    const ongoing = await Session.findOne({ user: userId, status: "in_progress" });
    if (ongoing) {
      return res.status(400).json({ message: "You already have an ongoing session" });
    }

    const session = new Session({
      user: userId,
      begin: new Date(begin), // ⬅️ sửa ở đây
      plannedDuration,
      isPaused: false,
      status: "in_progress",
      pauses: [],
      pauseCount: 0,
      duration: 0
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
export const getDurationByday=async(req,res)=>{
      const {day}= req.body;
      day =new Date(day);  
      cong    
};