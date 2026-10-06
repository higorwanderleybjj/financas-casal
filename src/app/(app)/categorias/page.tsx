import { getContextoCasal } from "@/lib/casal";
import { criarCategoria, excluirCategoria } from "./actions";

type Categoria = {
  id: string;
  nome: string;
  tipo: "entrada" | "saida";
  cor: string;
};

const campo =
  "rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export default async function Categorias() {
  const { supabase } = await getContextoCasal();
  const { data } = await supabase
    .from("categorias")
    .select("id, nome, tipo, cor")
    .order("nome");
  const categorias = (data ?? []) as Categoria[];

  return (
    <section className="space-y-6">
      <form
        action={criarCategoria}
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/15"
      >
        <input
          name="nome"
          required
          placeholder="Nova categoria"
          className={`${campo} min-w-0 flex-1`}
        />
        <select name="tipo" className={campo}>
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </select>
        <input
          type="color"
          name="cor"
          defaultValue="#10b981"
          className="h-10 w-10 rounded-lg"
          aria-label="Cor"
        />
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-white">
          Adicionar
        </button>
      </form>

      {(["saida", "entrada"] as const).map((tipo) => (
        <div key={tipo}>
          <h2 className="mb-2 text-sm font-semibold uppercase opacity-60">
            {tipo === "saida" ? "Saídas" : "Entradas"}
          </h2>
          <ul className="divide-y divide-black/10 rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/15">
            {categorias
              .filter((c) => c.tipo === tipo)
              .map((c) => (
                <li key={c.id} className="flex items-center gap-3 p-3">
                  <span
                    className="size-3 rounded-full"
                    style={{ background: c.cor }}
                  />
                  <span className="flex-1 text-sm">{c.nome}</span>
                  <form action={excluirCategoria}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="text-xs text-red-600 underline">
                      excluir
                    </button>
                  </form>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
