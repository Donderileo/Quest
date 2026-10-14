import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-3xl font-extrabold">Não encontramos isso</h1>
      <p className="max-w-xs text-muted-foreground">
        Essa página não existe ou você não tem acesso a ela.
      </p>
      <Link href="/homes" className="press mt-2 font-semibold text-primary">
        Voltar para a casa
      </Link>
    </main>
  );
}
