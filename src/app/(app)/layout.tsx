import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { auth } from "@/server/auth";

/** Server-side session check; everything below it renders only for signed-in users. */
async function SessionGate({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return children;
}

/** Temporary authenticated layout (replaced by the full app shell in Task 10). */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <SessionGate>{children}</SessionGate>
      </Suspense>
    </div>
  );
}
