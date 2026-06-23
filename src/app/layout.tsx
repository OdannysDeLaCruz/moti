import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import MapboxAbortSuppressor from "@/components/MapboxAbortSuppressor";

export const metadata: Metadata = {
  title: "Motu – Carreras y domicilios en tiempo real",
  description:
    "Conecta con conductores verificados en moto o bici. Rápido, seguro y económico.",
  manifest: "/manifest.json",
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
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon"></link>
        <link rel="icon" href="/favicon.ico" type="image/x-icon"></link>
      </head>
      <body>
        <MapboxAbortSuppressor />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
