import Link from "next/link";
import { notFound } from "next/navigation";
import { FormLancamento } from "@/components/form-lancamento";
import { getContextoCasal } from "@/lib/casal";
import { excluirLancamento } from "../actions";

export default async function EditarLancamento(
  props: PageProps<"/lancamentos/[id]">,
) {
  const { id } = await props.params;
  const { supabase } = await getContextoCasal();

  const [{ data: l }, { data: categorias }] = await Promise.all([
    supabase.from("lancamentos").select("*").eq("id", id).maybeSingle(),
    supabase.from("categorias").select("id, nome, tipo").order("nome"),
  ]);
  if (!l) notFound();

  const mes = String(l.data).slice(0, 7);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Editar lançamento</h2>
        <Link href={`/?mes=${mes}`} className="text-sm underline opacity-70">
          Voltar
        </Link>
      </div>
      <FormLancamento
        categorias={categorias ?? []}
        inicial={{
          id: l.id,
          tipo: l.tipo,
          valor: String(l.valor).replace(".", ","),
          data: l.data,
          descricao: l.descricao,
          categoria_id: l.categoria_id,
          pago: l.pago,
        }}
      />
      <form action={excluirLancamento}>
        <input type="hidden" name="id" value={l.id} />
        <input type="hidden" name="mes" value={mes} />
        <button className="w-full rounded-lg border border-red-600/40 px-3 py-2 text-sm text-red-600">
          Excluir lançamento
        </button>
      </form>
    </section>
  );
}
