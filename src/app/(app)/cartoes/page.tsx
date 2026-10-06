import Link from "next/link";
import { getContextoCasal } from "@/lib/casal";
import { vencimentoDaCompra } from "@/lib/cartao";
import { brl, formatData, hoje } from "@/lib/format";
import { arquivarCartao, criarCartao } from "./actions";

type Cartao = {
  id: string;
  nome: string;
  dia_fechamento: number;
  dia_vencimento: number;
  limite: number | null;
};
type Pendente = { cartao_id: string; valor: number; data: string };

const campo =
  "rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export default async function Cartoes() {
  const { supabase } = await getContextoCasal();

  const [{ data: cartoesData }, { data: pendData }] = await Promise.all([
    supabase
      .from("cartoes")
      .select("id, nome, dia_fechamento, dia_vencimento, limite")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("lancamentos")
      .select("cartao_id, valor, data")
      .not("cartao_id", "is", null)
      .eq("pago", false),
  ]);

  const cartoes = (cartoesData ?? []) as Cartao[];
  const pendentes = (pendData ?? []) as Pendente[];

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
          const meus = pendentes.filter((p) => p.cartao_id === c.id);
          const comprometido = meus.reduce((t, p) => t + Number(p.valor), 0);
          const venc = vencimentoDaCompra(hoje(), c.dia_fechamento, c.dia_vencimento);
          const aberta = meus
            .filter((p) => p.data === venc)
            .reduce((t, p) => t + Number(p.valor), 0);

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
                {c.limite != null && (
                  <div className="col-span-2">
                    <p className="text-xs opacity-60">Limite disponível</p>
                    <p className={`font-semibold ${Number(c.limite) - comprometido < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {brl(Number(c.limite) - comprometido)}{" "}
                      <span className="text-xs font-normal opacity-60">de {brl(Number(c.limite))}</span>
                    </p>
                  </div>
                )}
              </div>

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
