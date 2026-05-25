import React from "react";
import EarlyChildhoodProgramContent from "./EarlyChildhoodProgramContent";
import { getProgramByHref } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Técnico Laboral en Atención Integral a la Primera Infancia | Fundación San Mateo",
  description: "Formamos expertos en el cuidado y la educación integral de la primera infancia, con bases pedagógicas sólidas y vocación humanista.",
};

export default async function EarlyChildhoodProgramPage() {
  const program = await getProgramByHref("/programa-primera-infancia");

  // Format program data for client component
  const formattedProgram = {
    title: program?.title || "ATENCIÓN INTEGRAL A LA PRIMERA INFANCIA",
    subtitle: program?.subtitle || "HACIA EL FUTURO",
    description: program?.description || "Formamos expertos en el cuidado y la educación integral de la primera infancia, con bases pedagógicas sólidas y vocación humanista.",
    image_url: program?.image_url || "/img/banner13.jpg",
    href: program?.href || "/programa-primera-infancia",
    details: program?.details || {}
  };

  return <EarlyChildhoodProgramContent program={formattedProgram} />;
}
