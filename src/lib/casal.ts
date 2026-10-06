import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getContexto() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membro } = await supabase
    .from("membros")
    .select("casal_id, nome")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    casalId: (membro?.casal_id as string | undefined) ?? null,
    meuNome: (membro?.nome as string | undefined) ?? null,
  };
}

/** Para ações de escrita: exige que o usuário já pertença a um casal. */
export async function getContextoCasal() {
  const ctx = await getContexto();
  if (!ctx.casalId) throw new Error("Usuário sem casal.");
  return { ...ctx, casalId: ctx.casalId };
}
