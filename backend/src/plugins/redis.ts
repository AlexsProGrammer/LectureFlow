import "dotenv/config";
import Redis from "ioredis";

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = process.env.REDIS_PORT || "6379";
const redis = new Redis(process.env.REDIS_URL || `redis://${redisHost}:${redisPort}`);

redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

export { redis };
