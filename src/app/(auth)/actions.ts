"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const signupSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo de 8 caracteres"),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

// E-mail do cadastro em andamento: cookie httpOnly curto (nada de e-mail na URL).
const VERIFY_COOKIE = "tend_verify_email";

async function rememberEmail(email: string) {
  (await cookies()).set(VERIFY_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
}

export async function signUp(_prev: unknown, formData: FormData) {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
    },
  });

  if (error) return { error: error.message };

  // com "Confirm email" ligado o Supabase envia o código de 6 dígitos
  await rememberEmail(parsed.data.email);
  redirect("/verify");
}

export async function signIn(_prev: unknown, formData: FormData) {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      await rememberEmail(parsed.data.email);
      await supabase.auth.resend({ type: "signup", email: parsed.data.email });
      redirect("/verify");
    }
    return { error: error.message };
  }

  const requested = formData.get("next");
  // só caminhos internos: bloqueia open redirect ("//evil.com", "https://...")
  const next =
    typeof requested === "string" && /^\/(?![/\\])/.test(requested)
      ? requested
      : "/homes";
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/, "Digite os 6 dígitos") });

export async function verifyCode(_prev: unknown, formData: FormData) {
  const parsed = codeSchema.safeParse({ code: String(formData.get("code") ?? "").replace(/\s/g, "") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const jar = await cookies();
  const email = jar.get(VERIFY_COOKIE)?.value;
  if (!email) redirect("/signup");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: parsed.data.code, type: "signup" });
  if (error) return { error: "Código inválido ou expirado. Peça um novo." };

  jar.delete(VERIFY_COOKIE);
  redirect("/homes"); // o layout encaminha quem ainda não foi aprovado para /pending
}

export async function resendCode() {
  const email = (await cookies()).get(VERIFY_COOKIE)?.value;
  if (!email) redirect("/signup");

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) return { error: "Aguarde um instante antes de pedir outro código." };
  return { ok: "Enviamos um novo código." };
}
