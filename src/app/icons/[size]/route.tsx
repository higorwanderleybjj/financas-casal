import { ImageResponse } from "next/og";

const TAMANHOS = [180, 192, 512];

/**
 * Ícone do app: degradê verde e azul, três barras de crescimento e uma moeda com R$.
 * Tudo cabe no círculo central (80%), então não é cortado quando o Android arredonda o ícone.
 */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/icons/[size]">,
) {
  const { size } = await ctx.params;
  const lado = Number(size);
  if (!TAMANHOS.includes(lado)) return new Response("Not found", { status: 404 });

  const u = lado / 512; // unidade: tudo é desenhado numa grade de 512
  const px = (n: number) => Math.round(n * u * 100) / 100;

  const barra = (esq: number, alt: number, cor: string) => (
    <div
      style={{
        position: "absolute",
        left: px(esq),
        top: px(390 - alt),
        width: px(54),
        height: px(alt),
        borderRadius: px(14),
        background: cor,
        display: "flex",
      }}
    />
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)",
        }}
      >
        {/* brilho suave no canto */}
        <div
          style={{
            position: "absolute",
            left: px(250),
            top: px(-110),
            width: px(380),
            height: px(380),
            borderRadius: 9999,
            background: "rgba(255,255,255,0.14)",
            display: "flex",
          }}
        />

        {barra(94, 96, "rgba(255,255,255,0.45)")}
        {barra(166, 150, "rgba(255,255,255,0.62)")}
        {barra(238, 212, "rgba(255,255,255,0.8)")}

        {/* moeda */}
        <div
          style={{
            position: "absolute",
            left: px(250),
            top: px(112),
            width: px(168),
            height: px(168),
            borderRadius: 9999,
            background: "linear-gradient(160deg, #fde68a 0%, #f59e0b 100%)",
            border: `${px(10)}px solid #fff7d6`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#7c4a03",
            fontSize: px(66),
            fontWeight: 800,
            letterSpacing: px(-2),
          }}
        >
          R$
        </div>
      </div>
    ),
    { width: lado, height: lado },
  );
}
