import React from "react";
import ContactContent from "./ContactContent";
import { getContentMap } from "@/lib/content";

// Lee el contenido del CMS en cada visita, como el resto de las páginas que lo
// usan. Dicho aquí y no deducido de la consulta: si la build no alcanza el
// backend, lo único que Next puede deducir es que la ruta es estática, y sale
// una página vacía servida desde la caché.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Contacto | Fundación San Mateo",
  description: "Póngase en contacto con la Fundación San Mateo Soacha. Atención personalizada, ubicación de nuestras sedes y canales de comunicación oficial.",
};

export default async function ContactPage() {
  // Fetch dynamic content from CMS for the contact page path
  const content = await getContentMap("/contacto");

  return <ContactContent content={content} />;
}
