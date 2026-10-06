import type { SupabaseClient } from "@supabase/supabase-js";
import { diasNoMes, mesAtual, somaMes } from "@/lib/format";

/**
 * Cria, para o mês informado, o lançamento (pendente) de cada conta fixa ativa
 * que ainda não tem um. Idempotente. Não gera além do mês que vem.
 */
export async function gerarContasDoMes(
  supabase: SupabaseClient,
  casalId: string,
  mes: string,
) {
  if (mes > somaMes(mesAtual(), 1)) return;

  const [{ data: contas }, { data: existentes }] = await Promise.all([
    supabase
      .from("contas_fixas")
      .select("id, nome, valor, dia_vencimento, categoria_id")
      .eq("ativa", true),
    supabase
      .from("lancamentos")
      .select("conta_fixa_id")
      .not("conta_fixa_id", "is", null)
      .gte("data", `${mes}-01`)
      .lt("data", `${somaMes(mes, 1)}-01`),
  ]);
  if (!contas?.length) return;

  const ja = new Set((existentes ?? []).map((e) => e.conta_fixa_id));
  const ultimoDia = diasNoMes(mes);

  const novos = contas
    .filter((c) => !ja.has(c.id))
    .map((c) => ({
      casal_id: casalId,
      tipo: "saida",
      valor: c.valor,
      data: `${mes}-${String(Math.min(c.dia_vencimento, ultimoDia)).padStart(2, "0")}`,
      descricao: c.nome,
      categoria_id: c.categoria_id,
      conta_fixa_id: c.id,
      pago: false,
    }));

  if (novos.length) await supabase.from("lancamentos").insert(novos);
}
