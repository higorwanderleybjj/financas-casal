"use client";

import { useRef, useState, useTransition } from "react";
import { extrairTextoPdf, salvarBoleto } from "@/app/(app)/lancamentos/boleto/actions";
import { formatarLinha, lerBoleto, sugerirContaFixa, type BoletoLido } from "@/lib/boleto";
import { createClient } from "@/lib/supabase/client";

type Categoria = { id: string; nome: string };
type ContaFixa = { id: string; nome: string; categoria_id: string | null };

const campo = "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

/** Reduz uma foto grande (3 a 5 MB do celular) para algo leve, sem perder a leitura do boleto. */
async function comprimir(arquivo: File): Promise<File> {
  if (!arquivo.type.startsWith("image/")) return arquivo;
  try {
    const bmp = await createImageBitmap(arquivo);
    const escala = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    return blob ? new File([blob], arquivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : arquivo;
  } catch {
    return arquivo;
  }
}

export function FormBoleto({
  casalId,
  categorias,
  contasFixas,
  hoje,
}: {
  casalId: string;
  categorias: Categoria[];
  contasFixas: ContaFixa[];
  hoje: string;
}) {
  const seletor = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [fase, setFase] = useState<"vazio" | "lendo" | "pronto">("vazio");
  const [erro, setErro] = useState("");
  const [avisos, setAvisos] = useState<string[]>([]);
  const [lido, setLido] = useState<BoletoLido | null>(null);
  const [pendente, comecar] = useTransition();

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje);
  const [categoriaId, setCategoriaId] = useState("");
  const [contaFixaId, setContaFixaId] = useState("");

  async function escolher(f: File | undefined) {
    if (!f) return;
    setErro("");
    setAvisos([]);
    setArquivo(f);
    setFase("lendo");

    let texto = "";
    try {
      if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
        const dados = new FormData();
        dados.set("arquivo", f);
        const r = await extrairTextoPdf(dados);
        if ("erro" in r) setErro(r.erro);
        else texto = r.texto;
      } else if (f.type.startsWith("image/")) {
        // Reconhecimento de texto no próprio aparelho (nada é enviado a serviço externo).
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("por");
        try {
          texto = (await worker.recognize(await comprimir(f))).data.text;
        } finally {
          await worker.terminate();
        }
        if (!texto.trim()) setErro("Não consegui ler texto nessa imagem. Tente uma foto mais nítida ou digite à mão.");
      } else {
        setErro("Escolha um PDF ou uma imagem do boleto.");
      }
    } catch {
      setErro("Não consegui ler esse arquivo. Digite os dados à mão.");
    }

    const r = lerBoleto(texto);
    setLido(r);
    setAvisos(r.avisos);
    const conta = sugerirContaFixa(r.beneficiario, contasFixas);
    setDescricao(conta?.nome ?? r.beneficiario ?? "");
    setValor(r.valor ? String(r.valor).replace(".", ",") : "");
    setData(r.vencimento ?? hoje);
    setContaFixaId(conta?.id ?? "");
    setCategoriaId(conta?.categoria_id ?? "");
    setFase("pronto");
  }

  function trocarContaFixa(id: string) {
    setContaFixaId(id);
    const c = contasFixas.find((x) => x.id === id);
    if (c) {
      if (!descricao) setDescricao(c.nome);
      if (c.categoria_id) setCategoriaId(c.categoria_id);
    }
  }

  function salvar() {
    setErro("");
    comecar(async () => {
      let anexo = "";
      if (arquivo) {
        const final = await comprimir(arquivo);
        const ext = final.type === "application/pdf" ? "pdf" : final.type === "image/png" ? "png" : "jpg";
        const caminho = `${casalId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await createClient().storage.from("boletos").upload(caminho, final, { contentType: final.type });
        if (error) {
          if (!window.confirm("Não consegui guardar o arquivo do boleto. Salvar o lançamento mesmo assim, sem o arquivo?")) return;
        } else anexo = caminho;
      }
      const dados = new FormData();
      dados.set("descricao", descricao);
      dados.set("valor", valor);
      dados.set("data", data);
      dados.set("categoria_id", categoriaId);
      dados.set("conta_fixa_id", contaFixaId);
      dados.set("beneficiario", lido?.beneficiario ?? "");
      dados.set("linha_digitavel", lido?.linha ?? "");
      dados.set("anexo_path", anexo);
      const r = await salvarBoleto(dados);
      if (r?.erro) setErro(r.erro);
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-2xl border-2 border-dashed border-black/20 p-5 text-center text-sm dark:border-white/25">
        <p>
          Escolha o <strong>PDF</strong> do boleto, ou tire uma <strong>foto</strong>. O app lê o valor, o vencimento e quem
          cobra.
        </p>
        <input
          ref={seletor}
          type="file"
          accept="application/pdf,image/*"
          className="sr-only"
          onChange={(e) => {
            void escolher(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button type="button" onClick={() => seletor.current?.click()} className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white">
          {arquivo ? "Escolher outro arquivo" : "Escolher o boleto"}
        </button>
        {arquivo && <p className="truncate text-xs opacity-70">{arquivo.name}</p>}
        {fase === "lendo" && <p className="text-xs opacity-70">Lendo o boleto... (foto pode levar alguns segundos)</p>}
      </div>

      {erro && <p className="rounded-xl border border-red-600/40 bg-red-600/10 p-3 text-sm text-red-600">{erro}</p>}
      {avisos.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}

      {fase === "pronto" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
          className="space-y-4"
        >
          {lido?.linha && (
            <p className="break-all rounded-xl bg-black/5 p-3 text-xs dark:bg-white/10">
              Linha digitável: <span className="font-mono">{formatarLinha(lido.linha)}</span>
            </p>
          )}

          <label className="block space-y-1 text-sm">
            Valor (R$)
            <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" required placeholder="0,00" className={`${campo} text-2xl font-semibold`} />
          </label>

          <label className="block space-y-1 text-sm">
            Descrição
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: aluguel, luz, internet" className={campo} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-sm">
              Vencimento
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} required className={campo} />
            </label>
            <label className="block space-y-1 text-sm">
              Categoria
              <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={campo}>
                <option value="">Sem categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1 text-sm">
            É de uma conta fixa?
            <select value={contaFixaId} onChange={(e) => trocarContaFixa(e.target.value)} className={campo}>
              <option value="">Não, é um boleto avulso</option>
              {contasFixas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <span className="block text-xs opacity-60">
              Se for (como o aluguel), o app atualiza o valor e o vencimento da conta daquele mês, em vez de criar uma repetida.
            </span>
          </label>

          <button disabled={pendente} className="w-full rounded-lg bg-emerald-600 px-3 py-3 font-medium text-white disabled:opacity-60">
            {pendente ? "Salvando..." : "Lançar boleto (a pagar)"}
          </button>
        </form>
      )}
    </div>
  );
}
