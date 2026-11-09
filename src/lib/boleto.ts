/**
 * Leitura de boleto a partir do texto do PDF (ou do texto reconhecido de uma foto).
 * Tudo roda local, sem serviço externo: acha a linha digitável (47 dígitos, boleto bancário, ou 48, conta de
 * consumo como luz, água e internet), tira dela o valor e o vencimento, e completa com os rótulos do texto.
 * Quando a linha digitável existe, ela manda no valor e na data (são codificados nela), e o texto serve de conferência.
 */

export type BoletoLido = {
  linha: string | null; // só dígitos
  tipo: "bancario" | "consumo" | null;
  valor: number | null;
  vencimento: string | null; // YYYY-MM-DD
  beneficiario: string | null;
  avisos: string[];
};

const so = (s: string) => s.replace(/\D/g, "");
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Módulo 10 dos campos da linha digitável (pesos 2 e 1 da direita para a esquerda). */
function dvMod10(campo: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = campo.length - 1; i >= 0; i--) {
    const p = Number(campo[i]) * peso;
    soma += p > 9 ? Math.floor(p / 10) + (p % 10) : p;
    peso = peso === 2 ? 1 : 2;
  }
  return (10 - (soma % 10)) % 10;
}

/**
 * O fator de vencimento conta dias desde 07/10/1997 e recomeçou em 1000 no dia 22/02/2025.
 * Como cabem duas datas, vale a que estiver perto de hoje.
 */
export function dataDoFator(fator: number, hoje: Date = new Date()): string | null {
  if (fator < 1000) return null;
  const antiga = new Date(Date.UTC(1997, 9, 7) + fator * 86400000);
  const nova = new Date(Date.UTC(2025, 1, 22) + (fator - 1000) * 86400000);
  const dist = (d: Date) => Math.abs(d.getTime() - hoje.getTime());
  const melhor = dist(antiga) <= dist(nova) ? antiga : nova;
  return dist(melhor) < 1000 * 86400000 ? iso(melhor) : null;
}

function lerBancario(d: string, hoje: Date): Pick<BoletoLido, "valor" | "vencimento"> | null {
  if (d.length !== 47) return null;
  const ok =
    dvMod10(d.slice(0, 9)) === Number(d[9]) &&
    dvMod10(d.slice(10, 20)) === Number(d[20]) &&
    dvMod10(d.slice(21, 31)) === Number(d[31]);
  if (!ok) return null;
  const valor = Number(d.slice(37)) / 100;
  return { valor: valor > 0 ? valor : null, vencimento: dataDoFator(Number(d.slice(33, 37)), hoje) };
}

