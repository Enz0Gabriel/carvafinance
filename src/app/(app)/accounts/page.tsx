import type { Metadata } from "next";
import { AccountList } from "@/features/accounts/components/account-list";

export const metadata: Metadata = { title: "Contas" };

export default function AccountsPage() {
  return <AccountList />;
}
