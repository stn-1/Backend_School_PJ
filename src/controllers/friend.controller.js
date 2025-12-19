//xong
import Friendship from "../models/friendship.js";
import Conversation from "../models/conversation.js";
import User from "../models/user.js";

//gửi lời mời
export const sendFriendRequest = async (req, res) => {
  try {
    const requesterId = req.user?._id || req.user?.id; //do đặt tên không thống nhất
    const { recipientId } = req.body;
    console.log(requesterId);
    if (requesterId.toString() === recipientId) {
      return res
        .status(400)
        .json({ message: "Không thể kết bạn với chính mình" });
    }

    //gọi mongo để tạo ra một Friendship mới
    try {
      const newFriendship = await Friendship.create({
        user1: requesterId,
        user2: recipientId,
        requester: requesterId,
        receiver: recipientId,
        status: "pending",
      });

      res.status(201).json({
        message: "Đã gửi lời mời kết bạn",
        friendship: newFriendship,
      });
    } catch (err) {
      if (err.code === 11000) {
        const existing = await Friendship.findOne({
          $or: [
            { user1: requesterId, user2: recipientId },
            { user1: recipientId, user2: requesterId },
          ],
        });

        if (existing.status === "pending")
          return res
            .status(400)
            .json({ message: "Đã có lời mời đang chờ xử lý." });
        if (existing.status === "accepted")
          return res.status(400).json({ message: "Hai người đã là bạn bè." });
        if (existing.status === "blocked")
          return res
            .status(400)
            .json({ message: "Không thể gửi lời mời (Blocked)." });
      }
      throw err;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.user._id || req.user?.id;
    const { friendshipId } = req.body;

    const friendship = await Friendship.findById(friendshipId);
    if (!friendship)
      return res.status(404).json({ message: "Không tìm thấy lời mời" });

    //chỉ người gửi mới được chấp nhận lời mời
    if (friendship.requester.toString() === userId.toString()) {
      return res
        .status(403)
        .json({ message: "Bạn không thể tự chấp nhận lời mời của mình" });
    }

    if (friendship.status !== "pending") {
      return res.status(400).json({ message: "Lời mời không khả dụng" });
    }

    friendship.status = "accepted";
    friendship.updated_at = new Date();
    await friendship.save();

    const members = [friendship.user1, friendship.user2];

    let conversation = await Conversation.findOne({
      members: { $all: members },
    });

    //tạo hội thoại giữa hai người
    if (!conversation) {
      conversation = await Conversation.create({ members });
    }

    res.status(200).json({
      message: "Đã trở thành bạn bè",
      friendship,
      conversationId: conversation._id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Từ chối hoặc Hủy kết bạn
export const removeFriendship = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendshipId } = req.params;

    const friendship = await Friendship.findById(friendshipId);
    if (!friendship)
      return res.status(404).json({ message: "Không tìm thấy dữ liệu" });

    // Chỉ user1 hoặc user2 mới được xóa
    if (
      friendship.user1.toString() !== userId.toString() &&
      friendship.user2.toString() !== userId.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện thao tác này" });
    }

    await Friendship.findByIdAndDelete(friendshipId);

    res.status(200).json({ message: "Đã xóa mối quan hệ bạn bè / lời mời" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//lấy danh sach lời mời kết bạn
export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    //tìm request có status là pending

    const requests = await Friendship.find({
      $or: [{ user1: userId }, { user2: userId }],
      status: "pending",
    }).populate("requester receiver", "username avatar name"); // Lấy thông tin người gửi để hiển thị

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// lấy lại danh sách bạn bè
export const getFriendList = async (req, res) => {
  try {
    const userId = req.user.id;

    const friendships = await Friendship.find({
      $or: [{ user1: userId }, { user2: userId }],
      status: "accepted",
    })
      .populate("user1", "username avatar name status")
      .populate("user2", "username avatar name status");

    // chỉ trả về bạn mình dưới là logic kiểm tra
    const friends = friendships.map((f) => {
      if (f.user1._id.toString() === userId.toString()) {
        return { ...f.user2.toObject(), friendshipId: f._id };
      } else {
        return { ...f.user1.toObject(), friendshipId: f._id };
      }
    });

    res.status(200).json(friends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
