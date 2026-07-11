import React from "react";
import { getContentMap, getNormativityDocuments } from "@/lib/content";
import NormativityContent from "./NormativityContent";

export const metadata = {
  title: "Normatividad y Transparencia | Fundación San Mateo",
  description: "Consulte nuestra base documental, resoluciones de aprobación y manuales institucionales que garantizan nuestra excelencia académica.",
};

export const dynamic = "force-dynamic";

export default async function NormativityPage() {
  const content = await getContentMap("/institucion/normatividad");
  const docs = await getNormativityDocuments();

  const serializedDocs = docs.map((doc: any) => ({
    id: doc.id.toString(),
    title: doc.title,
    category_key: doc.category_key,
    file_name: doc.file_name || null,
    external_link: doc.external_link || null,
    order_index: doc.order_index || 0,
  }));

  return <NormativityContent initialContent={content} docs={serializedDocs} />;
}
