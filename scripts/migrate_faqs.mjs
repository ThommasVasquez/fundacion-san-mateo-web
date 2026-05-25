import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || "postgresql://neondb_owner:npg_e1zifTH5dZaE@ep-gentle-mouse-ankslyb3-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require");

async function main() {
  console.log("Starting FAQ database migration...");

  // 1. Ensure category column exists
  await sql`
    ALTER TABLE faqs 
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
  `;

  // 2. Ensure is_active column has DEFAULT true
  await sql`
    ALTER TABLE faqs 
    ALTER COLUMN is_active SET DEFAULT true;
  `;

  // 3. Update existing NULL values for is_active
  await sql`
    UPDATE faqs 
    SET is_active = true 
    WHERE is_active IS NULL;
  `;

  console.log("FAQ table schema updated.");

  // 4. Seed default FAQs
  const defaultFAQs = [
    {
      category: "Institucional",
      question: "¿Qué clase de educación brinda la FUNDACIÓN SAN MATEO?",
      answer: "La FUNDACIÓN SAN MATEO es una Institución de Educación para el Trabajo y el Desarrollo Humano que forma integralmente a sus estudiantes, mediante la oferta de programas Técnico Laborales por competencias con alto nivel de exigencia y competitividad.",
      order_index: 1
    },
    {
      category: "Institucional",
      question: "¿Cuántos años lleva la FUNDACIÓN SAN MATEO en el mercado?",
      answer: `La FUNDACIÓN SAN MATEO fue fundada en noviembre del año 2000 como respuesta a las necesidades educativas del municipio de Soacha, contando con más de ${new Date().getFullYear() - 2000} años de trayectoria ininterrumpida.`,
      order_index: 2
    },
    {
      category: "Académico",
      question: "¿Puedo estudiar un programa técnico sin haber terminado mi bachillerato?",
      answer: "Sí se puede, siempre y cuando cumplas con los requisitos de cada programa técnico laboral. Usualmente se requiere haber aprobado mínimo el 9° grado.",
      order_index: 3
    },
    {
      category: "Académico",
      question: "¿Tienen convenios de prácticas o me toca conseguirlas?",
      answer: "La FUNDACIÓN SAN MATEO cuenta con más de 15 convenios activos en clínicas, hospitales y centros educativos de primer nivel para que realices tus prácticas profesionales en entornos reales.",
      order_index: 4
    },
    {
      category: "Académico",
      question: "¿Qué duración tienen los programas técnicos?",
      answer: "Auxiliar en Enfermería dura tres semestres (un año y medio). Atención Integral a la Primera Infancia dura dos semestres (un año).",
      order_index: 5
    },
    {
      category: "Legal y Financiero",
      question: "¿La FUNDACIÓN SAN MATEO es una institución legal?",
      answer: "Contamos con aprobación oficial por parte de la Secretaría de Educación de Soacha (Resolución No. 513 del 5 de junio de 2009). Todos nuestros programas están registrados en el SIET y acreditados en calidad ISO 9001:2015.",
      order_index: 6
    },
    {
      category: "Legal y Financiero",
      question: "¿Qué formas de pago tienen?",
      answer: "Ofrecemos financiación directa a cuotas sin ningún tipo de interés, sin entidades financieras externas ni procesos burocráticos complejos.",
      order_index: 7
    }
  ];

  console.log("Seeding default FAQs...");
  for (const faq of defaultFAQs) {
    // Check if duplicate question exists before inserting
    const existing = await sql`
      SELECT id FROM faqs WHERE question = ${faq.question} LIMIT 1
    `;
    if (existing.length === 0) {
      await sql`
        INSERT INTO faqs (category, question, answer, order_index, is_active)
        VALUES (${faq.category}, ${faq.question}, ${faq.answer}, ${faq.order_index}, true)
      `;
      console.log(`Inserted: ${faq.question}`);
    } else {
      console.log(`Skipped (already exists): ${faq.question}`);
    }
  }

  console.log("FAQ migration and seeding completed successfully.");
}

main().catch(console.error);
