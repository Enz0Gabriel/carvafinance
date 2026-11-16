import { describe, expect, it } from "vitest";
import { transactionFiltersSchema, transactionInputSchema } from "./schemas";

const transfer = {
  type: "TRANSFER",
  amountCents: 100,
  date: "2026-11-10",
  accountId: "a",
  toAccountId: "b",
};

const issuesOf = (input: unknown) =>
  transactionInputSchema
    .safeParse(input)
    .error?.issues.map((i) => ({ path: i.path.join("."), message: i.message }));

describe("transactionInputSchema", () => {
  it("accepts a valid transfer and defaults the description", () => {
    expect(transactionInputSchema.parse(transfer)).toMatchObject({
      description: "",
    });
  });

  it("rejects a transfer between the same account at toAccountId", () => {
    expect(issuesOf({ ...transfer, toAccountId: "a" })).toEqual([
      { path: "toAccountId", message: "Escolha contas diferentes" },
    ]);
  });

  it("rejects zero and fractional amounts", () => {
    expect(issuesOf({ ...transfer, amountCents: 0 })?.[0].message).toBe(
      "Informe um valor maior que zero",
    );
    expect(
      transactionInputSchema.safeParse({ ...transfer, amountCents: 10.5 })
        .success,
    ).toBe(false);
  });

  it("rejects nonexistent dates", () => {
    expect(issuesOf({ ...transfer, date: "2026-02-30" })?.[0]).toMatchObject({
      path: "date",
    });
  });

  it("requires a category for expenses", () => {
    expect(
      transactionInputSchema.safeParse({
        type: "EXPENSE",
        amountCents: 100,
        date: "2026-11-10",
        accountId: "a",
      }).success,
    ).toBe(false);
  });
});

describe("transactionFiltersSchema", () => {
  it("applies defaults and coerces paging", () => {
    expect(transactionFiltersSchema.parse({ page: "3" })).toMatchObject({
      page: 3,
      pageSize: 20,
      sort: "date_desc",
    });
  });

  it("rejects inverted ranges and oversized pages", () => {
    expect(
      transactionFiltersSchema.safeParse({
        from: "2026-11-30",
        to: "2026-11-01",
      }).success,
    ).toBe(false);
    expect(
      transactionFiltersSchema.safeParse({ pageSize: "500" }).success,
    ).toBe(false);
  });
});
