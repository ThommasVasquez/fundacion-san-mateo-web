import React from "react";
import { notFound } from "next/navigation";
import { getProgramByHref } from "@/lib/content";
import NursingProgramContent from "../programa-enfermeria/NursingProgramContent";
import CourseContent from "@/components/courses/CourseContent";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const program = await getProgramByHref("/" + slug);
  if (!program) return {};

  return {
    title: `${program.title} | Fundación San Mateo`,
    description: program.description || `Formación en ${program.title} con los más altos estándares de calidad.`,
  };
}

export default async function DynamicProgramPage({ params }: PageProps) {
  const { slug } = await params;
  const href = "/" + slug;

  const program = await getProgramByHref(href);
  if (!program) {
    notFound();
  }

  // Format program data for client component
  const formattedProgram = {
    title: program.title || "PROGRAMA ACADÉMICO",
    subtitle: program.subtitle || "",
    description: program.description || "",
    image_url: program.image_url || "/img/banner6.jpg",
    href: program.href || href,
    details: program.details || {}
  };

  if (program.category === "continua") {
    const details = program.details || {};
    const bannerImg = details.banner_image || program.image_url || "/img/banner24.jpg";
    const mainImg = program.image_url || "/img/image13.jpg";
    const directedTo = details.directed_to || "Profesionales y estudiantes de la salud.";
    const objective = details.objective || "Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada.";
    const methodology = details.methodology || "Semi-presencial";
    const resources = details.resources || [];

    return (
      <CourseContent 
        title={program.title}
        bannerImg={bannerImg}
        mainImg={mainImg}
        directedTo={directedTo}
        objective={objective}
        methodology={methodology}
        resources={resources}
        subtitle={details.subtitle}
        step1_title={details.step1_title}
        step1_desc={details.step1_desc}
        step2_title={details.step2_title}
        step2_reqs={details.step2_reqs}
        step3_title={details.step3_title}
        step3_desc={details.step3_desc}
        sidebar_text={details.sidebar_text}
        brochure_filename={details.brochure_filename}
        brochure_base64={details.brochure_base64}
      />
    );
  } else {
    return <NursingProgramContent program={formattedProgram} />;
  }
}
