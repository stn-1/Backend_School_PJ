import Friendship from "../models/friendship.js";
import Conversation from "../models/conversation.js";
import User from "../models/user.js"; // Import User nếu cần check tồn tại

// 1. Gửi lời mời kết bạn
export const sendFriendRequest = async (req, res) => {
  try {
    const requesterId = req.user?._id || req.user?.id; // Lấy từ JWT Middleware
    const { recipientId } = req.body;
    console.log(requesterId);
    if (requesterId.toString() === recipientId) {
      return res
        .status(400)
        .json({ message: "Không thể kết bạn với chính mình" });
    }

    // Thử tạo Friendship mới
    // Nhờ pre('validate') hook trong Model của bạn, user1 và user2 sẽ tự sắp xếp
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
      // Bắt lỗi trùng lặp (Duplicate Key E11000) do Index {user1: 1, user2: 1} unique
      if (err.code === 11000) {
        // Kiểm tra trạng thái hiện tại để báo lỗi chính xác hơn
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
      throw err; // Ném các lỗi khác
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Chấp nhận lời mời (Kèm tạo Conversation)
export const acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.user._id || req.user?.id;
    const { friendshipId } = req.body;

    const friendship = await Friendship.findById(friendshipId);
    if (!friendship)
      return res.status(404).json({ message: "Không tìm thấy lời mời" });

    // VALIDATION QUAN TRỌNG:
    // Chỉ người NHẬN mới được accept. Người gửi (requester) không được tự accept.
    if (friendship.requester.toString() === userId.toString()) {
      return res
        .status(403)
        .json({ message: "Bạn không thể tự chấp nhận lời mời của mình" });
    }

    if (friendship.status !== "pending") {
      return res.status(400).json({ message: "Lời mời không khả dụng" });
    }

    // Cập nhật trạng thái
    friendship.status = "accepted";
    friendship.updated_at = new Date();
    await friendship.save();

    // --- LOGIC TỰ ĐỘNG TẠO CONVERSATION ---
    // Để sau khi accept, frontend có thể redirect sang khung chat ngay
    const members = [friendship.user1, friendship.user2];

    // Kiểm tra xem Conversation đã tồn tại chưa (dùng $all để không quan tâm thứ tự)
    let conversation = await Conversation.findOne({
      members: { $all: members },
    });

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
    const userId = req.user._id;
    const { friendshipId } = req.params; // Truyền qua URL param

    const friendship = await Friendship.findById(friendshipId);
    if (!friendship)
      return res.status(404).json({ message: "Không tìm thấy dữ liệu" });

    // Check quyền: Chỉ user1 hoặc user2 mới được xóa
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

// 4. Lấy danh sách lời mời kết bạn (Received Requests)
export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    // Logic: Tìm friendship status 'pending' VÀ mình KHÔNG PHẢI là requester
    // Vì user1/user2 đã bị sort, nên mình có thể nằm ở user1 hoặc user2
    // Nhưng điều kiện tiên quyết là: requester != mình

    const requests = await Friendship.find({
      $or: [{ user1: userId }, { user2: userId }],
      status: "pending",
    }).populate("requester receiver", "username avatar name"); // Lấy thông tin người gửi để hiển thị

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Lấy danh sách bạn bè (My Friends)
export const getFriendList = async (req, res) => {
  try {
    const userId = req.user._id;

    const friendships = await Friendship.find({
      $or: [{ user1: userId }, { user2: userId }],
      status: "accepted",
    })
      .populate("user1", "username avatar email")
      .populate("user2", "username avatar email");

    // Map dữ liệu để trả về list clean (chỉ chứa thông tin người bạn)
    const friends = friendships.map((f) => {
      if (f.user1._id.toString() === userId.toString()) {
        return { ...f.user2.toObject(), friendshipId: f._id }; // Trả về user2
      } else {
        return { ...f.user1.toObject(), friendshipId: f._id }; // Trả về user1
      }
    });

    res.status(200).json(friends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
