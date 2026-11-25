"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions";
import { Submit } from "@/components/forms";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="mt-8 space-y-4">
      <label className="block">
        <span className="label">E-mail</span>
        <input className="field" name="email" type="email" autoComplete="username" required />
      </label>
      <label className="block">
        <span className="label">Senha</span>
        <input className="field" name="password" type="password" autoComplete="current-password" required />
      </label>
      {state?.error && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{state.error}</p>}
      <Submit className="btn btn-primary w-full" pending="Entrando…">Entrar</Submit>
    </form>
  );
}
