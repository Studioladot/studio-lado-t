import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { THEME_STORAGE_KEY } from "@/components/features/theme-toggle";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gotix - Sistema Operativo de Negocios",
  description: "Gotix",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <head>
        {/* Setea data-theme antes de hidratar para no parpadear entre modos
            en la carga inicial — mismo problema que resuelve applyDarkModePref()
            en el legado, adaptado a la estrategia beforeInteractive de Next. */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('${THEME_STORAGE_KEY}')==='dark'){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
