"use client";

import React, { useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, CalendarDays, Info, ArrowRight, ShieldCheck } from "lucide-react";
import gsap from "gsap";

export default function AcademicCalendarPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".reveal-item", {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out"
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      
      {/* Cinematic Header - Split Screen */}
      <section className="relative min-h-[60vh] flex flex-col lg:flex-row pt-24 overflow-hidden">
        <div className="lg:w-1/2 flex items-center px-8 md:px-20 py-20 bg-white relative z-10">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-12 h-px bg-fsm-red"></span>
              <span className="text-[10px] font-black tracking-[0.4em] text-fsm-red uppercase">Cronograma Escolar</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-fsm-blue leading-none mb-8 uppercase">
              CALENDARIO <br />
              <span className="text-fsm-blue-light">Académico</span>
            </h1>
            <p className="text-lg text-gray-700 font-medium leading-relaxed">
              Planifique su semestre con nuestra programación oficial de clases, eventos, periodos de matrícula y fechas institucionales.
            </p>
          </div>
        </div>
        <div className="lg:w-1/2 relative min-h-[300px] lg:min-h-full overflow-hidden bg-fsm-blue">
          <Image src="/img/banner8.jpg" alt="Calendario FSM" fill className="object-cover scale-110 brightness-75" priority />
          {/* Gradient removed as per user request */}
          {/* Decorative element */}
          <div className="absolute bottom-12 right-12 z-20 bg-white/10  p-6 rounded-[2.5rem] border border-white/20 shadow-premium">
             <CalendarDays className="text-white opacity-50" size={32} />
          </div>
        </div>
      </section>

      <div ref={containerRef} className="container mx-auto px-8 py-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-800 mb-20">
          <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-fsm-blue">Calendario Académico</span>
        </div>

        <div className="max-w-6xl mx-auto space-y-24">
          <div className="reveal-item flex flex-col md:flex-row md:items-center justify-between gap-12 mb-16">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-fsm-blue text-white rounded-[2.5rem] flex items-center justify-center shadow-premium">
                <CalendarDays size={32} />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-fsm-blue uppercase tracking-tighter leading-none">Programación <br /> <span className="text-fsm-red">Oficial</span></h2>
              </div>
            </div>
            
            <div className="bg-gray-50/50 px-10 py-6 rounded-3xl border border-gray-100 flex items-center gap-4 max-w-md">
              <Info className="text-fsm-red shrink-0" size={24} />
              <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest leading-relaxed">
                Actualizado en tiempo real por la Dirección Académica institucional.
              </p>
            </div>
          </div>

          {/* Premium Calendar Container */}
          <div className="reveal-item bg-gray-50/30 rounded-[5rem] shadow-premium p-4 md:p-12 lg:p-16 border border-gray-100 relative overflow-hidden">
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

          {/* Info Blocks - Asymmetrical */}
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
                  <Link href="/contacto" className="text-[10px] font-black text-fsm-red tracking-[0.2em] uppercase hover:underline">Ver directorio completo</Link>
               </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <WhatsAppButton />
    </main>
  );
}
