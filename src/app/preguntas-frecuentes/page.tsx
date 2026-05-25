import React from "react";
import FAQContent from "./FAQContent";
import { getFAQs } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Preguntas Frecuentes | Fundación San Mateo",
  description: "Resuelva sus dudas sobre nuestros programas, procesos de matrícula, requisitos legales y formas de financiación.",
};

export default async function FAQPage() {
  const faqs = await getFAQs();

  // Serialize IDs to prevent hydration issues
  const serializedFAQs = faqs.map((f: any) => ({
    id: f.id.toString(),
    question: f.question,
    answer: f.answer,
    category: f.category || "General",
    order_index: f.order_index || 0
  }));

  return <FAQContent initialFaqs={serializedFAQs} />;
}
