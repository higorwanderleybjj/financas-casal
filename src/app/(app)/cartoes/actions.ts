"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContextoCasal } from "@/lib/casal";
import { dividirParcelas, vencimentoDaCompra } from "@/lib/cartao";
import { parseValor } from "@/lib/format";

export type EstadoForm = { erro?: string } | undefined;

const dia = (v: FormDataEntryValue | null) =>
  Math.min(31, Math.max(1, parseInt(String(v ?? ""), 10) || 1));

export async function criarCartao(formData: FormData) {
  const { supabase, casalId } = await getContextoCasal();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;
  const limite = parseValor(String(formData.get("limite") ?? ""));

  await supabase.from("cartoes").insert({
    casal_id: casalId,
    nome,
    dia_fechamento: dia(formData.get("fechamento")),
    dia_vencimento: dia(formData.get("vencimento")),
    limite: limite > 0 ? limite : null,
  });
  revalidatePath("/cartoes");
}

/** Arquiva em vez de apagar, para não soltar as compras do cartão. */
export async function arquivarCartao(formData: FormData) {
  const { supabase } = await getContextoCasal();
  await supabase
    .from("cartoes")
    .update({ ativo: false })
    .eq("id", String(formData.get("id")));
  revalidatePath("/cartoes");
}

export async function criarCompra(
  _: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { supabase, casalId } = await getContextoCasal();

  const cartaoId = String(formData.get("cartao_id") ?? "");
  const total = parseValor(String(formData.get("valor") ?? ""));
  const data = String(formData.get("data") ?? "");
  const n = Math.min(48, Math.max(1, parseInt(String(formData.get("parcelas")), 10) || 1));

  if (!(total > 0)) return { erro: "Informe um valor maior que zero." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Data inválida." };

  const { data: cartao } = await supabase
    .from("cartoes")
    .select("dia_fechamento, dia_vencimento")
    .eq("id", cartaoId)
    .maybeSingle();
  if (!cartao) return { erro: "Cartão não encontrado." };

  const descricao = String(formData.get("descricao") ?? "").trim() || "Compra no cartão";
  const categoria_id = String(formData.get("categoria_id") ?? "") || null;
  const grupo = n > 1 ? crypto.randomUUID() : null;
  const valores = dividirParcelas(total, n);

  const linhas = valores.map((valor, i) => ({
    casal_id: casalId,
    tipo: "saida",
    valor,
    data: vencimentoDaCompra(data, cartao.dia_fechamento, cartao.dia_vencimento, i),
    data_compra: data,
    descricao: n > 1 ? `${descricao} (${i + 1}/${n})` : descricao,
    categoria_id,
    cartao_id: cartaoId,
    pago: false,
    parcela_grupo: grupo,
    parcela_num: n > 1 ? i + 1 : null,
    parcela_total: n > 1 ? n : null,
  }));

  const { error } = await supabase.from("lancamentos").insert(linhas);
  if (error) return { erro: "Não foi possível salvar a compra." };

  revalidatePath("/");
  revalidatePath("/cartoes");
  redirect(`/cartoes/${cartaoId}?mes=${linhas[0].data.slice(0, 7)}`);
}

export async function pagarFatura(formData: FormData) {
  const { supabase } = await getContextoCasal();
  const cartaoId = String(formData.get("cartao_id"));
  const mes = String(formData.get("mes"));
  const pago = formData.get("pago") === "true";

  const [a, m] = mes.split("-").map(Number);
  const prox = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;

  await supabase
    .from("lancamentos")
    .update({ pago })
    .eq("cartao_id", cartaoId)
    .gte("data", `${mes}-01`)
    .lt("data", `${prox}-01`);

  revalidatePath("/");
  revalidatePath("/cartoes");
  revalidatePath(`/cartoes/${cartaoId}`);
}

export async function excluirCompra(formData: FormData) {
  const { supabase } = await getContextoCasal();
  const grupo = String(formData.get("grupo") ?? "");
  const todas = formData.get("todas") === "1" && grupo;

  const q = supabase.from("lancamentos").delete();
  await (todas ? q.eq("parcela_grupo", grupo) : q.eq("id", String(formData.get("id"))));

  revalidatePath("/");
  revalidatePath("/cartoes");
  revalidatePath(`/cartoes/${String(formData.get("cartao_id"))}`);
}
