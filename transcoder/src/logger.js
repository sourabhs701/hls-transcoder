import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export async function publishLog(PROJECT_ID, log) {
  redis.publish(`logs:${PROJECT_ID}`, JSON.stringify({ log }));
}
