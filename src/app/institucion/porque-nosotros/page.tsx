import React from "react";
import { getContentMap } from "@/lib/content";
import WhyUsContent from "./WhyUsContent";

export const metadata = {
  title: "¿Por Qué Elegirnos? | Fundación San Mateo",
  description: "Formación integral con altos niveles de exigencia, competitividad y calidad certificada bajo estándares internacionales.",
};

export default async function WhyUsPage() {
  const content = await getContentMap("/institucion/porque-nosotros");

  return <WhyUsContent initialContent={content} />;
}
