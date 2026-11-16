import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryReport } from "./category-report";

describe("CategoryReport", () => {
  it("shows a dash when a category has no previous value", () => {
    render(
      <CategoryReport
        rows={[
          {
            categoryId: "f",
            name: "Alimentação",
            color: "#000000",
            parentId: null,
            totalCents: 1000,
            previousCents: 0,
            changePct: null,
            share: 100,
          },
        ]}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("100,0%")).toBeInTheDocument();
  });
});
