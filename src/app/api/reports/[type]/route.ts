import { z } from "zod";
import { CATEGORY_KINDS } from "@/features/categories/schemas";
import { REPORT_TYPES, type ReportType } from "@/features/reports/types";
import { transactionFiltersSchema } from "@/features/transactions/schemas";
import { notFound, ok, withAuth } from "@/server/http";
import { parseRangeQuery } from "@/server/range-query";
import {
  accountsReport,
  categoriesReport,
  exportTransactionsCsv,
  monthlyReport,
} from "@/server/services/reports.service";

const kindSchema = z.enum(CATEGORY_KINDS).default("EXPENSE");

export const GET = withAuth<{ type: string }>(
  async (req, { userId, params }) => {
    if (!REPORT_TYPES.includes(params.type as ReportType))
      throw notFound("Relatório");
    const query = Object.fromEntries(new URL(req.url).searchParams);

    switch (params.type as ReportType) {
      case "monthly":
        return ok(await monthlyReport(userId, parseRangeQuery(req)));
      case "categories":
        return ok(
          await categoriesReport(
            userId,
            parseRangeQuery(req),
            kindSchema.parse(query.kind),
          ),
        );
      case "accounts":
        return ok(await accountsReport(userId, parseRangeQuery(req)));
      case "export": {
        const range = parseRangeQuery(req);
        const filters = transactionFiltersSchema.parse(query);
        const csv = await exportTransactionsCsv(userId, filters);
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="carvafinance-${range.from}-a-${range.to}.csv"`,
            "Cache-Control": "no-store",
          },
        });
      }
    }
  },
);
