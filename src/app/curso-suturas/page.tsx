import CourseContent from "@/components/courses/CourseContent";

export default function SuturasPage() {
  return (
    <CourseContent 
      title="Suturas"
      bannerImg="/img/banner24.jpg"
      mainImg="/img/image13.jpg"
      directedTo="Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados."
      objective="Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a los conocimientos básicos sobre las distintas técnicas para realizar suturas, garantizando la calidad y el manejo correcto del instrumental."
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
