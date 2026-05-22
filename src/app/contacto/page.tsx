import React from "react";
import ContactContent from "./ContactContent";
import { getContentMap } from "@/lib/content";

export const metadata = {
  title: "Contacto | Fundación San Mateo",
  description: "Póngase en contacto con la Fundación San Mateo Soacha. Atención personalizada, ubicación de nuestras sedes y canales de comunicación oficial.",
};

export default async function ContactPage() {
  // Fetch dynamic content from CMS for the contact page path
  const content = await getContentMap("/contacto");

  return <ContactContent content={content} />;
}
