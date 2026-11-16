import { beforeEach, describe, expect, it } from "vitest";
import { fromDbDate } from "@/domain/period";
import { DEMO_CREDENTIALS } from "@/features/auth/demo";
import { db } from "@/server/db";
import { seedDemo } from "@/server/services/demo-data";
import { resetDb } from "./helpers";

describe("seedDemo", () => {
  beforeEach(resetDb);

  it("creates the demo user with 6 months of data, once", async () => {
    const today = new Date(2026, 10, 15);
    expect(await seedDemo(today)).toEqual({ created: true });

    const user = await db.user.findUniqueOrThrow({
      where: { email: DEMO_CREDENTIALS.email },
    });
    expect(await db.account.count({ where: { userId: user.id } })).toBe(4);

    const txs = await db.transaction.findMany({ where: { userId: user.id } });
    expect(txs.length).toBeGreaterThan(80);
    const dates = txs.map((t) => fromDbDate(t.date));
    expect(dates.every((d) => d <= "2026-11-15")).toBe(true);
    for (const month of [
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ]) {
      const inMonth = txs.filter((t) => fromDbDate(t.date).startsWith(month));
      expect(inMonth.some((t) => t.type === "INCOME")).toBe(true);
      expect(inMonth.some((t) => t.type === "EXPENSE")).toBe(true);
    }

    expect(await seedDemo(today)).toEqual({ created: false });
    expect(await db.transaction.count({ where: { userId: user.id } })).toBe(
      txs.length,
    );
  });
});
