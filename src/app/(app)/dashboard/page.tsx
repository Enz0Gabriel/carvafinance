import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

/** Placeholder until the dashboard is built (Task 13). */
export default function DashboardPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
    </main>
  );
}
