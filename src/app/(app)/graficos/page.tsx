import { NavMes } from "@/components/nav-mes";
import { getContextoCasal } from "@/lib/casal";
import { brl, mesValido, somaMes } from "@/lib/format";

type Lanc = {
  tipo: "entrada" | "saida";
  valor: number;
  data: string;
  categorias: { nome: string; cor: string } | null;
};

const mesCurto = (m: string) => {
  const [a, b] = m.split("-").map(Number);
  return new Date(a, b - 1, 1)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
};

export default async function Graficos(props: PageProps<"/graficos">) {
  const mes = mesValido((await props.searchParams).mes);
  const { supabase } = await getContextoCasal();

  const meses = Array.from({ length: 6 }, (_, i) => somaMes(mes, i - 5));

  const { data } = await supabase
    .from("lancamentos")
    .select("tipo, valor, data, categorias(nome, cor)")
    .gte("data", `${meses[0]}-01`)
    .lt("data", `${somaMes(mes, 1)}-01`);

  const lancs = (data ?? []) as unknown as Lanc[];

  const porMes = meses.map((m) => {
    const doMes = lancs.filter((l) => l.data.startsWith(m));
    const soma = (t: Lanc["tipo"]) =>
      doMes.filter((l) => l.tipo === t).reduce((s, l) => s + Number(l.valor), 0);
    return { mes: m, entradas: soma("entrada"), saidas: soma("saida") };
  });
  const maximo = Math.max(1, ...porMes.flatMap((m) => [m.entradas, m.saidas]));

  const gastos = new Map<string, { nome: string; cor: string; total: number }>();
  for (const l of lancs.filter((l) => l.tipo === "saida" && l.data.startsWith(mes))) {
    const nome = l.categorias?.nome ?? "Sem categoria";
    const atual = gastos.get(nome) ?? { nome, cor: l.categorias?.cor ?? "#94a3b8", total: 0 };
    atual.total += Number(l.valor);
    gastos.set(nome, atual);
  }
  const ranking = [...gastos.values()].sort((a, b) => b.total - a.total);
  const totalSaidas = ranking.reduce((s, c) => s + c.total, 0);

  const atual = porMes[porMes.length - 1];
  const anterior = porMes[porMes.length - 2];
  const variacao =
    anterior.saidas > 0 ? ((atual.saidas - anterior.saidas) / anterior.saidas) * 100 : null;

  return (
    <section className="space-y-6">
      <NavMes base="/graficos" mes={mes} />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase opacity-60">Para onde foi o dinheiro</h2>
        {ranking.length === 0 ? (
          <p className="py-4 text-center text-sm opacity-60">Sem saídas neste mês.</p>
        ) : (
          <ul className="space-y-3 rounded-2xl border border-black/10 p-4 dark:border-white/15">
            {ranking.map((c) => {
              const pct = (c.total / totalSaidas) * 100;
              return (
                <li key={c.nome} className="space-y-1">
                  <div className="flex items-baseline justify-between text-sm">
                    <span>{c.nome}</span>
                    <span>
                      {brl(c.total)} <span className="text-xs opacity-60">{Math.round(pct)}%</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.cor }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase opacity-60">Últimos 6 meses</h2>

        {variacao !== null && (
          <p className="text-sm">
            Em {mesCurto(mes)} vocês gastaram{" "}
            <strong className={variacao > 0 ? "text-red-600" : "text-emerald-600"}>
              {Math.abs(Math.round(variacao))}% {variacao > 0 ? "a mais" : "a menos"}
            </strong>{" "}
            do que em {mesCurto(anterior.mes)}.
          </p>
        )}

        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
          <div className="flex h-40 items-end justify-between gap-2">
            {porMes.map((m) => (
              <div key={m.mes} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <div
                    className="w-1/2 max-w-5 rounded-t bg-emerald-600"
                    style={{ height: `${(m.entradas / maximo) * 100}%` }}
                    title={`Entradas ${brl(m.entradas)}`}
                  />
                  <div
                    className="w-1/2 max-w-5 rounded-t bg-red-600"
                    style={{ height: `${(m.saidas / maximo) * 100}%` }}
                    title={`Saídas ${brl(m.saidas)}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between gap-2 text-center text-xs">
            {porMes.map((m) => (
              <div key={m.mes} className="flex-1">
                <p className="font-medium uppercase">{mesCurto(m.mes)}</p>
                <p className={m.entradas - m.saidas < 0 ? "text-red-600" : "opacity-60"}>
                  {Math.round(m.entradas - m.saidas).toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 flex gap-4 text-xs opacity-70">
            <span><span className="mr-1 inline-block size-2 rounded-sm bg-emerald-600" />entradas</span>
            <span><span className="mr-1 inline-block size-2 rounded-sm bg-red-600" />saídas</span>
            <span>número = saldo do mês (R$)</span>
          </p>
        </div>
      </div>
    </section>
  );
}
