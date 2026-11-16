import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInEmail = vi.fn();
vi.mock("@/shared/lib/auth-client", () => ({
  authClient: {
    signIn: { email: (...args: unknown[]) => signInEmail(...args) },
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const { LoginForm } = await import("./login-form");
const { DEMO_CREDENTIALS } = await import("../demo");

describe("LoginForm", () => {
  beforeEach(() => signInEmail.mockReset().mockResolvedValue({ error: null }));

  it("shows validation messages for an empty submit", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(
      await screen.findByText("Informe um e-mail válido"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("A senha deve ter pelo menos 8 caracteres"),
    ).toBeInTheDocument();
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("signs in with the demo credentials", async () => {
    render(<LoginForm />);
    await userEvent.click(
      screen.getByRole("button", { name: "Entrar como demo" }),
    );
    expect(signInEmail).toHaveBeenCalledWith(DEMO_CREDENTIALS);
  });
});
