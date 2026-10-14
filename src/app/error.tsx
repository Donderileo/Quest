"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-3xl font-extrabold">Algo deu errado</h1>
      <p className="max-w-xs text-muted-foreground">
        Não foi culpa sua. Tente de novo em instantes.
      </p>
      <button onClick={reset} className="press mt-2 font-semibold text-primary">
        Tentar de novo
      </button>
    </main>
  );
}
