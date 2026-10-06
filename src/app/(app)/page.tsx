import { createClient } from "@/lib/supabase/server";
import { sair } from "@/app/login/actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: casal } = await supabase
    .from("casais")
    .select("nome")
    .maybeSingle();

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{casal?.nome ?? "Finanças do casal"}</h1>
        <form action={sair}>
          <button className="text-sm underline">Sair</button>
        </form>
      </header>
      <p className="text-sm opacity-70">Logado como {user?.email}</p>
      {!casal && (
        <p className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
          Sua conta ainda não está ligada a um casal. Rode o arquivo
          supabase/seed-casal.sql no Supabase.
        </p>
      )}
    </main>
  );
}
