"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createHome } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

export default function NewHomePage() {
  const [state, action, pending] = useActionState(createHome, null);

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/homes" className="text-muted-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">Nova casa</h1>
      </div>

      <form action={action} className="space-y-6">
        <FormField
          label="Nome da casa"
          error={typeof state?.error === "string" ? state.error : undefined}
        >
          <Input
            name="name"
            type="text"
            placeholder="ex: Casa da família Silva"
            autoFocus
            required
          />
        </FormField>

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Criando…" : "Criar casa"}
        </Button>
      </form>
    </div>
  );
}
