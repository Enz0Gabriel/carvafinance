import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { MoneyInput } from "./money-input";

function Harness({ onChange }: { onChange: (cents: number | null) => void }) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <MoneyInput
      aria-label="Valor"
      value={value}
      onChange={(cents) => {
        setValue(cents);
        onChange(cents);
      }}
    />
  );
}

describe("MoneyInput", () => {
  it("reports cents for pt-BR input and formats on blur", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByLabelText("Valor");
    await userEvent.type(input, "1.234,56");
    expect(onChange).toHaveBeenLastCalledWith(123456);
    await userEvent.tab();
    expect(input).toHaveValue("1.234,56");
  });

  it("reports null for invalid input", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Valor"), "abc");
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
