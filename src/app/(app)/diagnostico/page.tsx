import Link from "next/link";
import { Diagnostico } from "@/components/diagnostico";

export default function Velocidade() {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Velocidade do app</h2>
        <Link href="/" className="text-sm underline opacity-70">
          Voltar
        </Link>
      </div>
      <Diagnostico />
    </section>
  );
}
