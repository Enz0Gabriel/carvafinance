import { getDashboard } from "@/server/services/dashboard.service";
import { ok, withAuth } from "@/server/http";
import { parseRangeQuery } from "@/server/range-query";

export const GET = withAuth(async (req, { userId }) =>
  ok(await getDashboard(userId, parseRangeQuery(req))),
);
