import React from "react";
import { getContentMap } from "@/lib/content";
import WhyUsContent from "./WhyUsContent";

// Lee el contenido del CMS en cada visita, como el resto de las páginas que lo
// usan. Dicho aquí y no deducido de la consulta: si la build no alcanza el
// backend, lo único que Next puede deducir es que la ruta es estática, y sale
// una página vacía servida desde la caché.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: "¿Por Qué Elegirnos? | Fundación San Mateo",
  description: "Formación integral con altos niveles de exigencia, competitividad y calidad certificada bajo estándares internacionales.",
};

export default async function WhyUsPage() {
  const content = await getContentMap("/institucion/porque-nosotros");

  return <WhyUsContent initialContent={content} />;
}
