import React from "react";
import { getContentMap, getDirectoryItems } from "@/lib/content";
import DirectoryContent from "./DirectoryContent";

export const metadata = {
  title: "Directorio Institucional | Fundación San Mateo",
  description: "Puntos de contacto y ubicación de nuestra institución.",
};

export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  const content = await getContentMap("/institucion/directorio");
  const directoryItems = await getDirectoryItems();

  return (
    <DirectoryContent 
      initialContent={content} 
      directoryItems={directoryItems.map(item => ({
        id: item.id.toString(),
        title: item.title,
        phone: item.phone
      }))} 
    />
  );
}
