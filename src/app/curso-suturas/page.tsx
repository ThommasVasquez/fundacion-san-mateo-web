import CourseContent from "@/components/courses/CourseContent";
import { getProgramByHref } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function SuturasPage() {
  const program = await getProgramByHref("/curso-suturas");
  const details = program?.details || {};

  const title = program?.title || "Suturas";
  const bannerImg = details.banner_image || "/img/banner24.jpg";
  const mainImg = program?.image_url || "/img/image13.jpg";
  const directedTo = details.directed_to || "Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados.";
  const objective = details.objective || "Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a los conocimientos básicos sobre las distintas técnicas para realizar suturas, garantizando la calidad y el manejo correcto del instrumental.";
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
