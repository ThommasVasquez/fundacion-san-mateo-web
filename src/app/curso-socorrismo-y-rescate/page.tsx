import CourseContent from "@/components/courses/CourseContent";

export default function SocorrismoRescatePage() {
  return (
    <CourseContent 
      title="Socorrismo y Rescate"
      bannerImg="/img/banner25.jpg"
      mainImg="/img/image14.jpg"
      directedTo="Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados."
      objective="Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a la atención inmediata de una persona enferma o lesionada, a través de diferentes maniobras encaminadas a recuperar una víctima en sitios de difícil acceso, haciendo uso de los protocolos vigentes y la normatividad actualizada para ello."
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
