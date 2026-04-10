import CourseContent from "@/components/courses/CourseContent";

export default function SoporteVitalPage() {
  return (
    <CourseContent 
      title="Soporte Vital Básico"
      bannerImg="/img/banner22.jpg"
      mainImg="/img/image11.jpg"
      directedTo="Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados."
      objective="Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada ante un evento que suscite una reanimación cardiopulmonar a través de la identificación oportuna de paro y el cumplimiento adecuado de las maniobras básicas de reanimación."
      methodology="Semi-presencial"
      resources={[
        "Material de apoyo.",
        "Plataforma institucional.",
        "Laboratorios de simulación hospitalaria.",
        "Simuladores de reanimación con software integrado."
      ]}
    />
  );
}
