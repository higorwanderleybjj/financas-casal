import { diasNoMes, somaMes } from "@/lib/format";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Data de vencimento da fatura em que cai uma compra.
 * - Compra no dia do fechamento ou depois vai para o ciclo seguinte.
 * - Se o vencimento é depois do fechamento, vence no mesmo mês do ciclo;
 *   senão, no mês seguinte.
 * `parcela` (0 = primeira) empurra para as faturas futuras.
 */
export function vencimentoDaCompra(
  compra: string,
  fechamento: number,
  vencimento: number,
  parcela = 0,
) {
  const [a, m, d] = compra.split("-").map(Number);
  let mes = `${a}-${pad(m)}`;
  if (d >= Math.min(fechamento, diasNoMes(mes))) mes = somaMes(mes, 1);
  if (vencimento <= fechamento) mes = somaMes(mes, 1);
  mes = somaMes(mes, parcela);
  return `${mes}-${pad(Math.min(vencimento, diasNoMes(mes)))}`;
}

/** Divide o total em parcelas em centavos; a sobra fica na primeira. */
export function dividirParcelas(total: number, n: number) {
  const centavos = Math.round(total * 100);
  const base = Math.floor(centavos / n);
  const resto = centavos - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i === 0 ? resto : 0)) / 100);
}
