import Link from "next/link";
import { getContextoCasal } from "@/lib/casal";
import { vencimentoDaCompra } from "@/lib/cartao";
import { brl, formatData, hoje } from "@/lib/format";
import { arquivarCartao, atualizarLimite, criarCartao } from "./actions";

type Cartao = {
  id: string;
  nome: string;
  dia_fechamento: number;
  dia_vencimento: number;
  limite: number | null;
};
type Compra = {
  cartao_id: string;
  valor: number;
  data: string;
  pago: boolean;
  descricao: string;
  parcela_grupo: string | null;
  parcela_num: number | null;
  parcela_total: number | null;
};

const campo =
  "rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

/** Tira o sufixo " (2/5)" que o app põe na descrição de cada parcela. */
const semParcela = (d: string) => d.replace(/\s*\(\d+\/\d+\)\s*$/, "");

export default async function Cartoes() {
  const { supabase } = await getContextoCasal();

  const [{ data: cartoesData }, { data: comprasData }] = await Promise.all([
    supabase
      .from("cartoes")
      .select("id, nome, dia_fechamento, dia_vencimento, limite")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("lancamentos")
      .select("cartao_id, valor, data, pago, descricao, parcela_grupo, parcela_num, parcela_total")
      .not("cartao_id", "is", null),
  ]);

  const cartoes = (cartoesData ?? []) as Cartao[];
  const compras = (comprasData ?? []) as Compra[];

  return (
    <section className="space-y-5">
      <form
        action={criarCartao}
        className="grid grid-cols-2 gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/15"
      >
        <input name="nome" required placeholder="Nome (ex: Nubank)" className={`${campo} col-span-2`} />
        <input name="fechamento" required type="number" min={1} max={31} placeholder="Dia do fechamento" className={campo} />
        <input name="vencimento" required type="number" min={1} max={31} placeholder="Dia do vencimento" className={campo} />
        <input name="limite" inputMode="decimal" placeholder="Limite (opcional)" className={`${campo} col-span-2`} />
        <button className="col-span-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white">
          Adicionar cartão
        </button>
      </form>

      {cartoes.length === 0 && (
        <p className="py-6 text-center text-sm opacity-60">
          Nenhum cartão ainda. Cadastre o primeiro acima.
        </p>
      )}

      <ul className="space-y-3">
        {cartoes.map((c) => {
          const doCartao = compras.filter((p) => p.cartao_id === c.id);
          const meus = doCartao.filter((p) => !p.pago);
          const comprometido = meus.reduce((t, p) => t + Number(p.valor), 0);
          const venc = vencimentoDaCompra(hoje(), c.dia_fechamento, c.dia_vencimento);
          const aberta = meus
            .filter((p) => p.data === venc)
            .reduce((t, p) => t + Number(p.valor), 0);

          const limite = c.limite != null ? Number(c.limite) : null;
          const disponivel = limite != null ? limite - comprometido : null;
          const uso = limite && limite > 0 ? Math.min(100, Math.max(0, (comprometido / limite) * 100)) : 0;

          // Quanto volta ao limite em cada fatura (só as próximas).
          const porVencimento = new Map<string, number>();
          for (const p of meus) porVencimento.set(p.data, (porVencimento.get(p.data) ?? 0) + Number(p.valor));
          const retornos = [...porVencimento.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(0, 4);

          // Compras parceladas que ainda têm parcela em aberto.
          const grupos = new Map<string, Compra[]>();
          for (const p of doCartao) {
            if (!p.parcela_grupo) continue;
            grupos.set(p.parcela_grupo, [...(grupos.get(p.parcela_grupo) ?? []), p]);
          }
          const parceladas = [...grupos.values()]
            .map((ps) => {
              const abertas = ps.filter((p) => !p.pago).sort((a, b) => (a.data < b.data ? -1 : 1));
              return {
                nome: semParcela(ps[0].descricao),
                total: ps[0].parcela_total ?? ps.length,
                pagas: ps.filter((p) => p.pago).length,
                restante: abertas.reduce((t, p) => t + Number(p.valor), 0),
                parcela: Number(ps[0].valor),
                proxima: abertas[0]?.data ?? null,
              };
            })
            .filter((g) => g.restante > 0)
            .sort((a, b) => ((a.proxima ?? "") < (b.proxima ?? "") ? -1 : 1));

          return (
            <li key={c.id} className="space-y-3 rounded-2xl border border-black/10 p-4 dark:border-white/15">
              <div className="flex items-baseline justify-between">
                <p className="text-lg font-semibold">{c.nome}</p>
                <p className="text-xs opacity-60">
                  fecha dia {c.dia_fechamento} · vence dia {c.dia_vencimento}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs opacity-60">Fatura aberta (vence {formatData(venc)})</p>
                  <p className="font-semibold">{brl(aberta)}</p>
                </div>
                <div>
                  <p className="text-xs opacity-60">Comprometido no total</p>
                  <p className="font-semibold text-amber-600">{brl(comprometido)}</p>
                </div>
              </div>

              {limite != null && disponivel != null ? (
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-sm">
                    <p className="text-xs opacity-60">Limite disponível</p>
                    <p className="text-xs opacity-60">limite {brl(limite)}</p>
                  </div>
                  <p className={`text-xl font-semibold ${disponivel < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {brl(disponivel)}
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                    <div
                      className={`h-full rounded-full ${uso >= 90 ? "bg-red-600" : uso >= 70 ? "bg-amber-500" : "bg-emerald-600"}`}
                      style={{ width: `${uso}%` }}
                    />
                  </div>
                  <p className="text-xs opacity-60">{Math.round(uso)}% do limite em uso</p>
                  {retornos.length > 0 && (
                    <p className="text-xs opacity-70">
                      Volta ao limite ao pagar:{" "}
                      {retornos.map(([d, v], i) => (
                        <span key={d}>
                          {i > 0 && " · "}
                          {formatData(d)} <strong>{brl(v)}</strong>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs opacity-60">Defina o limite do cartão para acompanhar o quanto ainda dá para usar.</p>
              )}

              <details className="rounded-lg border border-black/10 p-2 dark:border-white/15">
                <summary className="cursor-pointer text-xs font-medium">
                  {limite != null ? "Ajustar limite" : "Definir limite"}
                </summary>
                <form action={atualizarLimite} className="mt-2 flex gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <input
                    name="limite"
                    inputMode="decimal"
                    defaultValue={limite != null ? String(limite).replace(".", ",") : ""}
                    placeholder="Limite total (R$)"
                    className={`${campo} min-w-0 flex-1`}
                  />
                  <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white">Salvar</button>
                </form>
                <p className="mt-1 text-xs opacity-60">Deixe vazio para tirar o limite.</p>
              </details>

              {parceladas.length > 0 && (
                <details className="rounded-lg border border-black/10 p-2 dark:border-white/15">
                  <summary className="cursor-pointer text-xs font-medium">
                    Compras parceladas em andamento ({parceladas.length})
                  </summary>
                  <ul className="mt-2 divide-y divide-black/10 dark:divide-white/10">
                    {parceladas.map((g, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate">{g.nome}</p>
                          <p className="text-xs opacity-60">
                            {g.pagas} de {g.total} pagas · parcela de {brl(g.parcela)}
                            {g.proxima ? ` · próxima ${formatData(g.proxima)}` : ""}
                          </p>
                        </div>
                        <p className="shrink-0 text-xs font-medium text-amber-600">faltam {brl(g.restante)}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <div className="flex items-center gap-2">
                <Link href={`/cartoes/${c.id}/compra`} className="flex-1 rounded-lg bg-red-600 py-2 text-center text-sm font-medium text-white">
                  + Compra
                </Link>
                <Link href={`/cartoes/${c.id}?mes=${venc.slice(0, 7)}`} className="flex-1 rounded-lg border border-black/15 py-2 text-center text-sm dark:border-white/20">
                  Ver faturas
                </Link>
                <form action={arquivarCartao}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="px-2 text-xs underline opacity-60">arquivar</button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
