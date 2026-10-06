import Link from "next/link";
import { notFound } from "next/navigation";
import { FormCompra } from "@/components/form-compra";
import { getContextoCasal } from "@/lib/casal";
import { hoje } from "@/lib/format";

export default async function NovaCompra(
  props: PageProps<"/cartoes/[id]/compra">,
) {
  const { id } = await props.params;
  const { supabase } = await getContextoCasal();

  const [{ data: cartao }, { data: categorias }] = await Promise.all([
    supabase.from("cartoes").select("id, nome").eq("id", id).maybeSingle(),
    supabase.from("categorias").select("id, nome").eq("tipo", "saida").order("nome"),
  ]);
  if (!cartao) notFound();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Compra no {cartao.nome}</h2>
        <Link href="/cartoes" className="text-sm underline opacity-70">
          Cancelar
        </Link>
      </div>
      <FormCompra cartaoId={id} categorias={categorias ?? []} hoje={hoje()} />
    </section>
  );
}
