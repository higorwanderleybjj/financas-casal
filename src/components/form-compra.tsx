"use client";

import { useActionState, useState } from "react";
import { criarCompra } from "@/app/(app)/cartoes/actions";
import { brl, parseValor } from "@/lib/format";

type Categoria = { id: string; nome: string };

const campo =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export function FormCompra({
  cartaoId,
  categorias,
  hoje,
}: {
  cartaoId: string;
  categorias: Categoria[];
  hoje: string;
}) {
  const [estado, acao, pendente] = useActionState(criarCompra, undefined);
  const [valor, setValor] = useState("");
  const [parcelas, setParcelas] = useState(1);

  const total = parseValor(valor);
  const porParcela = total > 0 ? total / parcelas : 0;

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="cartao_id" value={cartaoId} />

      <label className="block space-y-1 text-sm">
        Valor total (R$)
        <input
          name="valor"
          inputMode="decimal"
          required
          autoFocus
          placeholder="0,00"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className={`${campo} text-2xl font-semibold`}
        />
      </label>

      <label className="block space-y-1 text-sm">
        Descrição
        <input name="descricao" placeholder="Ex: Geladeira" className={campo} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1 text-sm">
          Data da compra
          <input type="date" name="data" required defaultValue={hoje} className={campo} />
        </label>
        <label className="block space-y-1 text-sm">
          Parcelas
          <input
            type="number"
            name="parcelas"
            min={1}
            max={48}
            value={parcelas}
            onChange={(e) => setParcelas(Math.max(1, Number(e.target.value) || 1))}
            className={campo}
          />
        </label>
      </div>

      {parcelas > 1 && porParcela > 0 && (
        <p className="text-sm opacity-70">
          {parcelas}x de aproximadamente {brl(porParcela)}
        </p>
      )}

      <label className="block space-y-1 text-sm">
        Categoria
        <select name="categoria_id" className={campo}>
          <option value="">Sem categoria</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>

      {estado?.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <button
        disabled={pendente}
        className="w-full rounded-lg bg-emerald-600 px-3 py-3 font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Salvando..." : "Lançar compra"}
      </button>
    </form>
  );
}
