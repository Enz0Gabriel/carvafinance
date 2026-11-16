import { ZodError, z } from "zod";
import { getSessionUserId } from "./auth";

export type ErrorStatus = 400 | 401 | 404 | 409;

/** Expected, user-facing API error. Anything else becomes a generic 500. */
export class AppError extends Error {
  constructor(
    public code: string,
    public status: ErrorStatus,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (entity: string) =>
  new AppError("NOT_FOUND", 404, `${entity} não encontrado(a).`);

export const conflict = (code: string, message: string) =>
  new AppError(code, 409, message);

export const badRequest = (code: string, message: string, details?: unknown) =>
  new AppError(code, 400, message, details);

export function ok<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return Response.json(
    {
      error:
        details === undefined ? { code, message } : { code, message, details },
    },
    { status },
  );
}

type RouteContext<P> = { params: Promise<P> };
type AuthedHandler<P> = (
  req: Request,
  ctx: { userId: string; params: P },
) => Promise<Response>;

/** Wraps a Route Handler with session check and uniform error responses. */
export function withAuth<P = Record<string, never>>(handler: AuthedHandler<P>) {
  return async (req: Request, ctx: RouteContext<P>): Promise<Response> => {
    try {
      const userId = await getSessionUserId(req.headers);
      if (!userId) {
        return errorResponse(401, "UNAUTHORIZED", "Faça login para continuar.");
      }
      return await handler(req, { userId, params: await ctx.params });
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(
          error.status,
          error.code,
          error.message,
          error.details,
        );
      }
      if (error instanceof ZodError) {
        return errorResponse(
          400,
          "VALIDATION_ERROR",
          "Dados inválidos.",
          z.flattenError(error),
        );
      }
      console.error(error);
      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "Erro interno. Tente novamente.",
      );
    }
  };
}
