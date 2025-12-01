import mongoose from "mongoose";
import { nanoid } from "nanoid"; // <<< IMPORT nanoid
const { Schema } = mongoose;

/* ---------------------------------------------
    SUBSCHEMA: Room Members
---------------------------------------------- */
const RoomMemberSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    joined_at: { type: Date, default: Date.now },
    last_active_at: { type: Date, default: Date.now }
});

/* ---------------------------------------------
    MAIN ROOM SCHEMA
---------------------------------------------- */
// Độ dài mã phòng ngẫu nhiên (ví dụ 8 ký tự)
const ROOM_CODE_LENGTH = 8; 

const RoomSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, default: "" },

    // --- SỬA Ở ĐÂY (Thay thế slug bằng room_code tự sinh) ---
    slug: {
        type: String,
        required: true, // Vẫn bắt buộc
        unique: true,   // Bắt buộc để đảm bảo duy nhất
        trim: true,
        // Tự động sinh mã 8 ký tự khi tạo mới
        default: () => nanoid(ROOM_CODE_LENGTH), 
    },
    
    // --------------------------------------------------------

    owner_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    is_public: { type: Boolean, default: false },
    locked: { type: Boolean, default: false },
    chat_during_pomodoro: { type: Boolean, default: true },

    background: {
        name: { type: String, default: "default_bg" },
        type: { type: String, enum: ["static", "animated"], default: "static" }
    },

    room_members: [RoomMemberSchema]

}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

/* ---------------------------------------------
    INDEXES FOR PERFORMANCE
---------------------------------------------- */
RoomSchema.index({ name: "text", description: "text" });

// Thêm index cho trường mới room_code để tối ưu tìm kiếm (mặc dù unique: true đã tạo index rồi)
//RoomSchema.index({ room_code: 1 }); 

RoomSchema.index({ owner_id: 1 });
RoomSchema.index({ "room_members.user_id": 1 });

export default mongoose.model("Room", RoomSchema);