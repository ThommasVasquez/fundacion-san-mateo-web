import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || "postgresql://neondb_owner:npg_e1zifTH5dZaE@ep-gentle-mouse-ankslyb3-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require");

async function main() {
  console.log("Starting academic_programs database migration...");

  // 1. Ensure details column exists as JSONB
  await sql`
    ALTER TABLE academic_programs 
    ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
  `;
  console.log("details column added (or already exists).");

  // 2. Set up seeds for each program/course
  const seeds = {
    "/programa-enfermeria": {
      duration: "3 Semestres",
      certificate: "Técnico por Competencias",
      uniform_gift: "Uniforme Gratis / Por tiempo limitado",
      plan_estudios: [
        "Inducción educativa", "Primer respondiente", "Diagnóstico", "UCI",
        "Medicamentos", "Salud ocupacional", "Control de infecciones", "Atención integral",
        "Admisión al usuario", "Vacunación", "Asistencia al usuario", "Normatividad",
        "Tecnologías TICs", "Práctica geriátrica", "Bioseguridad", "Clínica 1",
        "Cuidado personal", "Clínica 2"
      ],
      admision: {
        requirements: [
          "Documento al 150%",
          "Certificado EPS/SISBEN",
          "Diploma bachiller (min. 9°)",
          "2 Fotos 3x4 fondo blanco",
          "Certificado de vacunas"
        ],
        note: "Nota: La matrícula se legaliza de forma presencial en nuestra sede administrativa."
      },
      calidad: [
        { title: "RESOLUCIÓN OFICIAL", text: "Resolución No. 1066 del 1 de junio de 2022 - Secretaría de Educación de Soacha." },
        { title: "CALIDAD TÉCNICA", text: "Programa acreditado bajo las normas NTC 5555 e ISO 9001:2015." }
      ],
      practicas: {
        description: "Convenios con las mejores IPS y hospitales de la región para garantizar tu aprendizaje práctico.",
        places: ["Clínica San Francisco", "Hospital Mario Gaitán", "Hospital La Victoria", "CIOSAD", "IP JARBSALUD", "Fundación Geriátrica"]
      }
    },
    "/programa-primera-infancia": {
      duration: "2 Semestres",
      certificate: "Educación Inicial",
      uniform_gift: "Uniforme Gratis / Por tiempo limitado",
      plan_estudios: [
        "Inducción educativa", "Primeros auxilios", "Orientación educativa", "Programas académicos",
        "Prácticas saludables", "Tecnologías TICs", "Educación incluyente", "Práctica 1",
        "Inglés", "Práctica 2"
      ],
      admision: {
        requirements: [
          "Documento al 150%",
          "Certificado EPS/SISBEN",
          "Diploma bachiller (min. 9°)",
          "2 Fotos 3x4 fondo blanco",
          "Mayor de 16 años"
        ],
        note: "Nota: Matrículas abiertas permanentemente."
      },
      calidad: [
        { title: "RESOLUCIÓN OFICIAL", text: "Resolución No. 0883 del 29 de mayo de 2023 - Secretaría de Educación de Soacha." },
        { title: "CERTIFICACIÓN ESPECÍFICA", text: "Programa certificado bajo la Norma Técnica NTC 5581:2011." }
      ],
      practicas: {
        description: "Experiencia real en los mejores centros educativos y jardines infantiles de la zona.",
        places: ["Jean Fritz Piaget", "Mundo Activo", "Abraham Lincoln", "British School", "Gimnasio Alameda", "Colegio Niño Jesús", "Antonia Santos", "García Márquez", "Eko Garden", "Nueva Generación"]
      }
    },
    "/programa-sistemas": {
      duration: "2 Semestres",
      certificate: "Técnico por Competencias",
      uniform_gift: "Uniforme Gratis / Por tiempo limitado",
      plan_estudios: [
        "Inducción educativa", "Servicio al cliente", "Sistemas de información", "Ética y valores", "Práctica empresarial"
      ],
      admision: {
        requirements: [
          "Documento al 150%",
          "Certificado EPS/SISBEN",
          "Diploma bachiller (min. 9°)",
          "2 Fotos 3x4 fondo blanco"
        ],
        note: "Nota: Matrículas abiertas."
      },
      calidad: [
        { title: "RESOLUCIÓN OFICIAL", text: "Resolución oficial vigente de la Secretaría de Educación." }
      ],
      practicas: {
        description: "Convenios con empresas destacadas para prácticas profesionales.",
        places: ["Sede Administrativa FSM", "Empresas Aliadas"]
      }
    },
    "/programa-contabilidad": {
      duration: "2 Semestres",
      certificate: "Técnico por Competencias",
      uniform_gift: "Uniforme Gratis / Por tiempo limitado",
      plan_estudios: [
        "Nivel A1", "Nivel A2", "Nivel B1", "Nivel B2", "Práctica de conversación"
      ],
      admision: {
        requirements: [
          "Documento al 150%",
          "Certificado EPS/SISBEN",
          "Diploma bachiller (min. 9°)",
          "2 Fotos 3x4 fondo blanco"
        ],
        note: "Nota: Matrículas abiertas."
      },
      calidad: [
        { title: "RESOLUCIÓN OFICIAL", text: "Resolución oficial vigente de la Secretaría de Educación." }
      ],
      practicas: {
        description: "Escenarios para prácticas de bilingüismo.",
        places: ["Centros de Idiomas", "Instituciones Educativas"]
      }
    },
    "/curso-suturas": {
      banner_image: "/img/banner24.jpg",
      directed_to: "Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados.",
      objective: "Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a los conocimientos básicos sobre las distintas técnicas para realizar suturas, garantizando la calidad y el manejo correcto del instrumental.",
      methodology: "Semi-presencial",
      resources: [
        "Material de apoyo.",
        "Plataforma institucional.",
        "Laboratorios de simulación hospitalaria.",
        "Simuladores hospitalarios."
      ],
      duration: "20 horas",
      certificate: "Certificado de Asistencia y Aprobación"
    },
    "/curso-primeros-auxilios": {
      banner_image: "/img/banner26.jpg",
      directed_to: "Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados.",
      objective: "Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a la atención inmediata de una persona enferma o lesionada, manteniendo y controlando aquellos factores que puedan incidir en la recuperación.",
      methodology: "Semi-presencial",
      resources: [
        "Material de apoyo.",
        "Plataforma institucional.",
        "Laboratorios de simulación hospitalaria.",
        "Simuladores hospitalarios.",
        "Pista de rescate."
      ],
      duration: "24 horas",
      certificate: "Certificado de Asistencia y Aprobación"
    },
    "/curso-codigo-blanco-atencion-victimas": {
      banner_image: "/img/banner28.jpg",
      directed_to: "Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados.",
      objective: "Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a las necesidades de las víctimas de violencia sexual, evitando de esta manera que las personas no sean revictimizadas y la atención se dé de forma humanizada, haciendo uso de los protocolos vigentes y la normatividad actualizada para ello.",
      methodology: "Virtual",
      resources: [
        "Material de apoyo.",
        "Plataforma institucional.",
        "Biblioteca virtual."
      ],
      duration: "40 horas",
      certificate: "Certificado de Asistencia y Aprobación"
    },
    "/curso-socorrismo-y-rescate": {
      banner_image: "/img/banner25.jpg",
      directed_to: "Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados.",
      objective: "Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a la atención inmediata de una persona enferma o lesionada, a través de diferentes maniobras encaminadas a recuperar una víctima en sitios de difícil acceso, haciendo uso de los protocolos vigentes y la normatividad actualizada para ello.",
      methodology: "Semi-presencial",
      resources: [
        "Material de apoyo.",
        "Plataforma institucional.",
        "Laboratorios de simulación hospitalaria.",
        "Simuladores hospitalarios.",
        "Pista de rescate."
      ],
      duration: "32 horas",
      certificate: "Certificado de Asistencia y Aprobación"
    },
    "/curso-pai-inyectologia": {
      banner_image: "/img/banner23.jpg",
      directed_to: "Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente.",
      objective: "Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a los fundamentos de vacunación (Calendario Nacional) y técnicas de inyectología (intradérmica, subcutánea, intramuscular, intravenosa) y bioseguridad.",
      methodology: "Semi-presencial",
      resources: [
        "Material de apoyo.",
        "Plataforma institucional.",
        "Laboratorios de simulación hospitalaria.",
        "Simuladores hospitalarios."
      ],
      duration: "16 horas",
      certificate: "Certificado de Asistencia y Aprobación"
    },
    "/curso-soporte-vital-basico": {
      banner_image: "/img/banner22.jpg",
      directed_to: "Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados.",
      objective: "Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada ante un evento que suscite una reanimación cardiopulmonar a través de la identificación oportuna de paro y el cumplimiento adecuado de las maniobras básicas de reanimación.",
      methodology: "Semi-presencial",
      resources: [
        "Material de apoyo.",
        "Plataforma institucional.",
        "Laboratorios de simulación hospitalaria.",
        "Simuladores de reanimación con software integrado."
      ],
      duration: "20 horas",
      certificate: "Certificado de Asistencia y Aprobación"
    },
    "/curso-manejo-de-duelo": {
      banner_image: "/img/banner27.jpg",
      directed_to: "Profesionales y estudiantes tecnólogos y técnicos de la salud, con interés en fortalecer competencias teórico-prácticas según normativa vigente y protocolos actualizados.",
      objective: "Alcanzar fortalezas y habilidades teórico-prácticas para responder de manera adecuada a los fundamentos del duelo, manejando competencias para el abordaje según grupo etario y protocolos COVID-19.",
      methodology: "Virtual",
      resources: [
        "Material de apoyo.",
        "Plataforma institucional.",
        "Biblioteca virtual."
      ],
      duration: "20 horas",
      certificate: "Certificado de Asistencia y Aprobación"
    }
  };

  console.log("Seeding default page details...");
  for (const [href, details] of Object.entries(seeds)) {
    const detailsStr = JSON.stringify(details);
    // Update the details column for the program matching href
    const result = await sql`
      UPDATE academic_programs 
      SET details = ${detailsStr}::jsonb
      WHERE href = ${href}
    `;
    console.log(`Updated details for href ${href}`);
  }

  console.log("Academic programs details migration and seeding completed successfully.");
}

main().catch(console.error);
