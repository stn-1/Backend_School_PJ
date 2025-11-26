import Room from "../models/room.js";
import User from "../models/user.js";
import mongoose from "mongoose";

// Helper kiểm tra quyền admin
function isAdmin(room, userId) {
  const member = room.room_members.find(
    (m) => m.user_id.toString() === userId.toString()
  );
  return member && member.role === "admin";
}

// ------------------------------
// 1. TẠO PHÒNG
// ------------------------------
export const createRoom = async (req, res) => {
  try {
    const { name, description, slug, background } = req.body;
    const userId = req.user.id; // lấy từ token

    const exists = await Room.findOne({ slug });
    if (exists) return res.status(400).json({ message: "Slug đã tồn tại" });

    const room = new Room({
      name,
      description,
      slug,
      owner_id: userId,
      background: background || undefined,

      room_members: [
        {
          user_id: userId,
          role: "admin",
          joined_at: new Date(),
          last_active_at: new Date()
        }
      ]
    });

    await room.save();
    return res.json({ message: "Tạo phòng thành công", room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ------------------------------
// 2. LẤY THÔNG TIN PHÒNG QUA SLUG
// ------------------------------
export const getRoomBySlug = async (req, res) => {
  try {
    const slug = req.params.slug;

    const room = await Room.findOne({ slug }).lean();
    if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

    return res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ------------------------------
// 3. JOIN PHÒNG
// ------------------------------
export const joinRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;
    console.log(userId);
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

    const already = room.room_members.some(
      (m) => m.user_id.toString() === userId.toString()
    );
    if (already) return res.json({ message: "Bạn đã ở trong phòng" });

    room.room_members.push({
      user_id: userId,
      role: "member",
      joined_at: new Date(),
      last_active_at: new Date()
    });

    await room.save();
    return res.json({ message: "Tham gia phòng thành công", room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ------------------------------
// 4. RỜI PHÒNG
// ------------------------------
export const leaveRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

    // không cho owner rời phòng nếu chưa chuyển quyền
    if (room.owner_id.toString() === userId.toString()) {
      return res.status(400).json({
        message: "Owner không thể rời phòng. Hãy chuyển quyền rồi rời."
      });
    }

    room.room_members = room.room_members.filter(
      (m) => m.user_id.toString() !== userId.toString()
    );

    await room.save();
    return res.json({ message: "Thoát phòng thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ------------------------------
// 5. XOÁ PHÒNG (CHỈ ADMIN/OWNER)
// ------------------------------
export const deleteRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

    if (!isAdmin(room, userId)) {
      return res.status(403).json({ message: "Chỉ admin mới được xoá phòng" });
    }

    await room.deleteOne();
    return res.json({ message: "Xoá phòng thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ------------------------------
// 6. UPDATE PHÒNG (ADMIN)
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

    Object.assign(room, updates); // merge trực tiếp
    room.updated_at = new Date();

    await room.save();
    return res.json({ message: "Cập nhật phòng thành công", room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ------------------------------
// 7. LẤY DANH SÁCH THÀNH VIÊN
// ------------------------------
export const getRoomMembers = async (req, res) => {
  try {
    const roomId = req.params.id;

    const room = await Room.findById(roomId)
      .select("room_members")
      .populate("room_members.user_id", "username name avatar");

    if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

    return res.json(room.room_members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ------------------------------
// 8. ĐÁ USER RA KHỎI PHÒNG
// ------------------------------
export const kickMember = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;
    const targetId = req.body.user_id;
    //phần này là check phần body của request
    if (!targetId) {
      return res.status(400).json({
        message: "Thiếu user_id trong body. Hãy gửi { user_id: \"...\" }"
      });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

    if (!isAdmin(room, userId)) {
      return res.status(403).json({ message: "Bạn không có quyền kick" });
    }

    room.room_members = room.room_members.filter(
      (m) => m.user_id.toString() !== targetId
    );

    await room.save();
    return res.json({ message: "Đã kick thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};
