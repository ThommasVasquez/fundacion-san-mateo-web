"use client";

import React, { useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, History, Target, Eye, Award, Sparkles, ShieldCheck } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function AboutPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".reveal-section", {
        scrollTrigger: {
          trigger: ".reveal-section",
          start: "top 80%",
        },
        y: 50,
        opacity: 0,
        duration: 1.2,
        stagger: 0.3,
        ease: "power4.out",
      });

      gsap.from(".parallax-img", {
        scrollTrigger: {
          trigger: ".parallax-img",
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
        y: -50,
        ease: "none",
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
              <span className="text-[10px] font-black tracking-[0.4em] text-fsm-red uppercase">Nuestra Institución</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-fsm-blue leading-none mb-8">
              CONOCE LA <br />
              <span className="text-fsm-blue-light uppercase">Historia</span>
            </h1>
            <p className="text-lg text-gray-400 font-medium leading-relaxed">
              Más de dos décadas transformando vidas a través de la educación técnica de calidad en el municipio de Soacha.
            </p>
          </div>
        </div>
        <div className="lg:w-1/2 relative min-h-[300px] lg:min-h-full overflow-hidden bg-fsm-blue">
          <Image src="/img/banner32.jpg" alt="Acerca de FSM" fill className="object-cover scale-110 brightness-75" priority />
        {/* Gradient removed as per user request */}
        </div>
      </section>

      <div ref={containerRef} className="container mx-auto px-8 py-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-300 mb-24">
          <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-gray-400">Institución</span>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-fsm-blue">Acerca de la FSM</span>
        </div>

        <div className="max-w-7xl mx-auto space-y-40">
          {/* History Section - Asymmetrical */}
          <section className="reveal-section flex flex-col lg:flex-row gap-20 items-center">
            <div className="lg:w-1/2 relative">
               <div className="relative h-[600px] w-full rounded-[4rem] overflow-hidden shadow-premium z-10 border border-gray-100">
                  <Image src="/img/image4.png" alt="Historia FSM" fill className="parallax-img object-cover scale-125 transition-transform duration-700 hover:scale-100" />
               </div>
               {/* Decorative background element */}
               {/* Blur removed */}
            </div>
            
            <div className="lg:w-1/2 space-y-10">
              <div className="flex items-center gap-4 text-fsm-red">
                <History size={40} className="text-fsm-red" />
                <h2 className="text-4xl font-black text-fsm-blue uppercase tracking-tighter">Nuestra Trayectoria</h2>
              </div>
              <div className="space-y-8 text-xl text-gray-400 font-medium leading-relaxed text-balance">
                <p>
                  La <strong>FUNDACIÓN SAN MATEO</strong> nació en noviembre del año 2000 como una respuesta valiente a las crecientes necesidades educativas de las comunidades en riesgo de Soacha.
                </p>
                <p>
                  Desde el barrio San Mateo, iniciamos formando Promotores de Salud, evolucionando hasta convertirnos en la institución líder en formación de Técnicos Laborales que somos hoy, capacitándonos para interactuar con excelencia en el mercado laboral real.
                </p>
                <div className="p-10 bg-gray-50 rounded-[3rem] border border-gray-100 relative overflow-hidden group">
                   <Sparkles className="absolute top-8 right-8 text-fsm-red opacity-20 group-hover:rotate-12 transition-transform" />
                   <p className="text-base text-fsm-blue leading-relaxed font-bold italic relative z-10">
                    "Cumplimos una labor social vital, empoderando a jóvenes y adultos para transformar su realidad socioeconómica."
                   </p>
                </div>
              </div>

              {/* Added Excelencia Acreditada Block */}
              <div className="pt-10 border-t border-gray-100 reveal-section">
                <p className="text-sm font-bold text-fsm-red uppercase tracking-widest mb-4">Certificaciones de Calidad</p>
                <h3 className="text-3xl font-black text-fsm-blue uppercase tracking-tighter mb-6">Excelencia Acreditada</h3>
                <p className="text-lg text-gray-400 font-medium leading-relaxed mb-10">
                  Nuestra institución está comprometida con los más altos estándares educativos. Contamos con certificaciones ISO que garantizan la calidad en todos nuestros procesos administrativos y pedagógicos.
                </p>
                
                <div className="flex flex-wrap gap-8">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-24 h-24 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center group hover:bg-white hover:shadow-xl transition-all duration-500">
                      <Award size={40} className="text-gray-200 group-hover:text-fsm-red transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Mission & Vision - Cinematic Cards */}
          <div className="reveal-section grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="group bg-fsm-blue rounded-[5rem] p-16 text-white shadow-premium relative overflow-hidden transition-all duration-700 hover:-translate-y-4">
              {/* Blur removed */}
              <div className="bg-fsm-blue/10 p-6 rounded-3xl w-fit mb-12 border border-white/20 group-hover:bg-fsm-red transition-all duration-500">
                <Target size={48} className="text-white" />
              </div>
              <h2 className="text-4xl font-black mb-8 uppercase tracking-tighter leading-none">Misión</h2>
              <p className="text-xl text-white/60 leading-relaxed font-medium">
                Formar integralmente a nuestros estudiantes mediante programas técnicos con alto nivel de exigencia y competitividad, orientados por un talento humano idóneo y el mejoramiento continuo institucional.
              </p>
            </div>

            <div className="group bg-gray-50 rounded-[5rem] p-16 text-fsm-blue shadow-premium relative overflow-hidden transition-all duration-700 hover:-translate-y-4 border border-gray-100">
              {/* Blur removed */}
              <div className="bg-fsm-blue/5 p-6 rounded-3xl w-fit mb-12 border border-fsm-blue/10 group-hover:bg-fsm-blue group-hover:text-white transition-all duration-500">
                <Eye size={48} className="text-fsm-red group-hover:text-white" />
              </div>
              <h2 className="text-4xl font-black mb-8 uppercase tracking-tighter leading-none">Visión</h2>
              <p className="text-xl text-gray-400 leading-relaxed font-medium">
                Ser reconocidos en todo Cundinamarca por la excelencia educativa, compromiso social y el liderazgo en la formación técnica certificada bajo rigurosos sistemas de gestión de calidad.
              </p>
            </div>
          </div>

          {/* Trayectoria Highlight - Bento Style */}
          <div className="reveal-section bg-fsm-red p-16 md:p-24 rounded-[5rem] text-center relative overflow-hidden text-white shadow-premium">
             <div className="absolute inset-0 bg-[url('/img/pattern.png')] opacity-10 mix-blend-overlay"></div>
             <div className="relative z-10 space-y-12">
                <ShieldCheck className="mx-auto text-white/20 mb-6" size={64} />
                <h3 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none">Excelencia Acreditada</h3>
                <p className="max-w-4xl mx-auto text-xl md:text-2xl text-white/70 font-light leading-relaxed">
                  Contamos con certificaciones internacionales <span className="text-white font-black underline decoration-white/30 decoration-wavy underline-offset-8">ISO 9001:2015</span> y Normas Técnicas de Calidad (NTC) que avalan nuestra trayectoria ininterrumpida desde el año 2000.
                </p>
                <div className="flex flex-wrap justify-center gap-12 pt-8 opacity-40 group-transition-all">
                   <div className="text-center">
                      <p className="text-4xl font-black mb-1">24+</p>
                      <p className="text-[10px] uppercase font-black tracking-widest">Años de Historia</p>
                   </div>
                   <div className="text-center">
                      <p className="text-4xl font-black mb-1">4</p>
                      <p className="text-[10px] uppercase font-black tracking-widest">Normas Técnicas</p>
                   </div>
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
