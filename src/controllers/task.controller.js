import Task from "../models/task.js";
//phần helper kiểm tra quyền
const findTaskAndVerifyOwner = async (taskId, userId) => {
  const task = await Task.findById(taskId);

  if (!task) {
    return { error: "Không tìm thấy task", status: 404 };
  }

  if (task.user_id.toString() !== userId.toString()) {
    return { error: "Bạn không có quyền truy cập task này", status: 403 };
  }

  return { task, error: null };
};

export const getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { is_complete, limit } = req.query;

    const query = { user_id: userId };

    if (is_complete !== undefined && is_complete !== "") {
      query.is_complete = is_complete === "true";
    }

    // 3. Thực hiện truy vấn
    let taskQuery = Task.find(query).sort({ createdAt: -1 });

    // 4. Nếu có yêu cầu giới hạn (ví dụ limit=5), hoặc bạn muốn mặc định 5
    // Ở đây mình dùng: Nếu truyền ?limit=5 thì lấy 5, nếu không thì lấy hết (hoặc tùy bạn cài đặt)
    if (limit) {
      taskQuery = taskQuery.limit(parseInt(limit));
    }

    const tasks = await taskQuery.lean();

    return res.status(200).json(tasks);
  } catch (error) {
    console.error("Error in getTasks:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách task" });
  }
};

// 2. Tạo một task mới
export const createTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, note, time_complete } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Tiêu đề không được để trống" });
    }

    const newTask = new Task({
      user_id: userId,
      title,
      note: note || "",
      time_complete: time_complete,
    });

    const savedTask = await newTask.save();
    return res.status(201).json(savedTask);
  } catch (error) {
    console.error("Error in createTask:", error);
    res.status(500).json({ message: "Lỗi server khi tạo task" });
  }
};

// 3. Cập nhật task (sửa nội dung hoặc đánh dấu hoàn thành)
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Sử dụng helper
    const { task, error, status } = await findTaskAndVerifyOwner(id, userId);
    if (error) return res.status(status).json({ message: error });

    // Whitelist lọc dữ liệu
    const allowedUpdates = ["title", "note", "is_complete", "time_complete"];
    let hasUpdate = false;

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
        hasUpdate = true;
      }
    });

    if (!hasUpdate) {
      return res
        .status(400)
        .json({ message: "Không có dữ liệu hợp lệ để cập nhật" });
    }

    const updatedTask = await task.save();
    return res.json(updatedTask);
  } catch (error) {
    console.error("Error in updateTask:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật task" });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { task, error, status } = await findTaskAndVerifyOwner(id, userId);
    if (error) return res.status(status).json({ message: error });

    await task.deleteOne();

    return res.json({ message: "Xóa task thành công" });
  } catch (error) {
    console.error("Error in deleteTask:", error);
    res.status(500).json({ message: "Lỗi server khi xóa task" });
  }
};

export const clearCompletedTasks = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Task.deleteMany({
      user_id: userId,
      is_complete: true,
    });

    return res.json({
      message: `Đã dọn dẹp ${result.deletedCount} task hoàn thành`,
    });
  } catch (error) {
    console.error("Error in clearCompletedTasks:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
