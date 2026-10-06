import Link from "next/link";
import { notFound } from "next/navigation";
import { getContextoCasal } from "@/lib/casal";
import { vencimentoDaCompra } from "@/lib/cartao";
import { brl, formatData, hoje, mesValido, nomeMes, somaMes } from "@/lib/format";
import { excluirCompra, pagarFatura } from "../actions";

type Compra = {
  id: string;
  valor: number;
  data: string;
  data_compra: string | null;
  descricao: string;
  pago: boolean;
  parcela_grupo: string | null;
  parcela_total: number | null;
  categorias: { nome: string; cor: string } | null;
};

export default async function Fatura(props: PageProps<"/cartoes/[id]">) {
  const { id } = await props.params;
  const { mes: mesParam } = await props.searchParams;
  const { supabase } = await getContextoCasal();

  const { data: cartao } = await supabase
    .from("cartoes")
    .select("id, nome, dia_fechamento, dia_vencimento")
    .eq("id", id)
    .maybeSingle();
  if (!cartao) notFound();

  const padrao = vencimentoDaCompra(hoje(), cartao.dia_fechamento, cartao.dia_vencimento).slice(0, 7);
  const mes = typeof mesParam === "string" ? mesValido(mesParam) : padrao;

  const { data } = await supabase
    .from("lancamentos")
    .select("id, valor, data, data_compra, descricao, pago, parcela_grupo, parcela_total, categorias(nome, cor)")
    .eq("cartao_id", id)
    .gte("data", `${mes}-01`)
    .lt("data", `${somaMes(mes, 1)}-01`)
    .order("data_compra", { ascending: false });

  const compras = (data ?? []) as unknown as Compra[];
  const total = compras.reduce((t, c) => t + Number(c.valor), 0);
  const paga = compras.length > 0 && compras.every((c) => c.pago);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/cartoes/${id}?mes=${somaMes(mes, -1)}`} className="px-3 py-1 text-lg" aria-label="Fatura anterior">
          ‹
        </Link>
        <div className="text-center">
          <h2 className="text-lg font-semibold">{cartao.nome}</h2>
          <p className="text-xs opacity-60 first-letter:uppercase">
            Fatura de {nomeMes(mes)} · vence dia {cartao.dia_vencimento}
          </p>
        </div>
        <Link href={`/cartoes/${id}?mes=${somaMes(mes, 1)}`} className="px-3 py-1 text-lg" aria-label="Próxima fatura">
          ›
        </Link>
      </div>

      <div className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
        <p className="text-xs opacity-60">Total da fatura</p>
        <p className="text-3xl font-semibold">{brl(total)}</p>
        <p className={`text-sm ${paga ? "text-emerald-600" : "text-amber-600"}`}>
          {compras.length === 0 ? "Sem compras" : paga ? "Fatura paga" : "Em aberto"}
        </p>
        {compras.length > 0 && (
          <form action={pagarFatura} className="mt-3">
            <input type="hidden" name="cartao_id" value={id} />
            <input type="hidden" name="mes" value={mes} />
            <input type="hidden" name="pago" value={String(!paga)} />
            <button className={`w-full rounded-lg py-2 text-sm font-medium ${paga ? "border border-black/15 dark:border-white/20" : "bg-emerald-600 text-white"}`}>
              {paga ? "Reabrir fatura" : "Marcar fatura como paga"}
            </button>
          </form>
        )}
      </div>

      {compras.length > 0 && (
        <ul className="divide-y divide-black/10 rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/15">
          {compras.map((c) => (
            <li key={c.id} className="space-y-1 p-3">
              <div className="flex items-center gap-3">
                <span className="size-3 shrink-0 rounded-full" style={{ background: c.categorias?.cor ?? "#94a3b8" }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.descricao}</p>
                  <p className="text-xs opacity-60">
                    {c.data_compra ? formatData(c.data_compra) : "—"} · {c.categorias?.nome ?? "Sem categoria"}
                  </p>
                </div>
                <p className="text-sm font-semibold">{brl(Number(c.valor))}</p>
              </div>
              <form action={excluirCompra} className="flex justify-end gap-3 text-xs">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="cartao_id" value={id} />
                <input type="hidden" name="grupo" value={c.parcela_grupo ?? ""} />
                <button className="text-red-600 underline">excluir</button>
                {c.parcela_grupo && (
                  <button name="todas" value="1" className="text-red-600 underline">
                    excluir todas as {c.parcela_total} parcelas
                  </button>
                )}
              </form>
            </li>
          ))}
        </ul>
      )}

      <Link href={`/cartoes/${id}/compra`} className="block rounded-xl bg-red-600 py-3 text-center font-medium text-white">
        + Nova compra neste cartão
      </Link>
    </section>
  );
}
