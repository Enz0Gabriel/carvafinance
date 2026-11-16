import { randomUUID } from "node:crypto";
import { db } from "@/server/db";

/** Empties every table touched by tests (auth tables are appended in Task 6). */
export async function resetDb(): Promise<void> {
  await db.$executeRaw`TRUNCATE TABLE "transactions", "categories", "accounts", "user" RESTART IDENTITY CASCADE`;
}

export async function createUser(
  email = `${randomUUID()}@test.dev`,
): Promise<{ id: string }> {
  return db.user.create({
    data: { id: randomUUID(), name: "Test User", email },
    select: { id: true },
  });
}
