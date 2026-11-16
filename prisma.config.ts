import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `react-server` condition lets server-only modules load outside Next.js.
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  datasource: {
    // Optional here so `prisma generate` works without a database (Docker build, CI, fresh clone);
    // commands that touch the database still fail clearly when it is missing.
    url: process.env.DATABASE_URL ?? "",
  },
});
