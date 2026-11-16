import Image from "next/image";
import { Toaster } from "@/shared/components/ui/sonner";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="bg-muted/40 flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <Image src="/logo.webp" alt="" width={44} height={44} priority />
          <span className="text-2xl font-semibold tracking-tight">
            CarvaFinance
          </span>
        </div>
        {children}
      </div>
      <Toaster richColors position="top-center" />
    </main>
  );
}
