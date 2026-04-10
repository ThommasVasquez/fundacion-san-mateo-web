import CourseContent from "@/components/courses/CourseContent";

export default function CodigoBlancoPage() {
  return (
    <CourseContent 
      title="Código Blanco y Atención Integral en Salud a Víctimas de Violencia Sexual"
      bannerImg="/img/banner28.jpg"
      mainImg="/img/image17.jpg"
      directedTo="Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados."
      objective="Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a las necesidades de las víctimas de violencia sexual, evitando de esta manera que las personas no sean revictimizadas y la atención se dé de forma humanizada, haciendo uso de los protocolos vigentes y la normatividad actualizada para ello."
      methodology="Virtual"
      resources={[
        "Material de apoyo.",
        "Plataforma institucional.",
        "Biblioteca virtual."
      ]}
    />
  );
}
