import Link from "next/link";
import { sair } from "@/app/login/actions";
import { getContexto } from "@/lib/casal";

const pilula =
  "rounded-full border border-black/15 px-3 py-1 dark:border-white/20";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { casalId, meuNome, casalNome } = await getContexto();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-4 pb-28">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {casalNome ?? "Finanças do casal"}
          </h1>
          {meuNome && <p className="text-xs opacity-60">Olá, {meuNome}</p>}
        </div>
        <form action={sair}>
          <button className="text-sm underline opacity-70">Sair</button>
        </form>
      </header>

      {casalId ? (
        <>
          <nav className="mb-4 flex flex-wrap gap-2 text-sm">
            <Link href="/" className={pilula}>
              Mês
            </Link>
            <Link href="/contas-fixas" className={pilula}>
              Contas fixas
            </Link>
            <Link href="/cartoes" className={pilula}>
              Cartões
            </Link>
            <Link href="/graficos" className={pilula}>
              Gráficos
            </Link>
            <Link href="/metas" className={pilula}>
              Metas
            </Link>
            <Link href="/categorias" className={pilula}>
              Categorias
            </Link>
          </nav>
          {children}
        </>
      ) : (
        <p className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
          Sua conta ainda não está ligada a um casal. Rode o arquivo
          supabase/seed-casal.sql no Supabase.
        </p>
      )}
    </div>
  );
}
