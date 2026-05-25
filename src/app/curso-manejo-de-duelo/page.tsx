import CourseContent from "@/components/courses/CourseContent";
import { getProgramByHref } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function ManejoDueloPage() {
  const program = await getProgramByHref("/curso-manejo-de-duelo");
  const details = program?.details || {};

  const title = program?.title || "Manejo de Duelo";
  const bannerImg = details.banner_image || "/img/banner27.jpg";
  const mainImg = program?.image_url || "/img/image16.jpg";
  const directedTo = details.directed_to || "Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados.";
  const objective = details.objective || "Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a los fundamentos del duelo, manejando competencias para el abordaje según grupo etario y protocolos COVID-19.";
  const methodology = details.methodology || "Virtual";
  const resources = details.resources || [
    "Material de apoyo.",
    "Plataforma institucional.",
    "Biblioteca virtual."
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
