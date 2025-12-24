import redisClient from "../config/redis.js";

const redisRateLimit = ({ windowMs, max, keyPrefix = "rate-limit" }) => {
  return async (req, res, next) => {
    try {
      // Lấy identifier: ưu tiên user ID, fallback về IP, cuối cùng là 'unknown'
      const identifier = req.user?.id || req.ip || "unknown";
      const key = `${keyPrefix}:${identifier}`;

      const current = await redisClient.incr(key);

      if (current === 1) {
        await redisClient.pexpire(key, windowMs);
      }

      // Lấy thời gian còn lại để thông báo cho user (tùy chọn)
      const ttl = await redisClient.pttl(key);

      if (current > max) {
        return res.status(429).json({
          message: "Quá nhiều yêu cầu, vui lòng thử lại sau.",
          retryAfter: Math.ceil(ttl / 1000) + "s",
        });
      }

      // Gắn headers vào response để client biết giới hạn (chuẩn HTTP)
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, max - current));

      next();
    } catch (err) {
      console.error("Rate limit error:", err);
      next();
    }
  };
};

export default redisRateLimit;
