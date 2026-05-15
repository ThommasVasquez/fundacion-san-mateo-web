import React from "react";
import GlobalCMSForm from "@/components/admin/GlobalCMSForm";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { getAllContent, getTestimonials, getDirectoryItems, getPrograms, getNewsEvents, getGallery, getCalendarEvents } from "@/lib/content";

export const metadata = {
  title: "Gestor Global de Contenido | FSM Admin",
};

export default async function AdminHomePage() {
  // Obtenemos los valores actuales de la base de datos
  const content = await getAllContent();
  const testimonials = await getTestimonials();
  const directoryItems = await getDirectoryItems();
  const programs = await getPrograms();
  const newsEvents = await getNewsEvents();
  const galleryItems = await getGallery();
  const calendarEvents = await getCalendarEvents();
  
  // Serialize for client component
  const initialContentMap: Record<string, string> = {};
  content.forEach((item: any) => {
    initialContentMap[item.content_key] = item.value;
  });

  const serializedNews = newsEvents.map((item: any) => ({
    id: item.id.toString(),
    title: item.title,
    description: item.description || '',
    image_url: item.image_url || '',
    date_text: item.date_text || '',
    category: item.category || '',
    link: item.link || ''
  }));

  const serializedTestimonials = testimonials.map((t: any) => ({
    id: t.id.toString(),
    text: t.text,
    author: t.author,
    role: t.role
  }));

  const serializedDirectoryItems = directoryItems.map((item: any) => ({
    id: item.id.toString(),
    title: item.title,
    phone: item.phone
  }));

  const serializedPrograms = programs.map((p: any) => ({
    id: p.id.toString(),
    title: p.title,
    subtitle: p.subtitle || '',
    description: p.description || '',
    image_url: p.image_url,
    href: p.href,
    category: p.category,
    is_featured: p.is_featured
  }));

  const serializedGallery = galleryItems.map((item: any) => ({
    id: item.id.toString(),
    image_url: item.image_url,
    thumb_url: item.thumb_url || '',
    span_class: item.span_class || 'col-span-1 row-span-1',
    order_index: item.order_index
  }));

  const serializedCalendar = calendarEvents.map((item: any) => ({
    id: item.id.toString(),
    title: item.title,
    description: item.description || '',
    start_date: item.start_date ? new Date(item.start_date).toISOString() : '',
    end_date: item.end_date ? new Date(item.end_date).toISOString() : '',
    type: item.type || 'academic'
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-3 text-xs font-black tracking-widest uppercase text-gray-700 mb-8">
        <Link href="/admin" className="hover:text-fsm-red transition-colors flex items-center gap-2">
          <Home size={14} /> Dashboard
        </Link>
        <ChevronRight size={14} />
        <span className="text-fsm-blue">Gestor Global</span>
      </div>

      <div>
        <h1 className="text-3xl font-black text-fsm-blue uppercase tracking-tighter mb-2">GESTOR GLOBAL DE CONTENIDO</h1>
        <p className="text-gray-900 font-medium">Gestiona los textos, títulos e imágenes de todas las páginas de la institución.</p>
      </div>

      {/* Formulario Cliente Unificado */}
      <GlobalCMSForm 
        initialContent={initialContentMap} 
        initialTestimonials={serializedTestimonials} 
        initialDirectoryItems={serializedDirectoryItems}
        initialPrograms={serializedPrograms}
        initialNews={serializedNews}
        initialGallery={serializedGallery}
        initialCalendarEvents={serializedCalendar}
      />
    </div>
  );
}
