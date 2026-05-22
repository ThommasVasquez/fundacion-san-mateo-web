import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fundación San Mateo - Institución para el Trabajo y Desarrollo Humano",
  description: "Formamos integralmente a nuestros estudiantes mediante programas técnicos laborales por competencias con alto nivel de exigencia y calidad en Soacha.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
      <body className="font-sans min-h-full flex flex-col overflow-x-hidden">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
