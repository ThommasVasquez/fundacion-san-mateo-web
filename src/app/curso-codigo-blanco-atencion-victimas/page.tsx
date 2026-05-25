import CourseContent from "@/components/courses/CourseContent";
import { getProgramByHref } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function CodigoBlancoPage() {
  const program = await getProgramByHref("/curso-codigo-blanco-atencion-victimas");
  const details = program?.details || {};

  const title = program?.title || "Código Blanco y Atención Integral en Salud a Víctimas de Violencia Sexual";
  const bannerImg = details.banner_image || "/img/banner28.jpg";
  const mainImg = program?.image_url || "/img/image17.jpg";
  const directedTo = details.directed_to || "Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados.";
  const objective = details.objective || "Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a las necesidades de las víctimas de violencia sexual, evitando de esta manera que las personas no sean revictimizadas y la atención se dé de forma humanizada, haciendo uso de los protocolos vigentes y la normatividad actualizada para ello.";
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
