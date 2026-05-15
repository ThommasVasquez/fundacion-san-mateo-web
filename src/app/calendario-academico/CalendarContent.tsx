"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronRight, CalendarDays, Info, ArrowRight, ShieldCheck, Clock, Tag } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  type: string;
}

interface CalendarContentProps {
  events: CalendarEvent[];
}

const CalendarContent = ({ events }: CalendarContentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".reveal-item", {
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: "power4.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        }
      });

      gsap.from(".event-card", {
        x: -30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".events-grid",
          start: "top 85%",
        }
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const eventTypes: Record<string, { label: string; color: string; bg: string }> = {
    academic: { label: "Académico", color: "text-fsm-blue", bg: "bg-fsm-blue/10" },
    holiday: { label: "Festivo", color: "text-fsm-red", bg: "bg-fsm-red/10" },
    exam: { label: "Exámenes", color: "text-orange-600", bg: "bg-orange-50" },
    admission: { label: "Admisiones", color: "text-green-600", bg: "bg-green-50" },
    event: { label: "Evento", color: "text-purple-600", bg: "bg-purple-50" }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const getDay = (dateStr: string) => new Date(dateStr).getDate();
  const getMonthShort = (dateStr: string) => 
    new Date(dateStr).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase().replace('.', '');

  return (
    <div ref={containerRef} className="container mx-auto px-8 py-24">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-800 mb-20">
        <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
        <ChevronRight size={14} className="text-fsm-red" />
        <span className="text-fsm-blue">Calendario Académico</span>
      </div>

      <div className="max-w-6xl mx-auto space-y-32">
        {/* Intro Section */}
        <div className="reveal-item flex flex-col md:flex-row md:items-center justify-between gap-12">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-fsm-blue text-white rounded-[2.5rem] flex items-center justify-center shadow-premium">
              <CalendarDays size={32} />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-fsm-blue uppercase tracking-tighter leading-none">
                Programación <br /> <span className="text-fsm-red">Institucional</span>
              </h2>
            </div>
          </div>
          
          <div className="bg-gray-50/50 px-10 py-6 rounded-3xl border border-gray-100 flex items-center gap-4 max-w-md">
            <Info className="text-fsm-red shrink-0" size={24} />
            <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest leading-relaxed">
              Cronograma oficial actualizado para el periodo académico vigente.
            </p>
          </div>
        </div>

        {/* Dynamic Events List */}
        <section className="space-y-12">
            <div className="reveal-item flex items-center gap-4 mb-8">
                <span className="h-px w-12 bg-fsm-red"></span>
                <h3 className="text-xl font-black text-fsm-blue uppercase tracking-widest">Próximas Fechas Clave</h3>
            </div>

            <div className="events-grid grid grid-cols-1 gap-6">
                {events.length > 0 ? (
                    events.map((event) => (
                        <div key={event.id} className="event-card group bg-white hover:bg-gray-50 p-6 md:p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-premium transition-all duration-500 flex flex-col md:flex-row items-center gap-8">
                            {/* Date Badge */}
                            <div className="w-24 h-24 shrink-0 bg-fsm-blue group-hover:bg-fsm-red rounded-[2rem] flex flex-col items-center justify-center text-white transition-colors duration-500 shadow-lg">
                                <span className="text-3xl font-black leading-none">{getDay(event.start_date)}</span>
                                <span className="text-[10px] font-black tracking-widest uppercase">{getMonthShort(event.start_date)}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 space-y-2 text-center md:text-left">
                                <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center mb-2">
                                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${eventTypes[event.type]?.bg || 'bg-gray-100'} ${eventTypes[event.type]?.color || 'text-gray-600'}`}>
                                        {eventTypes[event.type]?.label || "General"}
                                    </span>
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                        <Clock size={12} /> {formatDate(event.start_date)}
                                        {event.end_date && ` - ${formatDate(event.end_date)}`}
                                    </span>
                                </div>
                                <h4 className="text-2xl font-black text-fsm-blue group-hover:text-fsm-red transition-colors duration-300 uppercase tracking-tighter">
                                    {event.title}
                                </h4>
                                {event.description && (
                                    <p className="text-gray-600 font-medium leading-relaxed max-w-2xl">
                                        {event.description}
                                    </p>
                                )}
                            </div>

                            {/* Action */}
                            <div className="shrink-0 hidden md:block">
                                <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-fsm-red group-hover:bg-fsm-red group-hover:text-white transition-all duration-300">
                                    <ArrowRight size={20} />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="reveal-item text-center py-20 bg-gray-50 rounded-[4rem] border-2 border-dashed border-gray-200">
                        <CalendarDays className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No hay eventos programados actualmente</p>
                    </div>
                )}
            </div>
        </section>

        {/* Google Calendar Fallback/Detail View */}
        <section className="reveal-item space-y-12">
          <div className="flex items-center gap-4 mb-8">
                <span className="h-px w-12 bg-fsm-red"></span>
                <h3 className="text-xl font-black text-fsm-blue uppercase tracking-widest">Vista de Calendario Completa</h3>
          </div>
          
          <div className="bg-gray-50/30 rounded-[5rem] shadow-premium p-4 md:p-12 lg:p-16 border border-gray-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-fsm-blue/5 rounded-full -translate-y-1/2 translate-x-1/2 "></div>
             
             <div className="relative z-10 w-full aspect-[4/3] min-h-[600px] bg-white rounded-[4rem] overflow-hidden shadow-inner border-[12px] border-white ring-1 ring-gray-100">
                <iframe 
                  src="https://calendar.google.com/calendar/embed?src=6a7b21ddc687d76a6ad3f2532531f194f3df69b450959509351f37730f297c75%40group.calendar.google.com&ctz=America%2FBogota" 
                  style={{ borderWidth: 0 }} 
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  scrolling="no"
                  className="opacity-90 hover:opacity-100 transition-opacity duration-700 contrast-[0.9] saturate-[0.8]"
                ></iframe>
             </div>
          </div>
        </section>

        {/* Info Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="reveal-item p-12 bg-fsm-blue rounded-[4rem] text-white shadow-premium relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-fsm-red/40  rounded-full translate-x-1/2 -translate-y-1/2 opacity-60"></div>
             <h4 className="text-2xl font-black mb-8 uppercase tracking-tighter">Eventos y Grados</h4>
             <p className="text-white/60 text-lg font-medium leading-relaxed mb-8">
               Los cierres semestrales, ceremonias de graduación y jornadas de bienestar se publican con antelación para garantizar la participación de toda la comunidad.
             </p>
             <Link href="/galeria" className="inline-flex items-center gap-2 text-xs font-black tracking-widest uppercase hover:text-fsm-red transition-colors">
                Ver memorias de eventos <ArrowRight size={18} />
             </Link>
          </div>

          <div className="reveal-item p-12 bg-gray-50 rounded-[4rem] border border-gray-100 shadow-sm relative overflow-hidden group">
             <ShieldCheck className="absolute top-8 right-8 text-fsm-red/10" size={64} />
             <h4 className="text-2xl font-black text-fsm-blue mb-8 uppercase tracking-tighter">Soporte Académico</h4>
             <p className="text-gray-700 text-lg font-medium leading-relaxed mb-10">
               Para consultas específicas sobre cambios de horario o reserva de auditorios, contacte a secretaría en:
             </p>
             <div className="flex flex-col gap-4">
                <p className="text-2xl font-black text-fsm-blue tracking-tighter">(601) 732 1080</p>
                <Link href="/institucion/directorio" className="text-[10px] font-black text-fsm-red tracking-[0.2em] uppercase hover:underline">Ver directorio completo</Link>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarContent;
