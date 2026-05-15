import React from "react";
import { getContentMap } from "@/lib/content";
import AboutContent from "./AboutContent";

export const metadata = {
  title: "Acerca de la FSM | Fundación San Mateo",
  description: "Más de dos décadas transformando vidas a través de la educación técnica de calidad en Soacha.",
};

export default async function AboutPage() {
  const content = await getContentMap("/institucion/acerca-de-fsm");

  return <AboutContent initialContent={content} />;
}
