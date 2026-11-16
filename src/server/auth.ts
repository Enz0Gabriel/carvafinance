import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import { env } from "./env";
import { createDefaultCategories } from "./services/default-categories";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins:
    process.env.NODE_ENV !== "production"
      ? [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:3001",
        ]
      : undefined,
  database: prismaAdapter(db, { provider: "postgresql" }),
  account: { modelName: "authAccount" },
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  rateLimit: { enabled: true, window: 60, max: 10, storage: "database" },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await createDefaultCategories(user.id);
        },
      },
    },
  },
  plugins: [nextCookies()],
});

/** Authenticated user id for the request, or null when there is no valid session. */
export async function getSessionUserId(
  headers: Headers,
): Promise<string | null> {
  const session = await auth.api.getSession({ headers });
  return session?.user.id ?? null;
}
