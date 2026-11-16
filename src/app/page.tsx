import Image from "next/image";

export default function Home() {
  return (
    <main className="bg-background flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <Image src="/logo.webp" alt="" width={96} height={96} priority />
      <div className="flex flex-col gap-2">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">
          CarvaFinance
        </h1>
        <p className="text-muted-foreground max-w-md text-lg">
          Gerencie receitas, despesas, transferências e categorias em um só
          lugar.
        </p>
      </div>
    </main>
  );
}
