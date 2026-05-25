import React from "react";
import FAQManager from "@/components/admin/FAQManager";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { getFAQs } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gestión de Preguntas Frecuentes | FSM Admin",
};

export default async function AdminFAQsPage() {
  const faqs = await getFAQs();

  // Serialize FAQs to prevent hydration issues
  const serializedFAQs = faqs.map((f: any) => ({
    id: f.id.toString(),
    question: f.question,
    answer: f.answer,
    category: f.category || "General",
    order_index: f.order_index || 0
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-3 text-xs font-black tracking-widest uppercase text-gray-700 mb-8">
        <Link href="/admin" className="hover:text-fsm-red transition-colors flex items-center gap-2">
          <Home size={14} /> Dashboard
        </Link>
        <ChevronRight size={14} />
        <span className="text-fsm-blue">Preguntas Frecuentes</span>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-premium border border-gray-100">
        <FAQManager faqs={serializedFAQs} />
      </div>
    </div>
  );
}
