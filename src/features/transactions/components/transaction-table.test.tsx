import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TransactionDTO } from "../schemas";
import { TransactionTable } from "./transaction-table";

const base = {
  date: "2026-11-10",
  description: "",
  account: { id: "w", name: "Carteira", color: "#000000" },
  toAccount: null,
  category: null,
};

const income: TransactionDTO = {
  ...base,
  id: "1",
  type: "INCOME",
  amountCents: 10000,
  description: "Salário",
  category: { id: "s", name: "Salário", color: "#43a047", icon: "briefcase" },
};
const transfer: TransactionDTO = {
  ...base,
  id: "2",
  type: "TRANSFER",
  amountCents: 5000,
  toAccount: { id: "p", name: "Poupança", color: "#000000" },
};

describe("TransactionTable", () => {
  it("renders signed income and transfer routes", () => {
    render(
      <TransactionTable
        items={[income, transfer]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(/\+R\$\s100,00/)).toBeInTheDocument();
    expect(screen.getByText("Carteira → Poupança")).toBeInTheDocument();
  });

  it("asks for confirmation before deleting", async () => {
    const onDelete = vi.fn();
    render(
      <TransactionTable
        items={[income]}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Ações do lançamento" }),
    );
    await userEvent.click(
      await screen.findByRole("menuitem", { name: /Excluir/ }),
    );
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(
      await screen.findByRole("button", { name: "Excluir" }),
    );
    expect(onDelete).toHaveBeenCalledWith("1");
  });
});
