"use server";

import { revalidatePath } from "next/cache";
import { getContextoCasal } from "@/lib/casal";
import { gerarContasDoMes } from "@/lib/contas-fixas";
import { mesAtual, parseValor } from "@/lib/format";

const dia = (v: FormDataEntryValue | null) =>
  Math.min(31, Math.max(1, parseInt(String(v ?? ""), 10) || 1));

export async function criarContaFixa(formData: FormData) {
  const { supabase, casalId } = await getContextoCasal();
  const nome = String(formData.get("nome") ?? "").trim();
  const valor = parseValor(String(formData.get("valor") ?? ""));
  if (!nome || !(valor >= 0)) return;

  await supabase.from("contas_fixas").insert({
    casal_id: casalId,
    nome,
    valor,
    dia_vencimento: dia(formData.get("dia")),
    categoria_id: String(formData.get("categoria_id") ?? "") || null,
  });
  // Já aparece no mês corrente sem esperar a próxima visita.
  await gerarContasDoMes(supabase, casalId, mesAtual());
  revalidatePath("/contas-fixas");
  revalidatePath("/");
}

export async function atualizarContaFixa(formData: FormData) {
  const { supabase } = await getContextoCasal();
  const valor = parseValor(String(formData.get("valor") ?? ""));
  if (!(valor >= 0)) return;
  await supabase
    .from("contas_fixas")
    .update({ valor, dia_vencimento: dia(formData.get("dia")) })
    .eq("id", String(formData.get("id")));
  revalidatePath("/contas-fixas");
}

export async function alternarContaFixa(formData: FormData) {
  const { supabase } = await getContextoCasal();
  await supabase
    .from("contas_fixas")
    .update({ ativa: formData.get("ativa") !== "true" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/contas-fixas");
}

export async function excluirContaFixa(formData: FormData) {
  const { supabase } = await getContextoCasal();
  // Os lançamentos já gerados ficam no histórico, só perdem o vínculo.
  await supabase
    .from("contas_fixas")
    .delete()
    .eq("id", String(formData.get("id")));
  revalidatePath("/contas-fixas");
}
