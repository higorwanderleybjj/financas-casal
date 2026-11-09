"use client";

import { useState } from "react";
import { formatarLinha } from "@/lib/boleto";

/** Copia a linha digitável, para colar no app do banco e pagar. Compacto: só o botão; senão mostra a linha também. */
export function CopiarLinha({ linha, compacto = false }: { linha: string; compacto?: boolean }) {
  const [copiado, setCopiado] = useState(false);

  const botao = (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(linha);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          /* sem permissão para copiar: a linha continua selecionável na página do lançamento */
        }
      }}
      className="rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20"
    >
      {copiado ? "Copiado!" : "Copiar linha digitável"}
    </button>
  );
  if (compacto) return botao;

  return (
    <div className="space-y-2 rounded-xl border border-black/10 p-3 text-sm dark:border-white/15">
      <p className="break-all font-mono text-xs">{formatarLinha(linha)}</p>
      {botao}
    </div>
  );
}
