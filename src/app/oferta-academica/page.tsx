import React from "react";
import { getPrograms, getContentMap } from "@/lib/content";
import AcademicOfferContent from "./AcademicOfferContent";

export const metadata = {
  title: "Oferta Académica | Fundación San Mateo",
  description: "Descubre nuestros programas técnicos y cursos de educación continua.",
};

export const dynamic = "force-dynamic";

export default async function AcademicOfferPage() {
  const programs = await getPrograms();
  const content = await getContentMap('/oferta-academica');

  const serializedPrograms = programs.map((p: any) => ({
    id: p.id.toString(),
    title: p.title,
    subtitle: p.subtitle || '',
    description: p.description || '',
    image_url: p.image_url,
    href: p.href,
    category: p.category,
    is_featured: p.is_featured
  }));

  return <AcademicOfferContent initialPrograms={serializedPrograms} content={content} />;
}
