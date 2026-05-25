import React from "react";
import NursingProgramContent from "./NursingProgramContent";
import { getProgramByHref } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Técnico Laboral Auxiliar de Enfermería | Fundación San Mateo",
  description: "Formación técnica líderes en salud, con enfoque humanista y los más altos estándares de calidad internacional.",
};

export default async function NursingProgramPage() {
  const program = await getProgramByHref("/programa-enfermeria");

  // Format program data for client component
  const formattedProgram = {
    title: program?.title || "AUXILIAR DE ENFERMERÍA",
    subtitle: program?.subtitle || "VOCACIÓN DE SERVIR",
    description: program?.description || "Formación técnica líderes en salud, con enfoque humanista y los más altos estándares de calidad internacional.",
    image_url: program?.image_url || "/img/banner6.jpg",
    href: program?.href || "/programa-enfermeria",
    details: program?.details || {}
  };

  return <NursingProgramContent program={formattedProgram} />;
}
