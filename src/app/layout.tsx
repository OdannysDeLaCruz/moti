import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import MapboxAbortSuppressor from "@/components/MapboxAbortSuppressor";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Motu – Carreras y domicilios en tiempo real",
  description:
    "Conecta con conductores verificados en moto o bici. Rápido, seguro y económico.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Motu",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta property="og:image" content="<generated>" />
        <meta property="og:image:type" content="<generated>" />
        <meta property="og:image:width" content="<generated>" />
        <meta property="og:image:height" content="<generated>" />

        <meta name="twitter:image" content="<generated>" />
        <meta name="twitter:image:type" content="<generated>" />
        <meta name="twitter:image:width" content="<generated>" />
        <meta name="twitter:image:height" content="<generated>" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="apple-touch-icon" href="/icons/apple-icon.png"></link>
        <link rel="apple-touch-icon" sizes="57x57" href="/icons/apple-icon-57x57.png"></link>
        <link rel="apple-touch-icon" sizes="60x60" href="/icons/apple-icon-60x60.png"></link>
        <link rel="apple-touch-icon" sizes="72x72" href="/icons/apple-icon-72x72.png"></link>
        <link rel="apple-touch-icon" sizes="76x76" href="/icons/apple-icon-76x76.png"></link>
        <link rel="apple-touch-icon" sizes="114x114" href="/icons/apple-icon-114x114.png"></link>
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-icon-120x120.png"></link>
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/apple-icon-144x144.png"></link>
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-icon-152x152.png"></link>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-icon-180x180.png"></link>
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/android-icon-192x192.png"></link>
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png"></link>
        <link rel="icon" type="image/png" sizes="96x96" href="/icons/favicon-96x96.png"></link>
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png"></link>
      </head>
      <body>
        <MapboxAbortSuppressor />
        <ServiceWorkerRegister />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
