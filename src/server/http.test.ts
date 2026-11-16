import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const getSessionUserId = vi.fn<(headers: Headers) => Promise<string | null>>();
vi.mock("./auth", () => ({
  getSessionUserId: (h: Headers) => getSessionUserId(h),
}));

const { AppError, withAuth, ok } = await import("./http");

const call = (handler: Parameters<typeof withAuth>[0]) =>
  withAuth(handler)(new Request("http://localhost/api/x"), {
    params: Promise.resolve({}),
  });

describe("withAuth", () => {
  beforeEach(() => getSessionUserId.mockReset());

  it("returns 401 without a session", async () => {
    getSessionUserId.mockResolvedValue(null);
    const res = await call(async () => ok({}));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "Faça login para continuar." },
    });
  });

  it("passes the session user id to the handler", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    const res = await call(async (_req, { userId }) => ok({ userId }));
    expect(await res.json()).toEqual({ userId: "user-1" });
  });

  it("maps AppError to its status", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    const res = await call(async () => {
      throw new AppError("NOT_FOUND", 404, "Conta não encontrada.");
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Conta não encontrada." },
    });
  });

  it("maps ZodError to 400 VALIDATION_ERROR", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    const res = await call(async () => {
      z.object({ name: z.string() }).parse({});
      return ok({});
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("maps SyntaxError from malformed JSON to 400 INVALID_JSON", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    const res = await withAuth(async (req) => ok(await req.json()))(
      new Request("http://localhost/api/x", {
        method: "POST",
        body: "{invalid",
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: "INVALID_JSON", message: "JSON inválido." },
    });
  });

  it("hides unexpected errors behind a generic 500", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call(async () => {
      throw new Error("boom");
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Erro interno. Tente novamente.",
      },
    });
    expect(JSON.stringify(body)).not.toContain("boom");
  });
});
