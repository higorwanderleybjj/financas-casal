"use client";

import { useState } from "react";
import { formatarLinha } from "@/lib/boleto";

/** Mostra a linha digitável e copia, para colar no app do banco e pagar. */
export function CopiarLinha({ linha }: { linha: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="space-y-2 rounded-xl border border-black/10 p-3 text-sm dark:border-white/15">
      <p className="break-all font-mono text-xs">{formatarLinha(linha)}</p>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(linha);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          } catch {
            /* sem permissão para copiar: o texto acima continua selecionável */
          }
        }}
        className="rounded-lg border border-black/15 px-3 py-1 dark:border-white/20"
      >
        {copiado ? "Copiado!" : "Copiar linha digitável"}
      </button>
    </div>
  );
}
