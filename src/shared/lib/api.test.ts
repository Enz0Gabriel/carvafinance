import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, toQuery } from "./api";

const respond = (status: number, body?: unknown) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
      }),
    );

describe("apiFetch", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns parsed JSON and sends JSON bodies", async () => {
    const fetchMock = respond(201, { id: "1" });
    await expect(
      apiFetch("/api/x", { method: "POST", json: { a: 1 } }),
    ).resolves.toEqual({ id: "1" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.body).toBe('{"a":1}');
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("throws ApiError with the server code and status", async () => {
    respond(404, {
      error: { code: "NOT_FOUND", message: "Conta não encontrado(a)." },
    });
    await expect(apiFetch("/api/x")).rejects.toMatchObject({
      name: "ApiError",
      code: "NOT_FOUND",
      status: 404,
      message: "Conta não encontrado(a).",
    });
  });

  it("falls back to a generic error when the body is not JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("oops", { status: 502 }),
    );
    const error = await apiFetch("/api/x").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "UNKNOWN_ERROR", status: 502 });
  });

  it("returns undefined for 204", async () => {
    respond(204);
    await expect(
      apiFetch("/api/x", { method: "DELETE" }),
    ).resolves.toBeUndefined();
  });
});

describe("toQuery", () => {
  it("skips empty values", () => {
    expect(toQuery({ from: "2026-11-01", q: "", page: 2, x: undefined })).toBe(
      "?from=2026-11-01&page=2",
    );
    expect(toQuery({})).toBe("");
  });
});
