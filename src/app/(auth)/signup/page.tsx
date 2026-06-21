"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signUp, null);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
        <p className="text-sm text-muted-foreground">
          Comece a organizar a rotina da sua casa.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <FormField label="Nome">
          <Input
            name="name"
            type="text"
            placeholder="Seu nome"
            autoComplete="name"
            required
          />
        </FormField>

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
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            required
          />
        </FormField>

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Criando conta…" : "Criar conta"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
