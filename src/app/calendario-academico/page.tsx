import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, CalendarDays, Info, ArrowRight, ShieldCheck, Clock, MapPin } from "lucide-react";
import { getContentMap, getCalendarEvents } from "@/lib/content";
import CalendarContent from "./CalendarContent";

export const metadata = {
  title: "Calendario Académico | Fundación San Mateo",
  description: "Planifique su semestre con nuestra programación oficial de clases, eventos, periodos de matrícula y fechas institucionales.",
};

export default async function AcademicCalendarPage() {
  const content = await getContentMap("/calendario-academico");
  const rawEvents = await getCalendarEvents();

  const events = rawEvents.map((item: any) => ({
    id: item.id.toString(),
    title: item.title,
    description: item.description || '',
    start_date: item.start_date,
    end_date: item.end_date,
    type: item.type || 'academic'
  }));

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      
      {/* Cinematic Header - Split Screen */}
      <section className="relative min-h-[60vh] flex flex-col lg:flex-row pt-24 overflow-hidden">
        <div className="lg:w-1/2 flex items-center px-8 md:px-20 py-20 bg-white relative z-10">
          <div className="max-w-xl">
            <div className="reveal-item flex items-center gap-3 mb-6">
              <span className="w-12 h-px bg-fsm-red"></span>
              <span className="text-[10px] font-black tracking-[0.4em] text-fsm-red uppercase">
                {content.calendar_hero_subtitle || "Cronograma Escolar"}
              </span>
            </div>
            <h1 className="reveal-item text-5xl md:text-7xl font-black text-fsm-blue leading-none mb-8 uppercase">
              {content.calendar_hero_title1 || "CALENDARIO"} <br />
              <span className="text-fsm-blue-light">{content.calendar_hero_title2 || "Académico"}</span>
            </h1>
            <p className="reveal-item text-lg text-gray-700 font-medium leading-relaxed">
              {content.calendar_hero_description || "Planifique su semestre con nuestra programación oficial de clases, eventos, periodos de matrícula y fechas institucionales."}
            </p>
          </div>
        </div>
        <div className="lg:w-1/2 relative min-h-[300px] lg:min-h-full overflow-hidden bg-fsm-blue">
          <Image 
            src={content.calendar_hero_image || "/img/banner8.jpg"} 
            alt="Calendario FSM" 
            fill 
            className="object-cover scale-110 brightness-75" 
            priority 
          />
          <div className="absolute bottom-12 right-12 z-20 bg-white/10 p-6 rounded-[2.5rem] border border-white/20 shadow-premium">
             <CalendarDays className="text-white opacity-50" size={32} />
          </div>
        </div>
      </section>

      <CalendarContent events={events} />

      <Footer />
      <WhatsAppButton />
    </main>
  );
}
