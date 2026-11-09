"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { extractText, getDocumentProxy } from "unpdf";
import { getContextoCasal } from "@/lib/casal";
import { gerarContasDoMes } from "@/lib/contas-fixas";
import { mesAtual, parseValor, somaMes } from "@/lib/format";

export type ResultadoTexto = { erro: string } | { texto: string };

/** Lê o texto de um PDF de boleto. Quem interpreta o texto (linha digitável, valor, vencimento) é lib/boleto.ts. */
export async function extrairTextoPdf(formData: FormData): Promise<ResultadoTexto> {
  await getContextoCasal();
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha o PDF do boleto." };
  if (arquivo.size > 5_000_000) return { erro: "O arquivo é grande demais (máximo 5 MB)." };
  try {
    const pdf = await getDocumentProxy(new Uint8Array(await arquivo.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: true });
    const texto = (Array.isArray(text) ? text.join("\n") : text).trim();
    if (!texto) return { erro: "Esse PDF é uma imagem, sem texto para ler. Envie uma foto ou um print do boleto, ou digite à mão." };
    return { texto };
  } catch {
    return { erro: "Não consegui abrir esse PDF. Tente uma foto do boleto ou digite à mão." };
  }
}

export type EstadoBoleto = { erro?: string } | undefined;

/**
 * Cria o lançamento do boleto (saída a pagar). Se ele for de uma conta fixa (o aluguel, por exemplo), em vez de
 * criar um repetido atualiza o lançamento daquele mês com o valor e o vencimento reais do boleto.
 */
export async function salvarBoleto(formData: FormData): Promise<EstadoBoleto> {
  const { supabase, casalId } = await getContextoCasal();

  const valor = parseValor(String(formData.get("valor") ?? ""));
  const data = String(formData.get("data") ?? "");
  if (!(valor > 0)) return { erro: "Informe um valor maior que zero." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Data inválida." };

  const anexo = String(formData.get("anexo_path") ?? "");
  const linha = String(formData.get("linha_digitavel") ?? "").replace(/\D/g, "");
  const campos = {
    valor,
    data,
    descricao: String(formData.get("descricao") ?? "").trim().slice(0, 120),
    categoria_id: String(formData.get("categoria_id") ?? "") || null,
    beneficiario: String(formData.get("beneficiario") ?? "").trim().slice(0, 80) || null,
    linha_digitavel: linha.length === 47 || linha.length === 48 ? linha : null,
    // O caminho do arquivo só vale se estiver na pasta do próprio casal.
    anexo_path: anexo.startsWith(`${casalId}/`) && anexo.length < 200 && !anexo.includes("..") ? anexo : null,
  };

  const mes = data.slice(0, 7);
  const contaFixaId = String(formData.get("conta_fixa_id") ?? "");

  if (contaFixaId) {
    const { data: conta } = await supabase.from("contas_fixas").select("id, nome, categoria_id").eq("id", contaFixaId).maybeSingle();
    if (!conta) return { erro: "Conta fixa não encontrada." };
    if (mes <= somaMes(mesAtual(), 1)) await gerarContasDoMes(supabase, casalId, mes);

    const { data: existente } = await supabase
      .from("lancamentos")
      .select("id")
      .eq("conta_fixa_id", contaFixaId)
      .gte("data", `${mes}-01`)
      .lt("data", `${somaMes(mes, 1)}-01`)
      .maybeSingle();

    const completo = { ...campos, descricao: campos.descricao || conta.nome, categoria_id: campos.categoria_id ?? conta.categoria_id };
    const { error } = existente
      ? await supabase.from("lancamentos").update(completo).eq("id", existente.id)
      : await supabase.from("lancamentos").insert({ ...completo, casal_id: casalId, tipo: "saida", pago: false, conta_fixa_id: contaFixaId });
    if (error) return { erro: "Não foi possível salvar. Tente de novo." };
  } else {
    const { error } = await supabase
      .from("lancamentos")
      .insert({ ...campos, descricao: campos.descricao || campos.beneficiario || "Boleto", casal_id: casalId, tipo: "saida", pago: false });
    if (error) return { erro: "Não foi possível salvar. Rode o arquivo supabase/migracoes/003-boletos.sql no Supabase, se ainda não rodou." };
  }

  revalidatePath("/");
  redirect(`/?mes=${mes}`);
}
