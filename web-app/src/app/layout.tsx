import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { THEME_STORAGE_KEY } from "@/lib/theme-storage-key";
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
      <body className="min-h-full flex flex-col">
        {/* Setea data-theme antes de hidratar para no parpadear entre modos
            en la carga inicial — mismo problema que resuelve applyDarkModePref()
            en el legado.
            Bug real encontrado (2026-08-06, rompía TODA la plataforma incluso
            /terms y /privacy-policy): THEME_STORAGE_KEY se importaba desde
            theme-toggle.tsx, un módulo 'use client'. React Server Components
            serializa CUALQUIER export de un módulo 'use client' —incluida una
            simple constante string— como una referencia opaca de cliente; al
            interpolarla acá del lado del servidor, lo que terminaba en el
            <script> no era 'gotix_theme' sino el texto de una función-stub
            de error ("Attempted to call THEME_STORAGE_KEY() from the
            server..."), con comillas/paréntesis sin escapar que rompían la
            sintaxis del script entero ("missing ) after argument list").
            Fix: la constante ahora vive en src/lib/theme-storage-key.ts, un
            módulo sin 'use client', para que tanto este Server Component
            como ThemeToggle importen el mismo string real. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('${THEME_STORAGE_KEY}')==='dark'){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
