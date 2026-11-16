import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/shared/components/layout/app-shell";
import {
  NewTransactionButton,
  TransactionDialogProvider,
} from "@/features/transactions/components/transaction-dialog";
import { auth } from "@/server/auth";

/** Validates the session on the server and renders the authenticated shell. */
async function AuthenticatedShell({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return (
    <TransactionDialogProvider>
      <AppShell
        user={{ name: session.user.name, email: session.user.email }}
        action={<NewTransactionButton />}
      >
        {children}
      </AppShell>
    </TransactionDialogProvider>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={null}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}
