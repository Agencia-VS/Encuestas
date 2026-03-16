import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Encuesta Mundial | Agencia VS",
  description: "Encuesta oficial de Agencia VS",
  icons: {
    icon: [{ url: "/LogoVs.png", type: "image/png" }],
    shortcut: "/LogoVs.png",
    apple: "/LogoVs.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${montserrat.variable} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
