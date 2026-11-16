import "dotenv/config";
import { execSync } from "node:child_process";

/** Applies pending migrations to the integration test database once per run (tests truncate data themselves). */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set (see .env.example).");
  }
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url },
  });
}
