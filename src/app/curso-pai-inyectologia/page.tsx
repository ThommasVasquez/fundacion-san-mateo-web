import CourseContent from "@/components/courses/CourseContent";

export default function PaiInyectologiaPage() {
  return (
    <CourseContent 
      title="PAI e Inyectología"
      bannerImg="/img/banner23.jpg"
      mainImg="/img/image12.jpg"
      directedTo="Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente."
      objective="Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a los fundamentos de vacunación (Calendario Nacional) y técnicas de inyectología (intradérmica, subcutánea, intramuscular, intravenosa) y bioseguridad."
      methodology="Semi-presencial"
      resources={[
        "Material de apoyo.",
        "Plataforma institucional.",
        "Laboratorios de simulación hospitalaria.",
        "Simuladores hospitalarios."
      ]}
    />
  );
}
