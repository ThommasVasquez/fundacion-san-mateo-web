import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fundacionsanmateosoacha.edu.co"),
  title: {
    default: "Fundación San Mateo | Institución de Educación y Formación Técnica en Soacha",
    template: "%s | Fundación San Mateo Soacha"
  },
  description: "Institución de Educación para el Trabajo y Desarrollo Humano en Soacha. Programas Técnicos Laborales en Auxiliar de Enfermería, Primera Infancia y Cursos Certificados de Salud.",
  keywords: [
    "Fundación San Mateo",
    "Fundación San Mateo Soacha",
    "Auxiliar de Enfermería Soacha",
    "Atención a la Primera Infancia Soacha",
    "Cursos de Salud Soacha",
    "Cursos de Inyectología y PAI Bogotá",
    "Soporte Vital Básico Soacha",
    "Educación Técnica Soacha",
    "Certificados Laborales Cundinamarca"
  ],
  authors: [{ name: "Fundación San Mateo", url: "https://fundacionsanmateosoacha.edu.co" }],
  creator: "Fundación San Mateo",
  publisher: "Fundación San Mateo",
  formatDetection: {
    email: true,
    address: true,
    telephone: true
  },
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Fundación San Mateo | Educación con Excelencia en Soacha",
    description: "Programas Técnicos Laborales por competencias en Enfermería y Primera Infancia con certificaciones ISO 9001 y NTC en Soacha, Cundinamarca.",
    url: "https://fundacionsanmateosoacha.edu.co",
    siteName: "Fundación San Mateo",
    locale: "es_CO",
    type: "website",
    images: [
      {
        url: "https://fundacionsanmateosoacha.edu.co/og-image.png",
        secureUrl: "https://fundacionsanmateosoacha.edu.co/og-image.png",
        width: 600,
        height: 600,
        type: "image/png",
        alt: "Escudo Institucional Fundación San Mateo Soacha"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Fundación San Mateo - Formación Técnica en Soacha",
    description: "Educación de calidad para el desarrollo humano y laboral en Soacha. Enfermería, Primera Infancia y Cursos Especializados.",
    images: ["https://fundacionsanmateosoacha.edu.co/og-image.png"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
      <head>
        <meta property="og:title" content="Fundación San Mateo | Educación con Excelencia en Soacha" />
        <meta property="og:description" content="Programas Técnicos Laborales por competencias en Enfermería y Primera Infancia con certificaciones ISO 9001 y NTC en Soacha, Cundinamarca." />
        <meta property="og:image" content="https://fundacionsanmateosoacha.edu.co/og-image.png" />
        <meta property="og:image:secure_url" content="https://fundacionsanmateosoacha.edu.co/og-image.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="600" />
        <meta property="og:image:height" content="600" />
        <meta property="og:url" content="https://fundacionsanmateosoacha.edu.co" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Fundación San Mateo" />
      </head>
      <body className="font-sans min-h-full flex flex-col overflow-x-hidden">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
