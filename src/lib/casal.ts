import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Uma única verificação de login e uma única consulta de casal por requisição
 * (cache do React), compartilhadas entre o layout e a página.
 * `getClaims` valida o token localmente, sem ir ao Supabase a cada clique.
 */
export const getContexto = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: membro } = await supabase
    .from("membros")
    .select("casal_id, nome, casais(nome)")
    .eq("user_id", userId)
    .maybeSingle();

  const casal = membro?.casais as unknown as { nome: string } | null | undefined;

  return {
    supabase,
    userId,
    casalId: (membro?.casal_id as string | undefined) ?? null,
    meuNome: (membro?.nome as string | undefined) ?? null,
    casalNome: casal?.nome ?? null,
  };
});

/** Para ações de escrita: exige que o usuário já pertença a um casal. */
export async function getContextoCasal() {
  const ctx = await getContexto();
  if (!ctx.casalId) throw new Error("Usuário sem casal.");
  return { ...ctx, casalId: ctx.casalId };
}
