import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CategoryDTO } from "../schemas";
import { CategoryForm } from "./category-form";

const cat = (
  id: string,
  kind: CategoryDTO["kind"],
  parentId: string | null = null,
): CategoryDTO => ({
  id,
  name: id,
  kind,
  color: "#000000",
  icon: "tag",
  archived: false,
  parentId,
  children: [],
});

describe("CategoryForm", () => {
  it("offers only top-level categories of the same kind as parents", async () => {
    const parents = [
      cat("Alimentação", "EXPENSE"),
      cat("Salário", "INCOME"),
      cat("Restaurantes", "EXPENSE", "Alimentação"),
    ];
    render(
      <CategoryForm kind="EXPENSE" parents={parents} onSubmit={vi.fn()} />,
    );
    await userEvent.click(screen.getByLabelText("Categoria pai (opcional)"));
    const options = (await screen.findAllByRole("option")).map(
      (o) => o.textContent,
    );
    expect(options).toEqual(["Nenhuma", "Alimentação"]);
  });

  it("submits kind, icon and a null parent by default", async () => {
    const onSubmit = vi.fn();
    render(<CategoryForm kind="INCOME" parents={[]} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Nome"), "Bônus");
    await userEvent.click(screen.getByRole("radio", { name: "gift" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Salvar categoria" }),
    );
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Bônus",
        kind: "INCOME",
        icon: "gift",
        parentId: null,
      }),
      expect.anything(),
    );
  });
});
