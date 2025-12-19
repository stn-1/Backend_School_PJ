// tag.controller.js
import Tag from "../models/tag.js"; // Đảm bảo đường dẫn import đúng model của bạn

// lấy danh sách tag của user hiện tại
export const getTags = async (req, res) => {
  try {
    const userId = req.user.id;
    const tags = await Tag.find({ user_id: userId }).sort({ created_at: -1 });

    return res.status(200).json(tags);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// tạo Tag mới
export const createTag = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, color } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Tên tag không được để trống" });
    }

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
      color: color || "#6B7280",
    });

    await newTag.save();

    return res.status(201).json({
      message: "Tạo tag thành công",
      tag: newTag,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
};

// Sửa Tag
export const updateTag = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tagId } = req.params;
    const { name, color } = req.body;

    const updatedTag = await Tag.findOneAndUpdate(
      { _id: tagId, user_id: userId },
      {
        $set: {
          ...(name && { name: name.trim() }),
          ...(color && { color: color }),
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
    const { tagId } = req.params;

    const deletedTag = await Tag.findOneAndDelete({
      _id: tagId,
      user_id: userId,
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
    const { tagId } = req.params;

    const tag = await Tag.findOne({ _id: tagId, user_id: userId });

    if (!tag) {
      return res.status(404).json({
        message: "Không tìm thấy tag hoặc bạn không có quyền xem tag này",
      });
    }

    return res.status(200).json(tag);
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "Tag ID không hợp lệ" });
    }
    return res.status(500).json({ message: err.message });
  }
};
