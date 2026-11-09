import Link from "next/link";
import { getContextoCasal } from "@/lib/casal";
import { brl, mesAtual, mesValido, nomeMes, somaMes } from "@/lib/format";

type Lanc = {
  valor: number;
  data: string;
  descricao: string;
  categorias: { nome: string } | null;
};

const mesCurto = (m: string) => {
  const [a, b] = m.split("-").map(Number);
  return new Date(a, b - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
};

const normaliza = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const campo = "rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export default async function CompararMeses(props: PageProps<"/graficos/comparar">) {
  const sp = await props.searchParams;
  const b = mesValido(sp.b);
  const a = typeof sp.a === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.a) ? sp.a : somaMes(b, -1);
  const por: "cat" | "desc" = sp.por === "desc" ? "desc" : "cat";
  const item = typeof sp.item === "string" ? sp.item : "";

  const { supabase } = await getContextoCasal();

  // Os dois meses comparados e os 6 meses que terminam no mais recente (para o gráfico de evolução).
  const maisRecente = a > b ? a : b;
  const inicio = [a, b, somaMes(maisRecente, -5)].sort()[0];
  const { data } = await supabase
    .from("lancamentos")
    .select("valor, data, descricao, categorias(nome)")
    .eq("tipo", "saida")
    .gte("data", `${inicio}-01`)
    .lt("data", `${somaMes(maisRecente, 1)}-01`);
  const lancs = (data ?? []) as unknown as Lanc[];

  // Um item é uma categoria ou uma descrição (aluguel, luz...), conforme a visão escolhida.
  const chaveDe = (l: Lanc) =>
    por === "cat"
      ? { chave: l.categorias?.nome ?? "Sem categoria", rotulo: l.categorias?.nome ?? "Sem categoria" }
      : { chave: normaliza(l.descricao) || "sem descrição", rotulo: l.descricao.trim() || "Sem descrição" };

  const itens = new Map<string, { rotulo: string; porMes: Map<string, number> }>();
  for (const l of lancs) {
    const { chave, rotulo } = chaveDe(l);
    const atual = itens.get(chave) ?? { rotulo, porMes: new Map<string, number>() };
    const m = l.data.slice(0, 7);
    atual.porMes.set(m, (atual.porMes.get(m) ?? 0) + Number(l.valor));
    itens.set(chave, atual);
  }

  const valor = (chave: string, m: string) => itens.get(chave)?.porMes.get(m) ?? 0;
  const linhas = [...itens.entries()]
    .map(([chave, v]) => ({ chave, rotulo: v.rotulo, va: v.porMes.get(a) ?? 0, vb: v.porMes.get(b) ?? 0 }))
    .filter((l) => l.va > 0 || l.vb > 0)
    .map((l) => ({ ...l, dif: l.vb - l.va }))
    .sort((x, y) => Math.abs(y.dif) - Math.abs(x.dif));
  const totalA = linhas.reduce((t, l) => t + l.va, 0);
  const totalB = linhas.reduce((t, l) => t + l.vb, 0);

  const pct = (va: number, vb: number) => (va > 0 ? `${vb - va >= 0 ? "+" : "−"}${Math.abs(Math.round(((vb - va) / va) * 100))}%` : vb > 0 ? "novo" : "–");
  const cor = (dif: number) => (dif > 0 ? "text-red-600" : dif < 0 ? "text-emerald-600" : "opacity-60");
  const seta = (dif: number) => (dif > 0 ? "▲" : dif < 0 ? "▼" : "•");

  // Gráfico de evolução: o item escolhido (ou o total de saídas) nos 6 meses até o mais recente.
  const meses = Array.from({ length: 6 }, (_, i) => somaMes(maisRecente, i - 5));
  const serie = meses.map((m) => ({
    mes: m,
    total: item && itens.has(item) ? valor(item, m) : [...itens.keys()].reduce((t, k) => t + valor(k, m), 0),
  }));
  const maximo = Math.max(1, ...serie.map((s) => s.total));
  const nomeSerie = item && itens.has(item) ? itens.get(item)!.rotulo : "Total de saídas";

  const opcoesMes = Array.from({ length: 24 }, (_, i) => somaMes(mesAtual(), -i));
  const opcoesItem = [...itens.entries()].sort((x, y) => x[1].rotulo.localeCompare(y[1].rotulo, "pt-BR"));

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Comparar meses</h2>
        <Link href="/graficos" className="text-sm underline opacity-70">
          Voltar aos gráficos
        </Link>
      </div>

      <form method="get" className="grid grid-cols-2 gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/15">
        <label className="space-y-1 text-sm">
          Mês base
          <select name="a" defaultValue={a} className={`${campo} w-full`}>
            {opcoesMes.map((m) => (
              <option key={m} value={m}>
                {nomeMes(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Comparar com
          <select name="b" defaultValue={b} className={`${campo} w-full`}>
            {opcoesMes.map((m) => (
              <option key={m} value={m}>
                {nomeMes(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Ver por
          <select name="por" defaultValue={por} className={`${campo} w-full`}>
            <option value="cat">Categoria</option>
            <option value="desc">Conta ou descrição (aluguel, luz...)</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Evolução de
          <select name="item" defaultValue={item} className={`${campo} w-full`}>
            <option value="">Total de saídas</option>
            {opcoesItem.map(([chave, v]) => (
              <option key={chave} value={chave}>
                {v.rotulo}
              </option>
            ))}
          </select>
        </label>
        <button className="col-span-2 rounded-lg bg-emerald-600 py-2 font-medium text-white">Comparar</button>
      </form>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase opacity-60">
          {nomeMes(a)} contra {nomeMes(b)}
        </h3>
        <p className="text-sm">
          Gastos totais:{" "}
          <strong>
            {brl(totalA)} → {brl(totalB)}
          </strong>{" "}
          <span className={cor(totalB - totalA)}>
            {seta(totalB - totalA)} {brl(Math.abs(totalB - totalA))} ({pct(totalA, totalB)})
          </span>
        </p>

        {linhas.length === 0 ? (
          <p className="py-4 text-center text-sm opacity-60">Sem saídas nesses dois meses.</p>
        ) : (
          <ul className="divide-y divide-black/10 rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/15">
            {linhas.map((l) => (
              <li key={l.chave} className="flex items-center gap-3 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.rotulo}</p>
                  <p className="text-xs opacity-60">
                    {mesCurto(a)} {brl(l.va)} · {mesCurto(b)} {brl(l.vb)}
                  </p>
                </div>
                <div className={`text-right font-medium whitespace-nowrap ${cor(l.dif)}`}>
                  <p>
                    {seta(l.dif)} {l.dif >= 0 ? "+" : "−"} {brl(Math.abs(l.dif))}
                  </p>
                  <p className="text-xs">{pct(l.va, l.vb)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase opacity-60">Evolução: {nomeSerie}</h3>
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
          <div className="flex h-40 items-end justify-between gap-2">
            {serie.map((s) => (
              <div key={s.mes} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[0.65rem] opacity-70">{Math.round(s.total).toLocaleString("pt-BR")}</span>
                <div
                  className={`w-full max-w-8 rounded-t ${s.mes === a || s.mes === b ? "bg-emerald-600" : "bg-black/25 dark:bg-white/30"}`}
                  style={{ height: `${(s.total / maximo) * 85}%` }}
                  title={`${nomeMes(s.mes)}: ${brl(s.total)}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between gap-2 text-center text-xs">
            {serie.map((s) => (
              <p key={s.mes} className="flex-1 font-medium uppercase">
                {mesCurto(s.mes)}
              </p>
            ))}
          </div>
          <p className="mt-3 text-xs opacity-70">
            As barras verdes são os dois meses comparados. O número acima de cada barra é o gasto em R$.
          </p>
        </div>
      </div>
    </section>
  );
}
