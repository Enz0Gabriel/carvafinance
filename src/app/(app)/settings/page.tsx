import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { SettingsView } from "@/features/settings/components/settings-view";
import { auth } from "@/server/auth";

export const metadata: Metadata = { title: "Configurações" };

async function Settings() {
  const session = await auth.api.getSession({ headers: await headers() });
  return <SettingsView name={session?.user.name ?? ""} />;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <Settings />
    </Suspense>
  );
}
