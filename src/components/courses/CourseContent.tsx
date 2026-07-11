"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Target, Users, BookOpen, Lightbulb, ArrowRight, CheckCircle2, ShieldCheck, Clock, Award } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import gsap from "gsap";
import { getNavbarSettings } from "@/app/actions";
import { useState } from "react";

interface CourseProps {
  title: string;
  bannerImg: string;
  mainImg: string;
  directedTo: string;
  objective: string;
  methodology: string;
  resources: string[];
}

export default function CourseContent({ title, bannerImg, mainImg, directedTo, objective, methodology, resources }: CourseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inscripcionesLink, setInscripcionesLink] = useState("https://fundacionsanmateosoacha.escalapages.com/centro-de-ventas");

  useEffect(() => {
    async function loadLink() {
      try {
        const settings = await getNavbarSettings();
        if (settings.link) {
          setInscripcionesLink(settings.link);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadLink();
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".reveal-item", {
        y: 20,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out"
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      
      {/* Cinematic Course Header - Split Screen */}
      <section className="relative min-h-[60vh] flex flex-col lg:flex-row pt-24 overflow-hidden bg-fsm-blue">
        <div className="lg:w-[55%] flex items-center px-8 md:px-20 py-20 bg-white relative z-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-8">
              <span className="w-12 h-px bg-fsm-red"></span>
              <span className="text-[10px] font-black tracking-[0.5em] text-fsm-red uppercase">Educación Continua</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-fsm-blue leading-none mb-10 text-balance uppercase">
              {title}
            </h1>
            <p className="text-lg text-gray-700 font-medium leading-relaxed max-w-lg mb-12">
              Actualización profesional certificada por la Fundación San Mateo, con metodología teórico-práctica intensiva.
            </p>
            <div className="flex flex-wrap gap-8 opacity-40">
               <div className="flex items-center gap-3">
                 <Clock size={18} className="text-fsm-blue" />
                 <span className="text-[9px] font-black tracking-widest uppercase text-fsm-blue">Curso Corto</span>
               </div>
               <div className="flex items-center gap-3">
                  <Award size={18} className="text-fsm-blue" />
                  <span className="text-[9px] font-black tracking-widest uppercase text-fsm-blue">Certificable</span>
               </div>
            </div>
          </div>
        </div>
        <div className="lg:w-[45%] relative min-h-[300px] lg:min-h-full">
          <Image src={bannerImg} alt={title} fill className="object-cover" priority />
          {/* Gradient removed as per user request */}
          {/* Decorative element */}
          <div className="absolute top-1/2 left-0 w-full h-px bg-fsm-red/20 -translate-y-1/2 -rotate-12"></div>
        </div>
      </section>

      <div ref={containerRef} className="container mx-auto px-8 py-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-800 mb-20">
          <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <Link href="/oferta-academica" className="hover:text-fsm-red transition-colors">Oferta académica</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-fsm-blue">{title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          {/* Main Info */}
          <div className="lg:col-span-8 space-y-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
               <div className="reveal-item space-y-10">
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-fsm-red/10 text-fsm-red rounded-xl"><Users size={24} /></div>
                      <h3 className="font-black text-fsm-blue uppercase tracking-[0.2em] text-[10px]">Dirigido a</h3>
                    </div>
                    <p className="text-gray-900 font-bold leading-relaxed">{directedTo}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-fsm-red/10 text-fsm-red rounded-xl"><Target size={24} /></div>
                      <h3 className="font-black text-fsm-blue uppercase tracking-[0.2em] text-[10px]">Objetivo General</h3>
                    </div>
                    <p className="text-gray-900 leading-relaxed font-medium italic border-l-4 border-fsm-red/20 pl-6">{objective}</p>
                  </div>
               </div>

               <div className="reveal-item space-y-10">
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-fsm-red/10 text-fsm-red rounded-xl"><BookOpen size={24} /></div>
                      <h3 className="font-black text-fsm-blue uppercase tracking-[0.2em] text-[10px]">Metodología</h3>
                    </div>
                    <div className="bg-fsm-blue text-white px-8 py-4 rounded-2xl w-fit font-black text-[10px] tracking-widest shadow-premium uppercase">
                      {methodology}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-fsm-red/10 text-fsm-red rounded-xl"><Lightbulb size={24} /></div>
                      <h3 className="font-black text-fsm-blue uppercase tracking-[0.2em] text-[10px]">Recursos Requeridos</h3>
                    </div>
                    <ul className="grid grid-cols-1 gap-4">
                      {resources.map((res, i) => (
                        <li key={i} className="flex items-center gap-3 text-xs font-black text-gray-700 uppercase tracking-tighter">
                          <CheckCircle2 size={16} className="text-fsm-red" />
                          {res}
                        </li>
                      ))}
                    </ul>
                  </div>
               </div>
            </div>

            {/* Admission Process Section - Premium Redesign */}
            <div className="reveal-item bg-gray-50/50 p-12 md:p-16 rounded-[4rem] border border-gray-100 shadow-sm overflow-hidden relative">
              {/* Blur removed */}
              <h2 className="text-3xl font-black text-fsm-blue mb-12 uppercase relative z-10">Proceso de <br /> <span className="text-fsm-red">Vinculación</span></h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                <div className="space-y-6 group">
                  <div className="w-14 h-14 bg-white text-fsm-red font-black flex items-center justify-center rounded-2xl shadow-sm text-xl group-hover:bg-fsm-red group-hover:text-white transition-all duration-500">01</div>
                  <h4 className="font-black text-fsm-blue uppercase text-[10px] tracking-widest">Inscripción</h4>
                  <p className="text-xs text-gray-900 font-medium leading-relaxed uppercase tracking-tighter">Preinscripción digital para reserva de cupo en la plataforma Q10.</p>
                </div>
                <div className="space-y-6 group">
                  <div className="w-14 h-14 bg-white text-fsm-red font-black flex items-center justify-center rounded-2xl shadow-sm text-xl group-hover:bg-fsm-red group-hover:text-white transition-all duration-500">02</div>
                  <h4 className="font-black text-fsm-blue uppercase text-[10px] tracking-widest">Documentos</h4>
                  <ul className="text-[10px] text-gray-900 font-black uppercase tracking-tighter space-y-2 opacity-60">
                    <li>• Cédula de Ciudadanía</li>
                    <li>• Soporte Académico</li>
                    <li>• Foto 3x4</li>
                  </ul>
                </div>
                <div className="space-y-6 group">
                  <div className="w-14 h-14 bg-white text-fsm-red font-black flex items-center justify-center rounded-2xl shadow-sm text-xl group-hover:bg-fsm-red group-hover:text-white transition-all duration-500">03</div>
                  <h4 className="font-black text-fsm-blue uppercase text-[10px] tracking-widest">Matrícula</h4>
                  <p className="text-xs text-gray-900 font-medium leading-relaxed uppercase tracking-tighter">Formalización presencial y pago en nuestra sede administrativa.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="reveal-item sticky top-32 space-y-10">
              <div className="relative aspect-[4/5] rounded-[4rem] overflow-hidden shadow-premium group">
                <Image src={mainImg} alt={title} fill className="object-cover transition-transform duration-1000 group-hover:scale-110" />
                {/* Gradient removed as per user request */}
                <div className="absolute inset-0 flex flex-col justify-end p-12">
                   <div className="flex items-center gap-3 mb-6 text-white/60">
                      <ShieldCheck size={20} className="text-fsm-red" />
                      <span className="text-[9px] font-black tracking-widest uppercase">Certificado Incluido</span>
                   </div>
                   <a 
                    href={inscripcionesLink} 
                    target="_blank"
                    className="w-full bg-white text-fsm-blue font-black py-5 rounded-2xl hover:bg-fsm-red hover:text-white transition-all flex items-center justify-center gap-3 group shadow-xl uppercase text-xs tracking-widest"
                  >
                    INSCRIBIRSE <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                  </a>
                </div>
              </div>

               <div className="p-12 bg-gray-50 rounded-[4rem] text-center border border-gray-100 shadow-sm">
                 <div className="w-12 h-1 bg-fsm-red mx-auto mb-8 rounded-full"></div>
                 <p className="font-black text-[10px] tracking-[0.3em] mb-6 text-fsm-blue uppercase">Infraestructura</p>
                 <p className="font-bold text-gray-700 text-sm leading-relaxed">Laboratorios equipados con tecnología biomédica de punta para simulación real.</p>
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
