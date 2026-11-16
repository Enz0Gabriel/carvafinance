import { z } from "zod";
import { isValidDate, isValidRange } from "@/domain/period";

/** `?from=YYYY-MM-DD&to=YYYY-MM-DD` query validation shared by dashboard and reports. */
export const rangeQuerySchema = z
  .object({
    from: z.string().refine(isValidDate, "Data inválida"),
    to: z.string().refine(isValidDate, "Data inválida"),
  })
  .refine(isValidRange, { message: "Período inválido", path: ["to"] });

export const parseRangeQuery = (req: Request) =>
  rangeQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
