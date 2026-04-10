import CourseContent from "@/components/courses/CourseContent";

export default function ManejoDueloPage() {
  return (
    <CourseContent 
      title="Manejo de Duelo"
      bannerImg="/img/banner27.jpg"
      mainImg="/img/image16.jpg"
      directedTo="Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados."
      objective="Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a los fundamentos del duelo, manejando competencias para el abordaje según grupo etario y protocolos COVID-19."
      methodology="Virtual"
      resources={[
        "Material de apoyo.",
        "Plataforma institucional.",
        "Biblioteca virtual."
      ]}
    />
  );
}
