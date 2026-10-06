const FUSO = "America/Sao_Paulo";

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Data de hoje (YYYY-MM-DD) no fuso de Brasília, independente do servidor. */
export const hoje = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: FUSO });

export const mesAtual = () => hoje().slice(0, 7);

export function mesValido(m?: string | string[]) {
  return typeof m === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(m)
    ? m
    : mesAtual();
}

export function somaMes(m: string, delta: number) {
  const [a, b] = m.split("-").map(Number);
  const d = new Date(a, b - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function nomeMes(m: string) {
  const [a, b] = m.split("-").map(Number);
  return new Date(a, b - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export const formatData = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

/**
 * Aceita valores no padrão brasileiro: "1.234,56", "1234,56", "1.200" (= 1200),
 * "1200" e "12.50" (= 12,5). Ponto seguido de exatamente 3 dígitos é separador de milhar.
 */
export function parseValor(s: string) {
  const limpo = s.trim().replace(/R\$|\s/g, "");
  const milhar = /^-?[1-9]\d{0,2}(\.\d{3})+$/.test(limpo);
  const n = limpo.includes(",")
    ? Number(limpo.replace(/\./g, "").replace(",", "."))
    : milhar
      ? Number(limpo.replace(/\./g, ""))
      : Number(limpo);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

export const diasNoMes = (m: string) => {
  const [a, b] = m.split("-").map(Number);
  return new Date(a, b, 0).getDate();
};

const utc = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export const somaDias = (iso: string, n: number) =>
  new Date(utc(iso) + n * 86400000).toISOString().slice(0, 10);

/** Dias de `a` até `b` (positivo se `b` é depois de `a`). */
export const diffDias = (a: string, b: string) =>
  Math.round((utc(b) - utc(a)) / 86400000);
