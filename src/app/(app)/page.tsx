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
  categorias: { nome: string; cor: string } | null;
};

export default async function Home(props: PageProps<"/">) {
  const mes = mesValido((await props.searchParams).mes);
  const { supabase, casalId } = await getContextoCasal();

  await gerarContasDoMes(supabase, casalId, mes);

  const hojeStr = hoje();
  const [{ data }, { data: venc }] = await Promise.all([
    supabase
      .from("lancamentos")
      .select("id, tipo, valor, data, descricao, pago, categorias(nome, cor)")
      .gte("data", `${mes}-01`)
      .lt("data", `${somaMes(mes, 1)}-01`)
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false }),
    // Saídas pendentes atrasadas ou que vencem nos próximos 7 dias (em qualquer mês).
    supabase
      .from("lancamentos")
      .select("id, valor, data, descricao")
      .eq("tipo", "saida")
      .eq("pago", false)
      .lte("data", somaDias(hojeStr, 7))
      .order("data"),
  ]);

  const vencendo = (venc ?? []) as {
    id: string;
    valor: number;
    data: string;
    descricao: string;
  }[];

  const linhas = (data ?? []) as unknown as Linha[];
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
                <li key={v.id}>
                  <Link
                    href={`/lancamentos/${v.id}`}
                    className="flex justify-between gap-2 text-sm"
                  >
                    <span className="truncate">
                      {v.descricao || "Sem descrição"}
                    </span>
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

      {linhas.length === 0 ? (
        <p className="py-10 text-center text-sm opacity-60">
          Nenhum lançamento neste mês.
        </p>
      ) : (
        <ul className="divide-y divide-black/10 rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/15">
          {linhas.map((l) => (
            <li key={l.id} className="flex items-center gap-3 p-3">
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
          ))}
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
