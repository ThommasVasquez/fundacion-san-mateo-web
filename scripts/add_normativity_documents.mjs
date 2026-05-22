import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("Creating normativity_documents table...");
  
  await sql`
    CREATE TABLE IF NOT EXISTS normativity_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      category_key VARCHAR(50) NOT NULL,
      file_name TEXT,
      file_base64 TEXT,
      external_link TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  console.log("normativity_documents table created successfully.");

  // Check if there are already records
  const existing = await sql`SELECT count(*)::int as count FROM normativity_documents`;
  if (existing[0].count === 0) {
    console.log("Seeding initial normativity documents...");
    
    const initialDocs = [
      // norm_cat1
      {
        title: "Personería Jurídica - Resolución No. 14 del 23 de mayo de 2001",
        category_key: "norm_cat1",
        external_link: "/docs/PersoneriaJuridica.pdf",
        order_index: 0
      },
      // norm_cat2
      {
        title: "Resolución No. 1066 del 1 de junio de 2022",
        category_key: "norm_cat2",
        external_link: "/docs/Resolucion1066-2.pdf",
        order_index: 0
      },
      {
        title: "Resolución No. 2074 del 21 de septiembre de 2010",
        category_key: "norm_cat2",
        external_link: "/docs/Resolucion2074.pdf",
        order_index: 1
      },
      {
        title: "Resolución No. 513 del 5 de junio de 2009",
        category_key: "norm_cat2",
        external_link: "/docs/Resolucion513-2.pdf",
        order_index: 2
      },
      // norm_cat3
      {
        title: "Resolución No. 0883 del 29 de mayo de 2023",
        category_key: "norm_cat3",
        external_link: "/docs/Resolucion0883-2.pdf",
        order_index: 0
      },
      // norm_cat4
      {
        title: "Manual de Convivencia",
        category_key: "norm_cat4",
        external_link: "/docs/ManualDeConvivencia.pdf",
        order_index: 0
      },
      {
        title: "Política de Tratamiento de Datos Personales",
        category_key: "norm_cat4",
        external_link: "/tratamiento-datos",
        order_index: 1
      },
      {
        title: "Proyecto Educativo Institucional (PEI)",
        category_key: "norm_cat4",
        external_link: "#",
        order_index: 2
      },
      {
        title: "Reglamento Estudiantil",
        category_key: "norm_cat4",
        external_link: "#",
        order_index: 3
      },
      {
        title: "Reglamento Docente",
        category_key: "norm_cat4",
        external_link: "#",
        order_index: 4
      },
      // norm_cat5
      {
        title: "Resolución pendiente de cargar",
        category_key: "norm_cat5",
        external_link: "#",
        order_index: 0
      },
      // norm_cat6
      {
        title: "Resolución pendiente de cargar",
        category_key: "norm_cat6",
        external_link: "#",
        order_index: 0
      }
    ];

    for (const doc of initialDocs) {
      await sql`
        INSERT INTO normativity_documents (title, category_key, external_link, order_index)
        VALUES (${doc.title}, ${doc.category_key}, ${doc.external_link}, ${doc.order_index})
      `;
    }
    console.log("Initial normativity documents seeded successfully!");
  } else {
    console.log("normativity_documents table already has data. Skipping seed.");
  }
}

main().catch(console.error);
