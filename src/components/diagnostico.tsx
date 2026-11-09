"use client";

import { useState } from "react";

type Medida = { nome: string; dica: string; tempos: number[]; kb: number; erro?: string };

const mediana = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

async function medir(url: string, opcoes: RequestInit = {}, vezes = 3): Promise<{ tempos: number[]; kb: number; erro?: string }> {
  const tempos: number[] = [];
  let kb = 0;
  try {
    for (let i = 0; i < vezes; i++) {
      const sep = url.includes("?") ? "&" : "?";
      const t0 = performance.now();
      const r = await fetch(`${url}${sep}_t=${Date.now()}`, { cache: "no-store", credentials: "same-origin", ...opcoes });
      const corpo = await r.arrayBuffer();
      tempos.push(Math.round(performance.now() - t0));
      kb = Math.round(corpo.byteLength / 1024);
    }
    return { tempos, kb };
  } catch {
    return { tempos, kb, erro: "não foi possível medir (bloqueado ou sem rede)" };
  }
}

/** Mede, do próprio aparelho, onde está a demora: rede até a Vercel, servidor, banco e abertura da página. */
export function Diagnostico() {
  const [rodando, setRodando] = useState(false);
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [aparelho, setAparelho] = useState<string[]>([]);
  const [copiado, setCopiado] = useState(false);

  async function rodar() {
    setRodando(true);
    setMedidas([]);
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const conexao = (navigator as Navigator & { connection?: { effectiveType?: string; rtt?: number; downlink?: number; saveData?: boolean } }).connection;
    setAparelho([
      `App instalado (tela cheia): ${window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone ? "sim" : "não, está no navegador"}`,
      `Rede: ${conexao ? `${conexao.effectiveType ?? "?"}, latência ${conexao.rtt ?? "?"} ms, ${conexao.downlink ?? "?"} Mb/s${conexao.saveData ? ", economia de dados LIGADA" : ""}` : "o aparelho não informa (iPhone)"}`,
      `Núcleos do processador: ${navigator.hardwareConcurrency ?? "?"}`,
      nav ? `Esta página abriu em: resposta ${Math.round(nav.responseStart)} ms, pronta ${Math.round(nav.domInteractive)} ms, completa ${Math.round(nav.loadEventEnd || nav.duration)} ms` : "",
    ].filter(Boolean));

    const testes: { nome: string; dica: string; url: string; opcoes?: RequestInit }[] = [
      { nome: "Rede até a Vercel", dica: "arquivo estático: é só a ida e volta do aparelho até o servidor", url: "/manifest.webmanifest" },
      { nome: "Tela inicial", dica: "servidor + banco de dados (a tela mais pesada)", url: "/" },
      { nome: "Boletos a pagar", dica: "servidor + banco + links do arquivo", url: "/boletos" },
      { nome: "Lançar boleto", dica: "servidor + banco", url: "/lancamentos/boleto" },
      {
        nome: "Banco de dados direto (Supabase)",
        dica: "do aparelho até o Supabase, sem passar pela Vercel",
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`,
        opcoes: { credentials: "omit", headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "" } },
      },
    ];
    for (const t of testes) {
      const r = await medir(t.url, t.opcoes);
      setMedidas((m) => [...m, { nome: t.nome, dica: t.dica, ...r }]);
    }
    setRodando(false);
  }

  const texto = [
    ...aparelho,
    ...medidas.map((m) => `${m.nome}: ${m.erro ?? `${m.tempos.join(" / ")} ms (${m.kb} KB)`}`),
  ].join("\n");

  return (
    <div className="space-y-4">
      <p className="text-sm opacity-70">
        Toque em <strong>Medir agora</strong> com o celular na rede em que o app fica lento. Leva uns 10 segundos. Depois toque em
        copiar e me mande o resultado.
      </p>
      <button onClick={rodar} disabled={rodando} className="w-full rounded-lg bg-emerald-600 px-3 py-3 font-medium text-white disabled:opacity-60">
        {rodando ? "Medindo..." : medidas.length ? "Medir de novo" : "Medir agora"}
      </button>

      {aparelho.length > 0 && (
        <ul className="space-y-1 rounded-2xl border border-black/10 p-3 text-xs dark:border-white/15">
          {aparelho.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}

      <ul className="space-y-2">
        {medidas.map((m) => {
          const med = m.tempos.length ? mediana(m.tempos) : 0;
          const cor = m.erro ? "text-red-600" : med < 400 ? "text-emerald-600" : med < 1000 ? "text-amber-600" : "text-red-600";
          return (
            <li key={m.nome} className="rounded-2xl border border-black/10 p-3 dark:border-white/15">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">{m.nome}</p>
                <p className={`text-lg font-semibold ${cor}`}>{m.erro ? "erro" : `${med} ms`}</p>
              </div>
              <p className="text-xs opacity-60">{m.dica}</p>
              {!m.erro && <p className="text-xs opacity-60">3 medidas: {m.tempos.join(" / ")} ms · {m.kb} KB</p>}
            </li>
          );
        })}
      </ul>

      {medidas.length > 0 && !rodando && (
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(texto);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            } catch {
              /* sem permissão para copiar: o resultado continua na tela */
            }
          }}
          className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20"
        >
          {copiado ? "Copiado!" : "Copiar o resultado"}
        </button>
      )}
    </div>
  );
}
