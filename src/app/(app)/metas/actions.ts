"use server";

import { revalidatePath } from "next/cache";
import { getContextoCasal } from "@/lib/casal";
import { parseValor } from "@/lib/format";

/** Um limite por categoria: se já existe, atualiza o valor. */
export async function definirLimite(formData: FormData) {
  const { supabase, casalId } = await getContextoCasal();
  const categoriaId = String(formData.get("categoria_id") ?? "");
  const valor = parseValor(String(formData.get("valor") ?? ""));
  if (!categoriaId || !(valor > 0)) return;

  const { data: existente } = await supabase
    .from("metas")
    .select("id")
    .eq("tipo", "limite_categoria")
    .eq("categoria_id", categoriaId)
    .maybeSingle();

  if (existente) {
    await supabase.from("metas").update({ valor_alvo: valor }).eq("id", existente.id);
  } else {
    const { data: cat } = await supabase
      .from("categorias")
      .select("nome")
      .eq("id", categoriaId)
      .maybeSingle();
    await supabase.from("metas").insert({
      casal_id: casalId,
      tipo: "limite_categoria",
      nome: cat?.nome ?? "Limite",
      categoria_id: categoriaId,
      valor_alvo: valor,
    });
  }
  revalidatePath("/metas");
}

export async function criarPoupanca(formData: FormData) {
  const { supabase, casalId } = await getContextoCasal();
  const nome = String(formData.get("nome") ?? "").trim();
  const alvo = parseValor(String(formData.get("alvo") ?? ""));
  const atual = parseValor(String(formData.get("atual") ?? "")) || 0;
  if (!nome || !(alvo > 0)) return;

  await supabase.from("metas").insert({
    casal_id: casalId,
    tipo: "poupanca",
    nome,
    valor_alvo: alvo,
    valor_atual: Math.max(0, atual),
  });
  revalidatePath("/metas");
}

/** Soma (ou, com valor negativo, retira) um valor do que já foi guardado. */
export async function aportar(formData: FormData) {
  const { supabase } = await getContextoCasal();
  const id = String(formData.get("id"));
  const valor = parseValor(String(formData.get("valor") ?? ""));
  if (!Number.isFinite(valor) || valor === 0) return;

  const { data: meta } = await supabase
    .from("metas")
    .select("valor_atual")
    .eq("id", id)
    .maybeSingle();
  if (!meta) return;

  await supabase
    .from("metas")
    .update({ valor_atual: Math.max(0, Number(meta.valor_atual) + valor) })
    .eq("id", id);
  revalidatePath("/metas");
}

export async function excluirMeta(formData: FormData) {
  const { supabase } = await getContextoCasal();
  await supabase.from("metas").delete().eq("id", String(formData.get("id")));
  revalidatePath("/metas");
}
