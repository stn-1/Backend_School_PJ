import Session from "../models/session.js";
import User from "../models/user.js";

// Bắt đầu session mới
export const startSession = async (req, res) => {
  try {
    const { plannedDuration } = req.body;
    const userId = req.user.id;

    // Kiểm tra user có session đang chạy chưa
    const ongoing = await Session.findOne({ user: userId, status: "in_progress" });
    if (ongoing) return res.status(400).json({ message: "You already have an ongoing session" });

    const session = new Session({
      user: userId,
      begin: new Date(),
      plannedDuration,
      isPaused: false,
      status: "in_progress",
      focusTime: 0,
    });

    await session.save();
    res.status(201).json({ message: "Session started", session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Pause session
export const pauseSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const session = await Session.findOne({ user: userId, status: "in_progress" });
    if (!session) return res.status(404).json({ message: "No ongoing session found" });

    if (session.isPaused) return res.status(400).json({ message: "Session already paused" });

    const now = new Date();
    session.focusTime += now - session.begin; // cộng thời gian block vừa qua
    session.end = now;
    session.isPaused = true;
    session.pauseCount += 1;
    session.begin = null;

    await session.save();
    res.json({ message: "Session paused", session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Resume session
export const resumeSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const session = await Session.findOne({ user: userId, status: "in_progress" });
    if (!session) return res.status(404).json({ message: "No ongoing session found" });
    if (!session.isPaused) return res.status(400).json({ message: "Session is not paused" });

    session.begin = new Date();
    session.end = null;
    session.isPaused = false;

    await session.save();
    res.json({ message: "Session resumed", session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Finish session
export const finishSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const session = await Session.findOne({ user: userId, status: "in_progress" });
    if (!session) return res.status(404).json({ message: "No ongoing session found" });

    const now = new Date();
    if (!session.isPaused && session.begin) {
      session.focusTime += now - session.begin;
    }

    session.end = now;
    session.status = "completed";
    session.isPaused = false;

    await session.save();

    // TODO: Cập nhật Progress: total_duration, streak, promoComplete nếu focusTime >= plannedDuration
    // Ví dụ:
    // await updateProgress(userId, session.focusTime, session.plannedDuration);

    res.json({ message: "Session completed", session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
