import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Lấy chuỗi kết nối từ file .env
    const conn = await mongoose.connect(process.env.Mongodb_auth);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;