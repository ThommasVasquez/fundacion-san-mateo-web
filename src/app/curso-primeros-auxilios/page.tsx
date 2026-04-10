import CourseContent from "@/components/courses/CourseContent";

export default function PrimerosAuxiliosPage() {
  return (
    <CourseContent 
      title="Primeros Auxilios"
      bannerImg="/img/banner26.jpg"
      mainImg="/img/image15.jpg"
      directedTo="Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados."
      objective="Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a la atención inmediata de una persona enferma o lesionada, manteniendo y controlando aquellos factores que puedan incidir en la recuperación."
      methodology="Semi-presencial"
      resources={[
        "Material de apoyo.",
        "Plataforma institucional.",
        "Laboratorios de simulación hospitalaria.",
        "Simuladores hospitalarios.",
        "Pista de rescate."
      ]}
    />
  );
}
