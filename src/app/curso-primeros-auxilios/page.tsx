import CourseContent from "@/components/courses/CourseContent";
import { getProgramByHref } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function PrimerosAuxiliosPage() {
  const program = await getProgramByHref("/curso-primeros-auxilios");
  const details = program?.details || {};

  const title = program?.title || "Primeros Auxilios";
  const bannerImg = details.banner_image || "/img/banner26.jpg";
  const mainImg = program?.image_url || "/img/image15.jpg";
  const directedTo = details.directed_to || "Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados.";
  const objective = details.objective || "Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a la atención inmediata de una persona enferma o lesionada, manteniendo y controlando aquellos factores que puedan incidir en la recuperación.";
  const methodology = details.methodology || "Semi-presencial";
  const resources = details.resources || [
    "Material de apoyo.",
    "Plataforma institucional.",
    "Laboratorios de simulación hospitalaria.",
    "Simuladores hospitalarios.",
    "Pista de rescate."
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
