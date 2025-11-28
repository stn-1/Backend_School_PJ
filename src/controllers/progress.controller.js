// import Proccess from "../models/progress.js" // LƯU Ý: Tên mô hình thường viết hoa, ví dụ: Progress
import Progress from "../models/progress.js" // Đã đổi tên biến import thành Progress để dễ theo dõi
import User from "../models/user.js"


export const getProgress=async(req,res)=>{
    try{
        const userId = req.user.id;
        
        // SỬA LỖI 1: Dùng findOne để tìm tài liệu Progress dựa trên ID người dùng (userId)
        // và SỬA LỖI 2: Thêm từ khóa 'const'
        const userProgress = await Progress.findOne({ user: userId }); 
        
        if(!userProgress) {
            // Có thể trả về 200 kèm dữ liệu rỗng nếu người dùng chưa có progress, 
            // hoặc 404 nếu bạn coi đó là một lỗi
            return res.status(404).json({ message: "Không tìm thấy tiến trình của người dùng này" });
        }
        
        // Đổi tên biến trả về thành userProgress cho nhất quán
        return res.json({ userProgress });
    }catch(err){
        // In lỗi ra console để debug, chỉ trả về thông báo chung cho client
        console.error(err); 
        return res.status(500).json({ message: "Server error" });
    }
}