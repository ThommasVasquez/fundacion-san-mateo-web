import CourseContent from "@/components/courses/CourseContent";
import { getProgramByHref } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function PaiInyectologiaPage() {
  const program = await getProgramByHref("/curso-pai-inyectologia");
  const details = program?.details || {};

  const title = program?.title || "PAI e Inyectología";
  const bannerImg = details.banner_image || "/img/banner23.jpg";
  const mainImg = program?.image_url || "/img/image12.jpg";
  const directedTo = details.directed_to || "Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente.";
  const objective = details.objective || "Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a los fundamentos de vacunación (Calendario Nacional) y técnicas de inyectología (intradérmica, subcutánea, intramuscular, intravenosa) y bioseguridad.";
  const methodology = details.methodology || "Semi-presencial";
  const resources = details.resources || [
    "Material de apoyo.",
    "Plataforma institucional.",
    "Laboratorios de simulación hospitalaria.",
    "Simuladores hospitalarios."
  ];

  return (
    <CourseContent 
      title={title}
      bannerImg={bannerImg}
      mainImg={mainImg}
      directedTo={directedTo}
      objective={objective}
      methodology={methodology}
      resources={resources}
    />
  );
}
