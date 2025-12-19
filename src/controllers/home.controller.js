//hàm để gọi server dậy vì render free cứ 15p ngủ một lần
export const health = (req, res) => {
  res.status(200).send("");
};
