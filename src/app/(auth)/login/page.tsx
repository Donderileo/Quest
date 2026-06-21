"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signIn } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
        <p className="text-sm text-muted-foreground">
          Bem-vindo de volta ao Tend.
        </p>
      </div>

      <form action={action} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}

        <FormField label="Email">
          <Input
            name="email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            required
          />
        </FormField>

        <FormField label="Senha">
          <Input
            name="password"
            type="password"
            placeholder="Sua senha"
            autoComplete="current-password"
            required
          />
        </FormField>

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
