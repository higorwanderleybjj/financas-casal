import { NavMes } from "@/components/nav-mes";
import { getContextoCasal } from "@/lib/casal";
import { brl, mesValido, somaMes } from "@/lib/format";
import { aportar, criarPoupanca, definirLimite, excluirMeta } from "./actions";

type Meta = {
  id: string;
  tipo: "limite_categoria" | "poupanca";
  nome: string;
  categoria_id: string | null;
  valor_alvo: number;
  valor_atual: number;
  categorias: { cor: string } | null;
};

const campo =
  "rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

function Barra({ pct, cor }: { pct: number; cor: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, pct)}%`, background: cor }}
      />
    </div>
  );
}

const corLimite = (pct: number) =>
  pct > 100 ? "#dc2626" : pct >= 80 ? "#d97706" : "#059669";

export default async function Metas(props: PageProps<"/metas">) {
  const mes = mesValido((await props.searchParams).mes);
  const { supabase } = await getContextoCasal();

  const [{ data: metasData }, { data: gastosData }, { data: categorias }] =
    await Promise.all([
      supabase
        .from("metas")
        .select("id, tipo, nome, categoria_id, valor_alvo, valor_atual, categorias(cor)")
        .order("nome"),
      supabase
        .from("lancamentos")
        .select("valor, categoria_id")
        .eq("tipo", "saida")
        .not("categoria_id", "is", null)
        .gte("data", `${mes}-01`)
        .lt("data", `${somaMes(mes, 1)}-01`),
      supabase.from("categorias").select("id, nome").eq("tipo", "saida").order("nome"),
    ]);

  const metas = (metasData ?? []) as unknown as Meta[];
  const limites = metas.filter((m) => m.tipo === "limite_categoria");
  const poupancas = metas.filter((m) => m.tipo === "poupanca");

  const gastoPorCategoria = new Map<string, number>();
  for (const g of gastosData ?? []) {
    gastoPorCategoria.set(
      g.categoria_id,
      (gastoPorCategoria.get(g.categoria_id) ?? 0) + Number(g.valor),
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase opacity-60">
          Limite por categoria
        </h2>
        <NavMes base="/metas" mes={mes} />

        <form
          action={definirLimite}
          className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/15"
        >
          <select name="categoria_id" required className={`${campo} min-w-0 flex-1`}>
            <option value="">Categoria...</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <input
            name="valor"
            required
            inputMode="decimal"
            placeholder="Limite no mês"
            className={`${campo} w-36`}
          />
          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-white">
            Definir
          </button>
        </form>

        {limites.length === 0 ? (
          <p className="py-2 text-center text-sm opacity-60">
            Defina quanto vocês querem gastar por mês em cada categoria.
          </p>
        ) : (
          <ul className="space-y-3">
            {limites.map((m) => {
              const gasto = gastoPorCategoria.get(m.categoria_id ?? "") ?? 0;
              const pct = (gasto / Number(m.valor_alvo)) * 100;
              const sobra = Number(m.valor_alvo) - gasto;
              return (
                <li key={m.id} className="space-y-2 rounded-2xl border border-black/10 p-3 dark:border-white/15">
                  <div className="flex items-baseline justify-between">
                    <p className="font-medium">{m.nome}</p>
                    <p className="text-xs opacity-60">{Math.round(pct)}%</p>
                  </div>
                  <Barra pct={pct} cor={corLimite(pct)} />
                  <div className="flex items-baseline justify-between text-sm">
                    <span>
                      {brl(gasto)} <span className="opacity-60">de {brl(Number(m.valor_alvo))}</span>
                    </span>
                    <span className={sobra < 0 ? "font-semibold text-red-600" : "opacity-70"}>
                      {sobra < 0 ? `estourou ${brl(-sobra)}` : `sobram ${brl(sobra)}`}
                    </span>
                  </div>
                  <form action={excluirMeta} className="text-right">
                    <input type="hidden" name="id" value={m.id} />
                    <button className="text-xs text-red-600 underline">remover limite</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase opacity-60">Poupança</h2>

        <form
          action={criarPoupanca}
          className="grid grid-cols-2 gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/15"
        >
          <input name="nome" required placeholder="Objetivo (ex: Viagem)" className={`${campo} col-span-2`} />
          <input name="alvo" required inputMode="decimal" placeholder="Quanto quer juntar" className={campo} />
          <input name="atual" inputMode="decimal" placeholder="Já tem (opcional)" className={campo} />
          <button className="col-span-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white">
            Criar objetivo
          </button>
        </form>

        <ul className="space-y-3">
          {poupancas.map((m) => {
            const pct = (Number(m.valor_atual) / Number(m.valor_alvo)) * 100;
            return (
              <li key={m.id} className="space-y-2 rounded-2xl border border-black/10 p-3 dark:border-white/15">
                <div className="flex items-baseline justify-between">
                  <p className="font-medium">{m.nome}</p>
                  <p className="text-xs opacity-60">{Math.round(pct)}%</p>
                </div>
                <Barra pct={pct} cor="#059669" />
                <p className="text-sm">
                  {brl(Number(m.valor_atual))}{" "}
                  <span className="opacity-60">de {brl(Number(m.valor_alvo))}</span>
                </p>
                <form action={aportar} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={m.id} />
                  <input
                    name="valor"
                    required
                    inputMode="decimal"
                    placeholder="Guardar (use - para retirar)"
                    className={`${campo} min-w-0 flex-1`}
                  />
                  <button className="rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20">
                    Aplicar
                  </button>
                </form>
                <form action={excluirMeta} className="text-right">
                  <input type="hidden" name="id" value={m.id} />
                  <button className="text-xs text-red-600 underline">excluir objetivo</button>
                </form>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
