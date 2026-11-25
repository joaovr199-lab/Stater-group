import { requireUser } from "@/lib/auth";
import { changePasswordAction } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/forms";

export default async function SenhaPage() {
  const u = await requireUser();
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold">{u.must_change_password ? "Defina sua senha" : "Alterar senha"}</h1>
        <p className="mt-1 text-sm text-muted">
          {u.must_change_password ? "Por segurança, substitua a senha provisória antes de continuar." : "Outras sessões abertas serão encerradas."}
        </p>
        <ActionForm action={changePasswordAction} className="mt-6 space-y-4">
          <label className="block">
            <span className="label">Nova senha (mín. 10 caracteres, letras e números)</span>
            <input className="field" type="password" name="password" autoComplete="new-password" minLength={10} required />
          </label>
          <label className="block">
            <span className="label">Confirmar</span>
            <input className="field" type="password" name="confirm" autoComplete="new-password" required />
          </label>
          <Submit className="btn btn-primary w-full">Salvar senha</Submit>
        </ActionForm>
      </div>
    </main>
  );
}
