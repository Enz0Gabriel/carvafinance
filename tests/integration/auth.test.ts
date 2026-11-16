import { beforeEach, describe, expect, it } from "vitest";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { resetDb } from "./helpers";

describe("sign up", () => {
  beforeEach(resetDb);

  it("creates the default categories for a new user", async () => {
    const { user } = await auth.api.signUpEmail({
      body: { name: "Ana", email: "ana@x.dev", password: "senha1234" },
    });

    const categories = await db.category.findMany({
      where: { userId: user.id },
    });
    expect(categories).toHaveLength(12);
    expect(categories.filter((c) => c.kind === "EXPENSE")).toHaveLength(8);
    expect(categories.filter((c) => c.kind === "INCOME")).toHaveLength(4);
  });

  it("stores a hashed password, never the plain text", async () => {
    const { user } = await auth.api.signUpEmail({
      body: { name: "Bia", email: "bia@x.dev", password: "senha1234" },
    });
    const credential = await db.authAccount.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(credential.password).toBeTruthy();
    expect(credential.password).not.toContain("senha1234");
  });
});
