import { ImageResponse } from "next/og";

const TAMANHOS = [180, 192, 512];

export async function GET(
  _req: Request,
  ctx: RouteContext<"/icons/[size]">,
) {
  const { size } = await ctx.params;
  const lado = Number(size);
  if (!TAMANHOS.includes(lado)) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#059669",
          color: "white",
          fontSize: lado * 0.46,
          fontWeight: 800,
          letterSpacing: -lado * 0.02,
        }}
      >
        R$
      </div>
    ),
    { width: lado, height: lado },
  );
}
