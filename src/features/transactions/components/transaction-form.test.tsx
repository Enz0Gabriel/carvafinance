import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/accounts/hooks/use-accounts", () => ({
  useAccounts: () => ({
    data: [
      { id: "wallet", name: "Carteira" },
      { id: "savings", name: "Poupança" },
    ],
  }),
}));
vi.mock("@/features/categories/hooks/use-categories", () => ({
  useCategories: ({ kind }: { kind: string }) => ({
    data:
      kind === "INCOME"
        ? [{ id: "salary", name: "Salário", children: [] }]
        : [{ id: "food", name: "Alimentação", children: [] }],
  }),
}));

const { TransactionForm } = await import("./transaction-form");

const wrap = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>,
  );

async function choose(label: string, option: string) {
  await userEvent.click(screen.getByLabelText(label));
  await userEvent.click(await screen.findByRole("option", { name: option }));
}

describe("TransactionForm", () => {
  it("submits an expense in cents with today's date", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 15, 10));
    const onSubmit = vi.fn();
    wrap(<TransactionForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("Valor"), "45,90");
    await choose("Conta", "Carteira");
    await choose("Categoria", "Alimentação");
    await userEvent.click(
      screen.getByRole("button", { name: "Salvar lançamento" }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      type: "EXPENSE",
      amountCents: 4590,
      date: "2026-11-15",
      description: "",
      accountId: "wallet",
      categoryId: "food",
    });
    vi.useRealTimers();
  });

  it("blocks transfers between the same account", async () => {
    const onSubmit = vi.fn();
    wrap(<TransactionForm defaultType="TRANSFER" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Valor"), "10");
    await choose("Conta de origem", "Carteira");
    await choose("Conta de destino", "Carteira");
    await userEvent.click(
      screen.getByRole("button", { name: "Salvar lançamento" }),
    );

    expect(
      await screen.findByText("Escolha contas diferentes"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("switching to income resets the category and lists income categories", async () => {
    wrap(<TransactionForm onSubmit={vi.fn()} />);
    await choose("Categoria", "Alimentação");
    await userEvent.click(screen.getByRole("radio", { name: "Receita" }));

    const trigger = screen.getByLabelText("Categoria");
    expect(
      within(trigger).getByText("Selecione a categoria"),
    ).toBeInTheDocument();
    await userEvent.click(trigger);
    expect(
      (await screen.findAllByRole("option")).map((o) => o.textContent),
    ).toEqual(["Salário"]);
  });

  it("keeps archived account and category selectable when editing", () => {
    wrap(
      <TransactionForm
        transaction={{
          id: "tx-1",
          type: "EXPENSE",
          amountCents: 1500,
          date: "2026-11-10",
          description: "Antigo",
          account: { id: "old-acc", name: "Banco Antigo", color: "#000000" },
          toAccount: null,
          category: {
            id: "old-cat",
            name: "Categoria Antiga",
            color: "#000000",
            icon: "tag",
          },
        }}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Conta")).toHaveTextContent(
      "Banco Antigo (arquivada)",
    );
    expect(screen.getByLabelText("Categoria")).toHaveTextContent(
      "Categoria Antiga (arquivada)",
    );
  });
});
