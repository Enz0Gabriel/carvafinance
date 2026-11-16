import {
  createAccount,
  listAccounts,
} from "@/server/services/accounts.service";
import { ok, withAuth } from "@/server/http";

export const GET = withAuth(async (req, { userId }) => {
  const includeArchived =
    new URL(req.url).searchParams.get("includeArchived") === "true";
  return ok(await listAccounts(userId, { includeArchived }));
});

export const POST = withAuth(async (req, { userId }) =>
  ok(await createAccount(userId, await req.json()), 201),
);
