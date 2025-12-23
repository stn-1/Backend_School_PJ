//xong

import mongoose from "mongoose";
import Room from "../models/room.js";
import User from "../models/user.js";
//logic của phần này: mỗi người mặc định sẽ có một phòng khi sang phòng
//người khác phải lưu lại phòng mặc định để quay về

//một số hàm hỗ trợ
// kiểm tra xem có phải admin không
function isAdmin(room, userId) {
  const member = room.room_members.find(
    (m) => m.user_id.toString() === userId.toString()
  );
  return member && member.role === "admin";
}

// đưa user về phòng mặc định
const returnUserToDefaultRoom = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.default_room_id) return;

    const defaultRoom = await Room.findById(user.default_room_id);
    if (!defaultRoom) return;

    // check xem đã ở trong đó chưa
    const isAlreadyIn = defaultRoom.room_members.some(
      (m) => m.user_id.toString() === userId.toString()
    );

    if (!isAlreadyIn) {
      defaultRoom.room_members.push({
        user_id: userId,
        role: "admin",
        joined_at: new Date(),
        last_active_at: new Date(),
      });
      await defaultRoom.save();
    }

    await User.findByIdAndUpdate(userId, {
      current_room_id: defaultRoom._id,
    });
  } catch (error) {
    console.error("Error returning user to default room:", error);
  }
};

//có thể lấy bằng slug hoặc id
//phần slug chỉ để mời còn id phòng cần dấu để tránh phá phòng khác
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
      .select("name description owner_id room_members")
      .populate({
        path: "owner_id",
        select: "name",
      })
      .populate({
        path: "room_members.user_id",
        select: "avatar",
      })
      .lean();

    const responseData = rooms.map((room) => ({
      id: room._id,
      name: room.name,
      description: room.description,
      host_name: room.owner_id?.name,
      // host_avatar: room.owner_id?.avatar,
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

//vào phòng
export const joinRoom = async (req, res) => {
  try {
    const targetRoomId = req.params.id;
    const userId = req.user.id;

    // kiểm tra qua
    const targetRoom = await Room.findById(targetRoomId);
    if (!targetRoom) {
      return res.status(404).json({ message: "Không tìm thấy phòng" });
    }

    const isAlreadyIn = targetRoom.room_members.some(
      (m) => m.user_id.toString() === userId.toString()
    );
    if (isAlreadyIn) {
      return res.json({
        message: "Bạn đã ở trong phòng này rồi",
        room: targetRoom,
      });
    }

    if (
      targetRoom.locked &&
      targetRoom.owner_id.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        message: "Phòng hiện đang bị khóa, bạn không thể tham gia lúc này.",
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    if (
      user.current_room_id &&
      user.current_room_id.toString() !== targetRoomId
    ) {
      const oldRoom = await Room.findById(user.current_room_id);
      if (oldRoom) {
        oldRoom.room_members = oldRoom.room_members.filter(
          (m) => m.user_id.toString() !== userId.toString()
        );
        await oldRoom.save();
      }
    }

    // Vào phòng mới
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

    user.current_room_id = targetRoom._id;
    await user.save();

    return res.json({ message: "Tham gia phòng thành công", room: targetRoom });
  } catch (err) {
    console.error("[JOIN ROOM ERROR]", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

//rời phòng
export const leaveRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

    if (room.owner_id.toString() === userId.toString()) {
      return res.status(400).json({
        message: "Chủ phòng không thể rời. Hãy chuyển quyền hoặc xoá phòng.",
      });
    }

    room.room_members = room.room_members.filter(
      (m) => m.user_id.toString() !== userId.toString()
    );
    await room.save();

    await returnUserToDefaultRoom(userId);

    return res.json({ message: "Thoát phòng thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

//cập nhật phòng
export const updateRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;

    // 1. ĐỊNH NGHĨA CÁC TRƯỜNG ĐƯỢC PHÉP SỬA
    const allowedUpdates = [
      "name",
      "description",
      "slug",
      "chat_during_pomodoro",
      "locked",
    ];

    // 2. LỌC req.body
    const updates = Object.keys(req.body).reduce((obj, key) => {
      if (allowedUpdates.includes(key)) {
        obj[key] = req.body[key];
      }
      return obj;
    }, {});

    // Kiểm tra nếu không có trường nào hợp lệ được gửi lên
    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "Không có trường hợp lệ nào để cập nhật" });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

    if (!isAdmin(room, userId)) {
      return res.status(403).json({ message: "Bạn không có quyền sửa phòng" });
    }

    // 3. CẬP NHẬT VỚI DỮ LIỆU ĐÃ LỌC
    Object.assign(room, updates);
    room.updated_at = new Date();

    await room.save();
    return res.json({ message: "Cập nhật phòng thành công", room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

//lấy danh
export const getRoomMembers = async (req, res) => {
  try {
    const roomId = req.params.id;

    const room = await Room.findById(roomId)
      .select("room_members")
      .populate("room_members.user_id", "name avatar")
      .lean();

    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng" });
    }

    const members = room.room_members.map((member) => {
      const user = member.user_id;
      return {
        user_id: user._id.toString(),
        // username: u.username,
        name: user.name,
        avatar: user.avatar,
        role: member.role,
        joined_at: member.joined_at,
        last_active_at: member.last_active_at,
      };
    });

    return res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

//đá user ra khỏi phòng và chỉ được
export const kickMember = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;
    const targetId = req.body.user_id;

    if (!targetId) return res.status(400).json({ message: "Thiếu user_id" });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

    // check quyền admin của người kick
    if (!isAdmin(room, userId)) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền kick thành viên" });
    }

    if (userId === targetId) {
      return res.status(400).json({ message: "Không thể tự kick chính mình" });
    }

    //xóa khỏi danh sách
    room.room_members = room.room_members.filter(
      (m) => m.user_id.toString() !== targetId
    );
    await room.save();

    // đưa về phòng mặc định
    await returnUserToDefaultRoom(targetId);

    return res.json({ message: "Đã mời thành viên ra khỏi phòng" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};
export const changeBackground = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;
    const currentUserId = req.user.id;

    if (type && !["static", "animated"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Background type must be 'static' or 'animated'.",
      });
    }

    const room = await Room.findById(id);

    if (!room) {
      return res
        .status(404)
        .json({ success: false, message: "Room not found." });
    }

    //kiểm tra quyền
    const isOwner = room.owner_id.toString() === currentUserId;

    // Tìm trong mảng room_members xem user có phải là admin không
    const memberInfo = room.room_members.find(
      (member) => member.user_id.toString() === currentUserId
    );
    const isAdminMember = memberInfo && memberInfo.role === "admin";

    if (!isOwner && !isAdminMember) {
      return res.status(403).json({
        success: false,
        message:
          "Permission denied. You must be an Owner or Admin to change settings.",
      });
    }

    if (name) room.background.name = name;
    if (type) room.background.type = type;

    const updatedRoom = await room.save();

    return res.status(200).json({
      success: true,
      message: "Background updated successfully.",
      data: updatedRoom.background,
    });
  } catch (error) {
    console.error("Error changing background:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
