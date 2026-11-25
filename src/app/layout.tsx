import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"] });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", display: "swap" });

export const metadata: Metadata = {
  title: { default: "PROLOG Intelligence · Stater Group", template: "%s · PROLOG Intelligence" },
  description: "Central de ativação comercial, captação e inteligência de vendas da Stater Group.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f1b2d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${fraunces.variable} ${serif.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
