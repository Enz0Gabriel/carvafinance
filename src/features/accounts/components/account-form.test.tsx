import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountForm } from "./account-form";

describe("AccountForm", () => {
  it("submits the balance in cents", async () => {
    const onSubmit = vi.fn();
    render(<AccountForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Nome"), "Nubank");
    await userEvent.type(screen.getByLabelText("Saldo inicial"), "1.500,00");
    await userEvent.click(screen.getByRole("button", { name: "Salvar conta" }));
    expect(onSubmit).toHaveBeenCalledWith(
      {
        name: "Nubank",
        type: "CHECKING",
        initialBalanceCents: 150000,
        color: "#1E88E5",
      },
      expect.anything(),
    );
  });

  it("requires a name", async () => {
    const onSubmit = vi.fn();
    render(<AccountForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Salvar conta" }));
    expect(await screen.findByText("Informe um nome")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
