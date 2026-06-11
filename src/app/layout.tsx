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
  title: "Calendario Mundial de Fútbol 2026 | Suscripción Webcal Actualizable",
  description: "Suscríbete de forma fácil y gratuita al calendario completo del Mundial de Fútbol Canadá, México y EE. UU. 2026. Horarios locales automáticos y actualización en tiempo real.",
  openGraph: {
    title: "Calendario Mundial de Fútbol 2026",
    description: "Los 104 partidos del Mundial 2026 en tu calendario, con horarios en tu zona horaria y marcadores actualizados automáticamente.",
    type: "website",
    locale: "es_ES",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#090a0f" },
  ],
};

// Apply the saved theme before first paint to avoid a light-theme flash
const themeInitScript = `(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark-theme');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <div className="tricolor-bar" aria-hidden="true"></div>
        {children}
        <footer className="site-footer container">
          <p>
            Plataforma informativa no oficial. No está afiliada a la FIFA ni a sus socios.
            Los nombres de equipos, estadios y marcas pertenecen a sus respectivos dueños.
          </p>
          <p>
            Datos de partidos: <a href="https://worldcup26.ir" target="_blank" rel="noreferrer">worldcup26.ir</a>
            {" · "}Banderas: <a href="https://flagcdn.com" target="_blank" rel="noreferrer">flagcdn.com</a>
            {" · "}Mundial de Fútbol Canadá · México · EE. UU. 2026
          </p>
        </footer>
      </body>
    </html>
  );
}
