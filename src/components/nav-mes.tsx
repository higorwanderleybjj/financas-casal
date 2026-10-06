import Link from "next/link";
import { nomeMes, somaMes } from "@/lib/format";

export function NavMes({ base, mes }: { base: string; mes: string }) {
  return (
    <div className="flex items-center justify-between">
      <Link
        href={`${base}?mes=${somaMes(mes, -1)}`}
        className="px-3 py-1 text-lg"
        aria-label="Mês anterior"
      >
        ‹
      </Link>
      <h2 className="text-lg font-semibold first-letter:uppercase">
        {nomeMes(mes)}
      </h2>
      <Link
        href={`${base}?mes=${somaMes(mes, 1)}`}
        className="px-3 py-1 text-lg"
        aria-label="Próximo mês"
      >
        ›
      </Link>
    </div>
  );
}
