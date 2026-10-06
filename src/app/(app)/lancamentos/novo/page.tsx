import Link from "next/link";
import { FormLancamento } from "@/components/form-lancamento";
import { getContextoCasal } from "@/lib/casal";
import { hoje } from "@/lib/format";

export default async function NovoLancamento(
  props: PageProps<"/lancamentos/novo">,
) {
  const { tipo } = await props.searchParams;
  const { supabase } = await getContextoCasal();
  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nome, tipo")
    .order("nome");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Novo lançamento</h2>
        <Link href="/" className="text-sm underline opacity-70">
          Cancelar
        </Link>
      </div>
      <FormLancamento
        categorias={categorias ?? []}
        inicial={{
          tipo: tipo === "entrada" ? "entrada" : "saida",
          data: hoje(),
          pago: true,
        }}
      />
    </section>
  );
}
