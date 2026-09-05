import IORedis from "ioredis";

// Shared Redis connection for BullMQ, used both by the Next.js app (to enqueue
// jobs) and by the standalone worker process (src/worker/index.ts) that
// processes them. On Railway this points at the Redis plugin's REDIS_URL.
let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL env var is not set");
    connection = new IORedis(url, { maxRetriesPerRequest: null });
  }
  return connection;
}