/** Módulo 11 dos blocos da conta de consumo: pesos 2 a 9 da direita para a esquerda; resto 0 ou 1 vira 0. */
function dvMod11(campo: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = campo.length - 1; i >= 0; i--) {
    soma += Number(campo[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto <= 1 ? 0 : 11 - resto;
}

function lerConsumo(d: string): Pick<BoletoLido, "valor" | "vencimento"> | null {
  if (d.length !== 48 || d[0] !== "8") return null;
  // 4 blocos de 11 dígitos, cada um seguido do seu dígito verificador.
  const blocos = [0, 12, 24, 36].map((i) => d.slice(i, i + 11));
  const barras = blocos.join("");
  const dvOk = [0, 12, 24, 36].every((i) => (barras[2] === "6" || barras[2] === "7" ? dvMod10(d.slice(i, i + 11)) : dvMod11(d.slice(i, i + 11))) === Number(d[i + 11]));
  if (!dvOk) return null;
  const efetivo = barras[2] === "6" || barras[2] === "7"; // 8 e 9 são valor de referência
  const valor = efetivo ? Number(barras.slice(4, 15)) / 100 : null;
  return { valor: valor && valor > 0 ? valor : null, vencimento: null };
}

/** A linha digitável passa na conferência dos dígitos verificadores? */
const valida = (d: string, hoje: Date) => (d.length === 47 ? lerBancario(d, hoje) !== null : d.length === 48 ? lerConsumo(d) !== null : false);

/**
 * Procura a linha digitável no texto: 47 ou 48 dígitos, com pontos, espaços e hífens no meio. Primeiro só dentro de
 * uma linha do texto; se não achar, aceita quebra de linha no meio. Se o número vier colado em outros, testa as janelas.
 */
export function acharLinha(texto: string, hoje: Date = new Date()): string | null {
  let primeira: string | null = null;
  for (const regex of [/\d[\d.\- 	]{44,70}\d/g, /\d[\d.\-\s]{44,70}\d/g]) {
    for (const m of texto.matchAll(regex)) {
      const d = so(m[0]);
      const janelas: string[] = [];
      if (d.length === 47 || d.length === 48) janelas.push(d);
      else if (d.length > 48) {
        for (let i = 0; i + 47 <= d.length; i++) {
          janelas.push(d.slice(i, i + 47));
          if (d[i] === "8" && i + 48 <= d.length) janelas.push(d.slice(i, i + 48));
        }
      }
      for (const j of janelas) {
        if (valida(j, hoje)) return j;
        if (!primeira && (j.length === 47 || (j.length === 48 && j[0] === "8")) && janelas.length === 1) primeira = j;
      }
    }
  }
  return primeira;
}

const ROTULO_VALOR = /(?:valor\s+do\s+documento|valor\s+cobrado|total\s+a\s+pagar|valor\s+a\s+pagar|valor\s+total|\(=\)\s*valor)[^\d]{0,40}(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i;
const ROTULO_VENC = /(?:vencimento|venc\.?)[^\d]{0,40}(\d{2}\/\d{2}\/\d{4})/i;

const dataBR = (s: string) => {
  const [d, m, a] = s.split("/");
  return `${a}-${m}-${d}`;
};
const numeroBR = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

/** Quem cobra: o texto depois de "Beneficiário", "Cedente" ou "Razão social", ou a primeira linha com nome. */
function acharBeneficiario(texto: string): string | null {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const limpa = (s: string) =>
    s
      .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "")
      .replace(/\b(cnpj|cpf)\b.*$/i, "")
      .replace(/^[\s:\-–]+|[\s:\-–]+$/g, "")
      .replace(/\s{2,}/g, " ")
      .slice(0, 60);
  for (let i = 0; i < linhas.length; i++) {
    const m = linhas[i].match(/^(?:benefici[aá]rio|cedente|raz[aã]o\s+social|nome\s+do\s+benefici[aá]rio)\s*[:\-]?\s*(.*)$/i);
    if (m) {
      const r = limpa(m[1] || linhas[i + 1] || "");
      if (r.length >= 3 && /[a-zA-ZÀ-ú]{3}/.test(r)) return r;
    }
  }
  const primeira = linhas.find((l) => /[a-zA-ZÀ-ú]{4}/.test(l) && !/^\d/.test(l) && !/boleto|recibo|pagador|vencimento|\d{5}\.\d{5}/i.test(l));
  return primeira ? limpa(primeira) : null;
}

export function lerBoleto(texto: string, hoje: Date = new Date()): BoletoLido {
  const avisos: string[] = [];
  const linha = acharLinha(texto, hoje);
  const bancario = linha ? lerBancario(linha, hoje) : null;
  const consumo = linha ? lerConsumo(linha) : null;
  const dela = bancario ?? consumo;

  const textoValor = texto.match(ROTULO_VALOR);
  const textoVenc = texto.match(ROTULO_VENC);
  const valorTexto = textoValor ? numeroBR(textoValor[1]) : null;
  const vencTexto = textoVenc ? dataBR(textoVenc[1]) : null;

  let valor = dela?.valor ?? valorTexto;
  let vencimento = dela?.vencimento ?? vencTexto;

  if (linha && !dela) avisos.push("Achei uma linha digitável, mas ela não passou na conferência. Confira valor e vencimento.");
  if (dela?.valor && valorTexto && Math.abs(dela.valor - valorTexto) > 0.005) {
    avisos.push(`O valor da linha digitável (${dela.valor.toFixed(2)}) é diferente do que está escrito no boleto (${valorTexto.toFixed(2)}). Usei o da linha digitável.`);
  }
  if (dela?.vencimento && vencTexto && dela.vencimento !== vencTexto) {
    avisos.push("O vencimento da linha digitável é diferente do que está escrito no boleto. Usei o da linha digitável.");
  }
  if (!valor) avisos.push("Não consegui ler o valor. Digite à mão.");
  if (!vencimento) avisos.push("Não consegui ler o vencimento. Digite à mão.");
  if (valor !== null && !(valor > 0)) valor = null;
  if (vencimento && !/^\d{4}-\d{2}-\d{2}$/.test(vencimento)) vencimento = null;

  return {
    linha,
    tipo: bancario ? "bancario" : consumo ? "consumo" : null,
    valor,
    vencimento,
    beneficiario: acharBeneficiario(texto),
    avisos,
  };
}

/** Linha digitável para ler e copiar: grupos separados por espaço. */
export function formatarLinha(d: string): string {
  if (d.length === 47) return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d[32]} ${d.slice(33)}`;
  if (d.length === 48) return [0, 12, 24, 36].map((i) => d.slice(i, i + 12)).join(" ");
  return d;
}

const normaliza = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Qual conta fixa parece ser esta? Casa pelo nome (aluguel, luz...) contido no beneficiário ou no contrário. */
export function sugerirContaFixa<T extends { id: string; nome: string }>(beneficiario: string | null, contas: T[]): T | null {
  if (!beneficiario) return null;
  const b = normaliza(beneficiario);
  for (const c of contas) {
    const n = normaliza(c.nome);
    if (n.length >= 3 && (b.includes(n) || n.includes(b))) return c;
  }
  // Palavra em comum de pelo menos 4 letras (ex.: "Energia" em "CELESC Distribuição Energia").
  const palavras = new Set(b.split(" ").filter((p) => p.length >= 4));
  return contas.find((c) => normaliza(c.nome).split(" ").some((p) => p.length >= 4 && palavras.has(p))) ?? null;
}
