"use client";

import { useActionState, useState } from "react";
import { salvarLancamento } from "@/app/(app)/lancamentos/actions";

type Categoria = { id: string; nome: string; tipo: "entrada" | "saida" };
type Inicial = {
  id?: string;
  tipo: "entrada" | "saida";
  valor?: string;
  data: string;
  descricao?: string;
  categoria_id?: string | null;
  pago: boolean;
};

const campo =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export function FormLancamento({
  categorias,
  inicial,
}: {
  categorias: Categoria[];
  inicial: Inicial;
}) {
  const [estado, acao, pendente] = useActionState(salvarLancamento, undefined);
  const [tipo, setTipo] = useState(inicial.tipo);

  return (
    <form action={acao} className="space-y-4">
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <input type="hidden" name="tipo" value={tipo} />

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-black/10 p-1 dark:border-white/15">
        {(["saida", "entrada"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`rounded-lg py-2 text-sm font-medium ${
              tipo === t
                ? t === "saida"
                  ? "bg-red-600 text-white"
                  : "bg-emerald-600 text-white"
                : "opacity-60"
            }`}
          >
            {t === "saida" ? "Saída" : "Entrada"}
          </button>
        ))}
      </div>

      <label className="block space-y-1 text-sm">
        Valor (R$)
        <input
          name="valor"
          inputMode="decimal"
          required
          autoFocus
          placeholder="0,00"
          defaultValue={inicial.valor}
          className={`${campo} text-2xl font-semibold`}
        />
      </label>

      <label className="block space-y-1 text-sm">
        Descrição
        <input
          name="descricao"
          defaultValue={inicial.descricao}
          placeholder="Ex: mercado da semana"
          className={campo}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1 text-sm">
          Data
          <input
            type="date"
            name="data"
            required
            defaultValue={inicial.data}
            className={campo}
          />
        </label>
        <label className="block space-y-1 text-sm">
          Categoria
          <select
            name="categoria_id"
            defaultValue={inicial.categoria_id ?? ""}
            className={campo}
          >
            <option value="">Sem categoria</option>
            {categorias
              .filter((c) => c.tipo === tipo)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="pago"
          defaultChecked={inicial.pago}
          className="size-4"
        />
        {tipo === "saida" ? "Já foi pago" : "Já foi recebido"}
      </label>

      {estado?.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <button
        disabled={pendente}
        className="w-full rounded-lg bg-emerald-600 px-3 py-3 font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
