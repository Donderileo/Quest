"use client";

import { useActionState } from "react";
import { resendCode, verifyCode } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

export default function VerifyPage() {
  const [state, action, pending] = useActionState(verifyCode, null);
  const [resent, resend, resending] = useActionState(resendCode, null);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Confirme seu e-mail</h1>
        <p className="text-sm text-muted-foreground">
          Enviamos um código de 6 dígitos para o seu e-mail. Digite-o abaixo.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <FormField label="Código">
          <Input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            placeholder="000000"
            className="text-center text-2xl font-bold tracking-[0.4em]"
            required
            autoFocus
          />
        </FormField>

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Verificando…" : "Confirmar"}
        </Button>
      </form>

      <form action={resend} className="text-center text-sm text-muted-foreground">
        <button type="submit" disabled={resending} className="press font-medium text-primary">
          Não chegou? Enviar novo código
        </button>
        {resent?.ok && <p className="mt-2">{resent.ok}</p>}
        {resent?.error && <p className="mt-2 text-destructive">{resent.error}</p>}
      </form>
    </div>
  );
}
