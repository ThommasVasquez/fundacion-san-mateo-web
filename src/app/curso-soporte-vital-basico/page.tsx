import CourseContent from "@/components/courses/CourseContent";
import { getProgramByHref } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function SoporteVitalPage() {
  const program = await getProgramByHref("/curso-soporte-vital-basico");
  const details = program?.details || {};

  const title = program?.title || "Soporte Vital Básico";
  const bannerImg = details.banner_image || "/img/banner22.jpg";
  const mainImg = program?.image_url || "/img/image11.jpg";
  const directedTo = details.directed_to || "Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados.";
  const objective = details.objective || "Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada ante un evento que suscite una reanimación cardiopulmonar a través de la identificación oportuna de paro y el cumplimiento adecuado de las maniobras básicas de reanimación.";
  const methodology = details.methodology || "Semi-presencial";
  const resources = details.resources || [
    "Material de apoyo.",
    "Plataforma institucional.",
    "Laboratorios de simulación hospitalaria.",
    "Simuladores de reanimación con software integrado."
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
