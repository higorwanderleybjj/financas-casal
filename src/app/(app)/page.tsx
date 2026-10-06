import Link from "next/link";
import { getContextoCasal } from "@/lib/casal";
import { gerarContasDoMes } from "@/lib/contas-fixas";
import {
  brl,
  diffDias,
  formatData,
  hoje,
  mesValido,
  nomeMes,
  somaDias,
  somaMes,
} from "@/lib/format";
import { alternarPago } from "./lancamentos/actions";

type Linha = {
  id: string;
  tipo: "entrada" | "saida";
  valor: number;
  data: string;
  descricao: string;
  pago: boolean;
  cartao_id: string | null;
  categorias: { nome: string; cor: string } | null;
  cartoes: { nome: string } | null;
};

type Pendente = {
  id: string;
  valor: number;
  data: string;
  descricao: string;
  cartao_id: string | null;
  cartoes: { nome: string } | null;
};

type Alerta = {
  key: string;
  href: string;
  titulo: string;
  valor: number;
  data: string;
};

type Item = {
  key: string;
  data: string;
  lanc: Linha;
  fatura?: {
    cartaoId: string;
    nome: string;
    total: number;
    compras: number;
    paga: boolean;
  };
};

export default async function Home(props: PageProps<"/">) {
  const mes = mesValido((await props.searchParams).mes);
  const { supabase, casalId } = await getContextoCasal();

  await gerarContasDoMes(supabase, casalId, mes);

  const hojeStr = hoje();
  const [{ data }, { data: venc }] = await Promise.all([
    supabase
      .from("lancamentos")
      .select(
        "id, tipo, valor, data, descricao, pago, cartao_id, categorias(nome, cor), cartoes(nome)",
      )
      .gte("data", `${mes}-01`)
      .lt("data", `${somaMes(mes, 1)}-01`)
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false }),
    // Saídas pendentes atrasadas ou que vencem nos próximos 7 dias (em qualquer mês).
    supabase
      .from("lancamentos")
      .select("id, valor, data, descricao, cartao_id, cartoes(nome)")
      .eq("tipo", "saida")
      .eq("pago", false)
      .lte("data", somaDias(hojeStr, 7))
      .order("data"),
  ]);

  // Compras de cartão viram uma linha por fatura (cartão + vencimento).
  const vencendo: Alerta[] = [];
  for (const v of (venc ?? []) as unknown as Pendente[]) {
    if (!v.cartao_id) {
      vencendo.push({
        key: v.id,
        href: `/lancamentos/${v.id}`,
        titulo: v.descricao || "Sem descrição",
        valor: Number(v.valor),
        data: v.data,
      });
      continue;
    }
    const key = `${v.cartao_id}-${v.data}`;
    const ja = vencendo.find((a) => a.key === key);
    if (ja) ja.valor += Number(v.valor);
    else
      vencendo.push({
        key,
        href: `/cartoes/${v.cartao_id}?mes=${v.data.slice(0, 7)}`,
        titulo: `Fatura ${v.cartoes?.nome ?? "do cartão"}`,
        valor: Number(v.valor),
        data: v.data,
      });
  }

  const linhas = (data ?? []) as unknown as Linha[];

  // Mesma ideia na lista do mês: uma linha de fatura por cartão.
  const itens: Item[] = [];
  for (const l of linhas) {
    if (!l.cartao_id) {
      itens.push({ key: l.id, data: l.data, lanc: l });
      continue;
    }
    const ja = itens.find((i) => i.fatura?.cartaoId === l.cartao_id);
    if (ja?.fatura) {
      ja.fatura.total += Number(l.valor);
      ja.fatura.compras += 1;
      ja.fatura.paga = ja.fatura.paga && l.pago;
    } else {
      itens.push({
        key: `fatura-${l.cartao_id}`,
        data: l.data,
        lanc: l,
        fatura: {
          cartaoId: l.cartao_id,
          nome: l.cartoes?.nome ?? "cartão",
          total: Number(l.valor),
          compras: 1,
          paga: l.pago,
        },
      });
    }
  }
  itens.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  const soma = (f: (l: Linha) => boolean) =>
    linhas.filter(f).reduce((t, l) => t + Number(l.valor), 0);

  const entradas = soma((l) => l.tipo === "entrada");
  const saidas = soma((l) => l.tipo === "saida");
  const aPagar = soma((l) => l.tipo === "saida" && !l.pago);
  const saldo = entradas - saidas;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/?mes=${somaMes(mes, -1)}`}
          className="px-3 py-1 text-lg"
          aria-label="Mês anterior"
        >
          ‹
        </Link>
        <h2 className="text-lg font-semibold first-letter:uppercase">{nomeMes(mes)}</h2>
        <Link
          href={`/?mes=${somaMes(mes, 1)}`}
          className="px-3 py-1 text-lg"
          aria-label="Próximo mês"
        >
          ›
        </Link>
      </div>

      <div className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
        <p className="text-xs opacity-60">Saldo do mês</p>
        <p
          className={`text-3xl font-semibold ${saldo < 0 ? "text-red-600" : "text-emerald-600"}`}
        >
          {brl(saldo)}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-xs opacity-60">Entradas</p>
            <p className="font-medium text-emerald-600">{brl(entradas)}</p>
          </div>
          <div>
            <p className="text-xs opacity-60">Saídas</p>
            <p className="font-medium text-red-600">{brl(saidas)}</p>
          </div>
          <div>
            <p className="text-xs opacity-60">A pagar</p>
            <p className="font-medium text-amber-600">{brl(aPagar)}</p>
          </div>
        </div>
      </div>

      {vencendo.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-sm font-semibold text-amber-600">
            Vencendo em breve
          </p>
          <ul className="space-y-1">
            {vencendo.map((v) => {
              const d = diffDias(hojeStr, v.data);
              return (
                <li key={v.key}>
                  <Link
                    href={v.href}
                    className="flex justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{v.titulo}</span>
                    <span className="shrink-0 text-xs">
                      {brl(Number(v.valor))} ·{" "}
                      <span
                        className={d < 0 ? "font-semibold text-red-600" : ""}
                      >
                        {d < 0
                          ? `atrasada ${-d}d`
                          : d === 0
                            ? "vence hoje"
                            : `em ${d}d`}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {itens.length === 0 ? (
        <p className="py-10 text-center text-sm opacity-60">
          Nenhum lançamento neste mês.
        </p>
      ) : (
        <ul className="divide-y divide-black/10 rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/15">
          {itens.map((item) =>
            item.fatura ? (
              <li key={item.key}>
                <Link
                  href={`/cartoes/${item.fatura.cartaoId}?mes=${mes}`}
                  className="flex items-center gap-3 p-3"
                >
                  <span className="size-3 shrink-0 rounded-full bg-slate-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      Fatura {item.fatura.nome}
                    </p>
                    <p className="text-xs opacity-60">
                      vence {formatData(item.data)} · {item.fatura.compras}{" "}
                      {item.fatura.compras === 1 ? "compra" : "compras"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      - {brl(item.fatura.total)}
                    </p>
                    <p
                      className={`text-xs ${item.fatura.paga ? "opacity-50" : "text-amber-600"}`}
                    >
                      {item.fatura.paga ? "paga" : "em aberto"}
                    </p>
                  </div>
                </Link>
              </li>
            ) : (
              <LinhaLancamento key={item.key} l={item.lanc} />
            ),
          )}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-2xl gap-2 p-4 backdrop-blur-sm">
        <Link
          href="/lancamentos/novo?tipo=saida"
          className="flex-1 rounded-xl bg-red-600 py-3 text-center font-medium text-white"
        >
          + Saída
        </Link>
        <Link
          href="/lancamentos/novo?tipo=entrada"
          className="flex-1 rounded-xl bg-emerald-600 py-3 text-center font-medium text-white"
        >
          + Entrada
        </Link>
      </div>
    </section>
  );
}

function LinhaLancamento({ l }: { l: Linha }) {
  return (
    <li className="flex items-center gap-3 p-3">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ background: l.categorias?.cor ?? "#94a3b8" }}
      />
      <Link href={`/lancamentos/${l.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {l.descricao || l.categorias?.nome || "Sem descrição"}
        </p>
        <p className="text-xs opacity-60">
          {formatData(l.data)} · {l.categorias?.nome ?? "Sem categoria"}
        </p>
      </Link>
      <div className="text-right">
        <p
          className={`text-sm font-semibold ${l.tipo === "entrada" ? "text-emerald-600" : ""}`}
        >
          {l.tipo === "entrada" ? "+" : "-"} {brl(Number(l.valor))}
        </p>
        <form action={alternarPago}>
          <input type="hidden" name="id" value={l.id} />
          <input type="hidden" name="pago" value={String(l.pago)} />
          <button
            className={`text-xs underline ${l.pago ? "opacity-50" : "text-amber-600"}`}
          >
            {l.pago
              ? l.tipo === "saida"
                ? "pago"
                : "recebido"
              : "pendente"}
          </button>
        </form>
      </div>
    </li>
  );
}
