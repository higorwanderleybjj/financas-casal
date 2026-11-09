import Link from "next/link";
import { FormBoleto } from "@/components/form-boleto";
import { getContextoCasal } from "@/lib/casal";
import { hoje } from "@/lib/format";

export default async function LancarBoleto() {
  const { supabase, casalId } = await getContextoCasal();
  const [{ data: categorias }, { data: contasFixas }] = await Promise.all([
    supabase.from("categorias").select("id, nome").eq("tipo", "saida").order("nome"),
    supabase.from("contas_fixas").select("id, nome, categoria_id").eq("ativa", true).order("nome"),
  ]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lançar boleto</h2>
        <Link href="/" className="text-sm underline opacity-70">
          Cancelar
        </Link>
      </div>
      <FormBoleto casalId={casalId} categorias={categorias ?? []} contasFixas={contasFixas ?? []} hoje={hoje()} />
    </section>
  );
}
