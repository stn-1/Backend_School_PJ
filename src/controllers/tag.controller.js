// tag.controller.js
import Tag from "../models/tag.js"; // Đảm bảo đường dẫn import đúng model của bạn

// 1. Lấy danh sách Tag của User hiện tại
export const getTags = async (req, res) => {
  try {
    const userId = req.user.id;

    // Tìm tất cả tag có user_id trùng với user đang request
    // Sắp xếp: Mới nhất lên đầu (created_at: -1) hoặc theo tên (name: 1)
    const tags = await Tag.find({ user_id: userId }).sort({ created_at: -1 });

    return res.status(200).json(tags);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// 2. Tạo Tag mới
export const createTag = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, color } = req.body;

    // Validate cơ bản
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Tên tag không được để trống" });
    }

    // Kiểm tra trùng tên (Optional: Tùy business logic, thường thì không nên để 1 user có 2 tag cùng tên)
    const existingTag = await Tag.findOne({
      user_id: userId,
      name: name.trim(),
    });

    if (existingTag) {
      return res.status(409).json({ message: "Tag với tên này đã tồn tại" });
    }

    // Tạo tag mới
    const newTag = new Tag({
      user_id: userId,
      name: name.trim(),
      color: color || "#6B7280", // Nếu không gửi color thì lấy default hoặc fallback
    });

    await newTag.save();

    return res.status(201).json({
      message: "Tạo tag thành công",
      tag: newTag,
    });
  } catch (err) {
    // Catch lỗi validation của Mongoose (ví dụ sai định dạng màu Hex)
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
};

// 3. Sửa Tag
export const updateTag = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tagId } = req.params; // Route ví dụ: PUT /tags/:tagId
    const { name, color } = req.body;

    // Tìm và update
    // { new: true } -> trả về object sau khi update
    // { runValidators: true } -> để Mongoose check lại regex của field color
    const updatedTag = await Tag.findOneAndUpdate(
      { _id: tagId, user_id: userId }, // Điều kiện: đúng ID tag và đúng chủ sở hữu
      {
        $set: {
          ...(name && { name: name.trim() }), // Chỉ update nếu có gửi name
          ...(color && { color: color }), // Chỉ update nếu có gửi color
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedTag) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy tag hoặc bạn không có quyền sửa" });
    }

    return res.status(200).json({
      message: "Cập nhật tag thành công",
      tag: updatedTag,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Dữ liệu không hợp lệ (Màu sắc phải là mã Hex)" });
    }
    return res.status(500).json({ message: err.message });
  }
};

// 4. Xóa Tag
export const deleteTag = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tagId } = req.params; // Route ví dụ: DELETE /tags/:tagId

    const deletedTag = await Tag.findOneAndDelete({
      _id: tagId,
      user_id: userId, // Đảm bảo chỉ xóa tag của chính mình
    });

    if (!deletedTag) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy tag hoặc bạn không có quyền xóa" });
    }

    return res.status(200).json({
      message: "Xóa tag thành công",
      deletedTagId: tagId,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
export const getTagById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tagId } = req.params; // Lấy ID từ URL

    // Tìm tag vừa đúng ID vừa đúng chủ sở hữu
    const tag = await Tag.findOne({ _id: tagId, user_id: userId });

    if (!tag) {
      return res.status(404).json({
        message: "Không tìm thấy tag hoặc bạn không có quyền xem tag này",
      });
    }

    return res.status(200).json(tag);
  } catch (err) {
    // Nếu ID gửi lên không đúng định dạng ObjectId của MongoDB
    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "Tag ID không hợp lệ" });
    }
    return res.status(500).json({ message: err.message });
  }
};
