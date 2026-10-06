"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContextoCasal } from "@/lib/casal";
import { parseValor } from "@/lib/format";

export type EstadoForm = { erro?: string } | undefined;

export async function salvarLancamento(
  _: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { supabase, casalId } = await getContextoCasal();

  const id = String(formData.get("id") ?? "");
  const valor = parseValor(String(formData.get("valor") ?? ""));
  const data = String(formData.get("data") ?? "");
  const tipo = formData.get("tipo") === "entrada" ? "entrada" : "saida";

  if (!(valor > 0)) return { erro: "Informe um valor maior que zero." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Data inválida." };

  const row = {
    tipo,
    valor,
    data,
    descricao: String(formData.get("descricao") ?? "").trim(),
    categoria_id: String(formData.get("categoria_id") ?? "") || null,
    pago: formData.get("pago") === "on",
  };

  const { error } = id
    ? await supabase.from("lancamentos").update(row).eq("id", id)
    : await supabase.from("lancamentos").insert({ ...row, casal_id: casalId });

  if (error) return { erro: "Não foi possível salvar. Tente de novo." };

  revalidatePath("/");
  redirect(`/?mes=${data.slice(0, 7)}`);
}

export async function excluirLancamento(formData: FormData) {
  const { supabase } = await getContextoCasal();
  const mes = String(formData.get("mes") ?? "");
  await supabase
    .from("lancamentos")
    .delete()
    .eq("id", String(formData.get("id")));
  revalidatePath("/");
  redirect(mes ? `/?mes=${mes}` : "/");
}

export async function alternarPago(formData: FormData) {
  const { supabase } = await getContextoCasal();
  await supabase
    .from("lancamentos")
    .update({ pago: formData.get("pago") !== "true" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/");
}
