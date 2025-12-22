import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: "default",
  password: process.env.REDIS_PASSWORD,
  //tls: {rejectUnauthorized: false,},
});

redis.on("connect", () => {
  console.log("✅ Redis connected (ioredis)");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

export default redis;
