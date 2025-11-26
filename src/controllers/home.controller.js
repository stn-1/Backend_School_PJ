export const hello = (req, res) => {
  try {
    // Xử lý logic tại đây
    return res.status(200).json({ 
      message: "Truy cập Home thành công!",
      data: "hello"
    });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi Server" });
  }
};
export const goodbye = (req, res) => {
  try {
    // Xử lý logic tại đây
    return res.status(200).json({ 
      message: "Truy cập Home thành công!",
      data: "goodbye"
    });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi Server" });
  }
};