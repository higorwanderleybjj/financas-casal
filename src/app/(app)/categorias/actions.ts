"use server";

import { revalidatePath } from "next/cache";
import { getContextoCasal } from "@/lib/casal";

export async function criarCategoria(formData: FormData) {
  const { supabase, casalId } = await getContextoCasal();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;
  await supabase.from("categorias").insert({
    casal_id: casalId,
    nome,
    tipo: formData.get("tipo") === "entrada" ? "entrada" : "saida",
    cor: String(formData.get("cor") ?? "#10b981"),
  });
  revalidatePath("/categorias");
}

export async function excluirCategoria(formData: FormData) {
  const { supabase } = await getContextoCasal();
  await supabase
    .from("categorias")
    .delete()
    .eq("id", String(formData.get("id")));
  revalidatePath("/categorias");
  revalidatePath("/");
}
