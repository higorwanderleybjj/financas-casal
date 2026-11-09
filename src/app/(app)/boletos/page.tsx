import Link from "next/link";
import { CopiarLinha } from "@/components/copiar-linha";
import { getContextoCasal } from "@/lib/casal";
import { brl, diffDias, formatData, hoje, somaDias } from "@/lib/format";
import { alternarPago } from "../lancamentos/actions";

type Boleto = {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  beneficiario: string | null;
  anexo_path: string | null;
  linha_digitavel: string | null;
};

const COLUNAS = "id, descricao, valor, data, beneficiario, anexo_path, linha_digitavel";
const COM_BOLETO = "anexo_path.not.is.null,linha_digitavel.not.is.null";

/** Central de pagamento: todos os boletos lançados e ainda não pagos, com o arquivo e a linha digitável à mão. */
export default async function Boletos() {
  const { supabase } = await getContextoCasal();
  const hojeStr = hoje();

  const [{ data: abertos }, { data: pagos }] = await Promise.all([
    supabase.from("lancamentos").select(COLUNAS).eq("tipo", "saida").eq("pago", false).or(COM_BOLETO).order("data").limit(200),
    supabase
      .from("lancamentos")
      .select(COLUNAS)
      .eq("tipo", "saida")
      .eq("pago", true)
      .or(COM_BOLETO)
      .gte("data", somaDias(hojeStr, -45))
      .order("data", { ascending: false })
      .limit(20),
  ]);
  const aPagar = (abertos ?? []) as Boleto[];
  const jaPagos = (pagos ?? []) as Boleto[];

  // Links temporários (1 hora) dos arquivos guardados no Supabase Storage.
  const caminhos = [...aPagar, ...jaPagos].map((b) => b.anexo_path).filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  if (caminhos.length > 0) {
    const { data } = await supabase.storage.from("boletos").createSignedUrls(caminhos, 3600);
    for (const u of data ?? []) if (u.path && u.signedUrl) urls.set(u.path, u.signedUrl);
  }

  const total = aPagar.reduce((t, b) => t + Number(b.valor), 0);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Boletos a pagar</h2>
        <p className="text-sm opacity-70">
          {aPagar.length === 0
            ? "Nenhum boleto pendente."
            : `${aPagar.length} ${aPagar.length === 1 ? "boleto" : "boletos"}, somando ${brl(total)}. Qualquer um do casal pode abrir, copiar a linha e dar baixa.`}
        </p>
      </div>

      <ul className="space-y-3">
        {aPagar.map((b) => {
          const d = diffDias(hojeStr, b.data);
          const url = b.anexo_path ? urls.get(b.anexo_path) : undefined;
          return (
            <li key={b.id} className="space-y-3 rounded-2xl border border-black/10 p-4 dark:border-white/15">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/lancamentos/${b.id}`} className="min-w-0">
                  <p className="truncate font-medium">{b.descricao || b.beneficiario || "Boleto"}</p>
                  {b.beneficiario && b.beneficiario !== b.descricao && <p className="truncate text-xs opacity-60">{b.beneficiario}</p>}
                  <p className="text-xs">
                    vence {formatData(b.data)} ·{" "}
                    <span className={d < 0 ? "font-semibold text-red-600" : d <= 3 ? "font-semibold text-amber-600" : "opacity-70"}>
                      {d < 0 ? `atrasado ${-d}d` : d === 0 ? "vence hoje" : `em ${d}d`}
                    </span>
                  </p>
                </Link>
                <p className="shrink-0 text-lg font-semibold">{brl(Number(b.valor))}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {url && (
                  <a href={url} target="_blank" rel="noreferrer" className="rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20">
                    Abrir boleto
                  </a>
                )}
                {b.linha_digitavel && <CopiarLinha linha={b.linha_digitavel} compacto />}
                <form action={alternarPago} className="ml-auto">
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="pago" value="false" />
                  <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white">Dar baixa (paguei)</button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>

      {jaPagos.length > 0 && (
        <details className="rounded-2xl border border-black/10 p-3 text-sm dark:border-white/15">
          <summary className="cursor-pointer font-medium">Pagos nos últimos 45 dias ({jaPagos.length})</summary>
          <ul className="mt-2 divide-y divide-black/10 dark:divide-white/10">
            {jaPagos.map((b) => {
              const url = b.anexo_path ? urls.get(b.anexo_path) : undefined;
              return (
                <li key={b.id} className="flex items-center gap-3 py-2">
                  <span className="whitespace-nowrap opacity-60">{formatData(b.data)}</span>
                  <span className="min-w-0 flex-1 truncate">{b.descricao || b.beneficiario || "Boleto"}</span>
                  <span className="whitespace-nowrap">{brl(Number(b.valor))}</span>
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer" className="text-xs underline">
                      ver
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}
