import Room from "../models/room.js";

export const verifyRoomMembership = async (req, res, next) => {
  const roomId = req.params.id || req.params.roomId;
  const userId = req.user.id;

  const room = await Room.findById(roomId);
  if (!room) return res.status(404).json({ message: "Room not found" });

  const isMember = room.room_members.some(
    (m) => m.user_id.toString() === userId.toString()
  );

  if (!isMember) {
    return res.status(403).json({
      message: "You are not a member of this room",
    });
  }

  next();
};
