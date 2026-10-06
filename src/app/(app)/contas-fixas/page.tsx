import { getContextoCasal } from "@/lib/casal";
import { brl } from "@/lib/format";
import {
  alternarContaFixa,
  atualizarContaFixa,
  criarContaFixa,
  excluirContaFixa,
} from "./actions";

type Conta = {
  id: string;
  nome: string;
  valor: number;
  dia_vencimento: number;
  ativa: boolean;
  categorias: { nome: string } | null;
};

const campo =
  "rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export default async function ContasFixas() {
  const { supabase } = await getContextoCasal();

  const [{ data }, { data: categorias }] = await Promise.all([
    supabase
      .from("contas_fixas")
      .select("id, nome, valor, dia_vencimento, ativa, categorias(nome)")
      .order("dia_vencimento"),
    supabase.from("categorias").select("id, nome").eq("tipo", "saida").order("nome"),
  ]);

  const contas = (data ?? []) as unknown as Conta[];
  const total = contas
    .filter((c) => c.ativa)
    .reduce((t, c) => t + Number(c.valor), 0);

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
        <p className="text-xs opacity-60">Total de contas fixas por mês</p>
        <p className="text-2xl font-semibold">{brl(total)}</p>
        <p className="mt-1 text-xs opacity-60">
          Todo mês elas entram sozinhas na tela do mês, como pendentes, no dia do
          vencimento. Se o valor mudar (energia, por exemplo), ajuste direto no
          lançamento do mês.
        </p>
      </div>

      <form
        action={criarContaFixa}
        className="grid grid-cols-2 gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/15"
      >
        <input
          name="nome"
          required
          placeholder="Nome (ex: Aluguel)"
          className={`${campo} col-span-2`}
        />
        <input
          name="valor"
          required
          inputMode="decimal"
          placeholder="Valor (R$)"
          className={campo}
        />
        <input
          name="dia"
          required
          type="number"
          min={1}
          max={31}
          placeholder="Dia do vencimento"
          className={campo}
        />
        <select name="categoria_id" className={`${campo} col-span-2`}>
          <option value="">Sem categoria</option>
          {(categorias ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <button className="col-span-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white">
          Adicionar conta fixa
        </button>
      </form>

      {contas.length === 0 ? (
        <p className="py-6 text-center text-sm opacity-60">
          Nenhuma conta fixa ainda. Cadastre aluguel, condomínio, energia, internet...
        </p>
      ) : (
        <ul className="space-y-3">
          {contas.map((c) => (
            <li
              key={c.id}
              className={`space-y-2 rounded-2xl border border-black/10 p-3 dark:border-white/15 ${c.ativa ? "" : "opacity-50"}`}
            >
              <div className="flex items-baseline justify-between">
                <p className="font-medium">{c.nome}</p>
                <p className="text-xs opacity-60">{c.categorias?.nome ?? "Sem categoria"}</p>
              </div>
              <form action={atualizarContaFixa} className="flex items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input
                  name="valor"
                  inputMode="decimal"
                  defaultValue={String(c.valor).replace(".", ",")}
                  aria-label="Valor"
                  className={`${campo} min-w-0 flex-1`}
                />
                <span className="text-xs opacity-60">dia</span>
                <input
                  name="dia"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={c.dia_vencimento}
                  aria-label="Dia do vencimento"
                  className={`${campo} w-16`}
                />
                <button className="rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20">
                  Salvar
                </button>
              </form>
              <div className="flex gap-4 text-xs">
                <form action={alternarContaFixa}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="ativa" value={String(c.ativa)} />
                  <button className="underline">{c.ativa ? "pausar" : "reativar"}</button>
                </form>
                <form action={excluirContaFixa}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-red-600 underline">excluir</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
