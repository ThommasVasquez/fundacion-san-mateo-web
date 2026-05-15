import React from "react";
import { getContentMap } from "@/lib/content";
import NormativityContent from "./NormativityContent";

export const metadata = {
  title: "Normatividad y Transparencia | Fundación San Mateo",
  description: "Consulte nuestra base documental, resoluciones de aprobación y manuales institucionales que garantizan nuestra excelencia académica.",
};

export default async function NormativityPage() {
  const content = await getContentMap("/institucion/normatividad");

  return <NormativityContent initialContent={content} />;
}
