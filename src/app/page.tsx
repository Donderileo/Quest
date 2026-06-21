import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center gap-8 bg-primary px-6 py-16 text-center text-primary-foreground">
        <div className="flex size-20 items-center justify-center rounded-[1.75rem] bg-primary-foreground">
          <svg viewBox="0 0 80 80" className="size-12" aria-hidden>
            <path
              d="M28 44 L40 32 L52 44 L52 56 L28 56 Z"
              fill="none"
              stroke="#4a7c59"
              strokeWidth="6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight">Tend</h1>
          <p className="mx-auto max-w-xs leading-relaxed text-primary-foreground/85">
            A rotina da casa, compartilhada. Organize tarefas por ambiente e
            divida com quem mora com você.
          </p>
        </div>
      </section>

      {/* Ações */}
      <section className="space-y-3 px-6 py-8">
        <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          Criar conta
        </Link>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
        >
          Entrar
        </Link>
      </section>
    </main>
  );
}
