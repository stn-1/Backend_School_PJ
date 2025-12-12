import mongoose from "mongoose";
import Room from "../models/room.js";
import User from "../models/user.js";

/* =========================================
   HELPER FUNCTIONS
========================================= */

// 1. Kiểm tra quyền admin trong phòng
function isAdmin(room, userId) {
  const member = room.room_members.find(
    (m) => m.user_id.toString() === userId.toString()
  );
  return member && member.role === "admin";
}

// 2. Đưa user về phòng mặc định
const returnUserToDefaultRoom = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.default_room_id) return;

    const defaultRoom = await Room.findById(user.default_room_id);
    if (!defaultRoom) return;

    // Check xem đã ở trong đó chưa
    const isAlreadyIn = defaultRoom.room_members.some(
      (m) => m.user_id.toString() === userId.toString()
    );

    if (!isAlreadyIn) {
      defaultRoom.room_members.push({
        user_id: userId,
        role: "admin", // Về nhà mình thì mình là chủ
        joined_at: new Date(),
        last_active_at: new Date(),
      });
      await defaultRoom.save();
    }

    // Cập nhật User
    await User.findByIdAndUpdate(userId, {
      current_room_id: defaultRoom._id,
    });
  } catch (error) {
    console.error("Error returning user to default room:", error);
  }
};

/* =========================================
   CONTROLLERS
========================================= */

// ------------------------------
// LẤY THÔNG TIN PHÒNG QUA SLUG/CODE
// ------------------------------
export const getRoomBySlug = async (req, res) => {
  try {
    const slug = req.params.slug;
    // Dùng .lean() để query nhanh hơn nếu chỉ để đọc
    const room = await Room.findOne({ slug }).lean();
    if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

    return res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};
//phần lấy phòng bằng id
export const getRoomByid = async (req, res) => {
  try {
    const id = req.params.id;
    const room = await Room.findById(id).lean();

    if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

    return res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};
//lấy các phòng còn đang đề public
export const getPublicRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ is_public: true })
      .select("name description owner_id room_members") // chỉ field cần
      .populate({
        path: "owner_id",
        select: "username avatar", // host info
      })
      .populate({
        path: "room_members.user_id",
        select: "avatar", // chỉ avatar member
      })
      .lean();

    const responseData = rooms.map((room) => ({
      id: room._id,
      name: room.name,
      description: room.description,
      host_name: room.owner_id?.username,
      host_avatar: room.owner_id?.avatar,
      members: room.room_members.map((m) => ({
        avatar: m.user_id?.avatar,
      })),
    }));

    return res.json(responseData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ------------------------------
// JOIN PHÒNG (Logic cốt lõi)
// ------------------------------
export const joinRoom = async (req, res) => {
  try {
    const targetRoomId = req.params.id;
    const userId = req.user.id;

    // 1. Kiểm tra phòng đích
    const targetRoom = await Room.findById(targetRoomId);
    if (!targetRoom) {
      return res.status(404).json({ message: "Không tìm thấy phòng" });
    }

    // 2. Kiểm tra nếu đã ở trong phòng rồi
    const isAlreadyIn = targetRoom.room_members.some(
      (m) => m.user_id.toString() === userId.toString()
    );
    if (isAlreadyIn) {
      return res.json({
        message: "Bạn đã ở trong phòng này rồi",
        room: targetRoom,
      });
    }

    // 3. Lấy User & Rời phòng cũ (Quan trọng)
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    // Nếu user đang ở phòng khác (và phòng đó khác phòng đang định vào)
    if (
      user.current_room_id &&
      user.current_room_id.toString() !== targetRoomId
    ) {
      const oldRoom = await Room.findById(user.current_room_id);
      if (oldRoom) {
        // Xóa user khỏi phòng cũ
        oldRoom.room_members = oldRoom.room_members.filter(
          (m) => m.user_id.toString() !== userId.toString()
        );
        await oldRoom.save();
      }
    }

    // 4. Vào phòng mới
    // Nếu là chủ phòng quay lại thì trả quyền admin, không thì là member
    const role =
      targetRoom.owner_id.toString() === userId.toString() ? "admin" : "member";

    targetRoom.room_members.push({
      user_id: userId,
      role: role,
      joined_at: new Date(),
      last_active_at: new Date(),
    });

    await targetRoom.save();

    // 5. Cập nhật User
    user.current_room_id = targetRoom._id;
    await user.save();

    return res.json({ message: "Tham gia phòng thành công", room: targetRoom });
  } catch (err) {
    console.error("[JOIN ROOM ERROR]", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ------------------------------
// RỜI PHÒNG
// ------------------------------
export const leaveRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

    // Không cho owner rời phòng (trừ khi xoá phòng)
    if (room.owner_id.toString() === userId.toString()) {
      return res.status(400).json({
        message: "Chủ phòng không thể rời. Hãy chuyển quyền hoặc xoá phòng.",
      });
    }

    // Xóa user khỏi array members
    room.room_members = room.room_members.filter(
      (m) => m.user_id.toString() !== userId.toString()
    );
    await room.save();

    // Đưa về phòng mặc định
    await returnUserToDefaultRoom(userId);

    return res.json({ message: "Thoát phòng thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ------------------------------
// UPDATE PHÒNG (ADMIN)
// ------------------------------
export const updateRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;
    const updates = req.body;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

    if (!isAdmin(room, userId)) {
      return res.status(403).json({ message: "Bạn không có quyền sửa phòng" });
    }

    // Merge updates vào room
    Object.assign(room, updates);
    room.updated_at = new Date();

    await room.save();
    return res.json({ message: "Cập nhật phòng thành công", room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ------------------------------
// LẤY DANH SÁCH THÀNH VIÊN
// ------------------------------
export const getRoomMembers = async (req, res) => {
  try {
    const roomId = req.params.id;

    const room = await Room.findById(roomId)
      .select("room_members")
      .populate("room_members.user_id", "username name avatar")
      .lean(); // <-- Quan trọng!

    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng" });
    }

    const members = room.room_members.map((m) => {
      const u = m.user_id;
      return {
        user_id: u._id.toString(),
        username: u.username,
        name: u.name,
        avatar: u.avatar,
        role: m.role,
        joined_at: m.joined_at,
        last_active_at: m.last_active_at,
      };
    });

    return res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ------------------------------
// ĐÁ USER RA KHỎI PHÒNG
// ------------------------------
export const kickMember = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id; // Admin thực hiện lệnh
    const targetId = req.body.user_id; // Nạn nhân

    if (!targetId) return res.status(400).json({ message: "Thiếu user_id" });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

    // Check quyền admin của người kick
    if (!isAdmin(room, userId)) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền kick thành viên" });
    }

    // Không thể kick chính mình (dù logic UI sẽ chặn nhưng API cũng nên chặn)
    if (userId === targetId) {
      return res.status(400).json({ message: "Không thể tự kick chính mình" });
    }

    // Xóa nạn nhân khỏi danh sách member
    room.room_members = room.room_members.filter(
      (m) => m.user_id.toString() !== targetId
    );
    await room.save();

    // Đưa nạn nhân về phòng mặc định CỦA HỌ
    await returnUserToDefaultRoom(targetId);

    return res.json({ message: "Đã mời thành viên ra khỏi phòng" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};
