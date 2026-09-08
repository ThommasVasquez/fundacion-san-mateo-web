import React from "react";
import { getContentMap } from "@/lib/content";
import AboutContent from "./AboutContent";

// Lee el contenido del CMS en cada visita, como el resto de las páginas que lo
// usan. Dicho aquí y no deducido de la consulta: si la build no alcanza el
// backend, lo único que Next puede deducir es que la ruta es estática, y sale
// una página vacía servida desde la caché.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Acerca de la FSM | Fundación San Mateo",
  description: "Más de dos décadas transformando vidas a través de la educación técnica de calidad en Soacha.",
};

export default async function AboutPage() {
  const content = await getContentMap("/institucion/acerca-de-fsm");

  return <AboutContent initialContent={content} />;
}
