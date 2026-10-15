import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finanças do casal",
  description: "Controle financeiro de casa",
  icons: { apple: "/icons/180" },
  // "black" mantém a barra de status do iPhone separada do app (o translúcido deixava o cabeçalho por baixo do relógio).
  appleWebApp: { capable: true, title: "Finanças", statusBarStyle: "black" },
  // O iPhone mais antigo só reconhece esta etiqueta para abrir em tela cheia.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
