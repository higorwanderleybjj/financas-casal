"use client";

import { useActionState } from "react";
import { entrar } from "./actions";

export default function LoginPage() {
  const [estado, acao, pendente] = useActionState(entrar, undefined);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        action={acao}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-black/10 p-6 shadow-sm dark:border-white/15"
      >
        <h1 className="text-2xl font-semibold">Finanças do casal</h1>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="E-mail"
          className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
        <input
          name="senha"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Senha"
          className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
        {estado?.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
        <button
          disabled={pendente}
          className="w-full rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white disabled:opacity-60"
        >
          {pendente ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
