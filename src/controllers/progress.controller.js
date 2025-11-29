// import Proccess from "../models/progress.js" // LƯU Ý: Tên mô hình thường viết hoa, ví dụ: Progress
import Progress from "../models/progress.js" // Đã đổi tên biến import thành Progress để dễ theo dõi
import User from "../models/user.js"


export const getProgress=async(req,res)=>{
    try{
        const userId = req.user.id;
    
        const userProgress = await Progress.findOne({ user: userId }); 
        
        if(!userProgress) {
            return res.status(404).json({ message: "Không tìm thấy tiến trình của người dùng này" });
        }
        
       
        return res.json({ userProgress });
    }catch(err){
        console.error(err); 
        return res.status(500).json({ message: "Server error" });
    }
}
export const giveGift = async (req, res) => {
  try {
    const senderId = req.user.id; // người gửi lấy từ token
    const { receiverId, icon } = req.body;

    // Tìm progress của người nhận
    const receiverProgress = await Progress.findOne({ user: receiverId });
    if (!receiverProgress)
      return res.status(404).json({ message: "Receiver not found" });

    const newGift = {
      senderId,
      receiveId: receiverId,
      icon,
      claimed: false
    };

    receiverProgress.gifts.push(newGift);
    await receiverProgress.save();

    return res.status(200).json({
      message: "Gift sent successfully!",
      gifts: receiverProgress.gifts
    });

  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getGifts = async (req, res) => {
  try {
    const { userId } = req.params; // lấy userId từ URL

    const progress = await Progress.findOne({ user: userId });

    if (!progress) {
      return res.status(404).json({ message: "User progress not found" });
    }

    return res.json({ gifts: progress.gifts }); 
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};