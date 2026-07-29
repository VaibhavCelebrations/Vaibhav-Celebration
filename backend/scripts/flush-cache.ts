import { config as loadDotenv } from "dotenv";
import path from "path";
import { delPattern, getRedisClient } from "../src/lib/redis";

loadDotenv({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const client = getRedisClient();
  if (client) {
    try {
      await client.connect();
    } catch {
      // already connected
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  await delPattern("pub:*");
  await delPattern("adm:*");
  console.log("Redis pub/adm cache flushed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
