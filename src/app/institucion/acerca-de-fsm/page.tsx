"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const [selectedNorm, setSelectedNorm] = useState<number | null>(null);

  const normsData = [
    {
      id: 0,
      src: "/img/logo-ISO9001.jpg", 
      alt: "ISO 9001",
      title: "ISO 9001:2015",
      subtitle: "Gestión de Calidad Global",
      desc: "Garantiza que todos nuestros procesos administrativos y académicos cumplen con estándares internacionales de eficiencia y mejora continua."
    },
    {
      id: 1,
      src: "/img/logo-NTC5555.jpg", 
      alt: "NTC 5555",
      title: "NTC 5555",
      subtitle: "Calidad Institucional",
      desc: "Certifica nuestro sistema de gestión específico para instituciones de Formación para el Trabajo y el Desarrollo Humano."
    },
    {
      id: 2,
      src: "/img/logo-NTC5581.jpg", 
      alt: "NTC 5581",
      title: "NTC 5581",
      subtitle: "Excelencia en Programas",
      desc: "Avala el diseño y la prestación de nuestros servicios de formación, asegurando pertinencia y calidad en el mercado laboral."
    },
    {
      id: 3,
      src: "/img/logo-NTC5663.jpg", 
      alt: "NTC 5663",
      title: "NTC 5663",
      subtitle: "Especialidad en Salud",
      desc: "Certificación rigurosa exclusiva para programas del área de la salud, garantizando prácticas seguras e idóneas y laboratorios equipados."
    }
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray(".reveal-section").forEach((el: any) => {
        gsap.from(el, {
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
          },
          y: 50,
          opacity: 0,
          duration: 1.2,
          ease: "power4.out"
        });
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
            <p className="text-lg text-gray-700 font-medium leading-relaxed">
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
        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-800 mb-24">
          <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-gray-700">Institución</span>
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
              <div className="space-y-8 text-xl text-gray-700 font-medium leading-relaxed text-balance">
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
                <p className="text-lg text-gray-700 font-medium leading-relaxed mb-10">
                  Nuestra institución está comprometida con los más altos estándares educativos. Contamos con certificaciones ISO que garantizan la calidad en todos nuestros procesos administrativos y pedagógicos.
                </p>
                
                <div className="flex flex-wrap gap-8">
                  {[
                    { src: "/img/logo-ISO9001.jpg", alt: "ISO 9001" },
                    { src: "/img/logo-NTC5555.jpg", alt: "NTC 5555" },
                    { src: "/img/logo-NTC5581.jpg", alt: "NTC 5581" },
                    { src: "/img/logo-NTC5663.jpg", alt: "NTC 5663" }
                  ].map((cert, i) => (
                    <div key={i} className="w-24 h-24 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center group hover:bg-white hover:shadow-xl transition-all duration-500 overflow-hidden p-3">
                      <div className="relative w-full h-full">
                        <Image 
                          src={cert.src} 
                          alt={cert.alt} 
                          fill 
                          className="object-contain" 
                        />
                      </div>
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
              <p className="text-xl text-gray-700 leading-relaxed font-medium">
                Ser reconocidos en todo Cundinamarca por la excelencia educativa, compromiso social y el liderazgo en la formación técnica certificada bajo rigurosos sistemas de gestión de calidad.
              </p>
            </div>
          </div>

          {/* Trayectoria Highlight - Bento Style */}
          <div className="reveal-section bg-fsm-red p-16 md:p-24 rounded-[5rem] text-center relative overflow-hidden text-white shadow-premium transition-all duration-500">
             <div className="absolute inset-0 bg-[url('/img/pattern.png')] opacity-10 mix-blend-overlay"></div>
             <div className="relative z-10 space-y-12">
                <ShieldCheck className="mx-auto text-white/20 mb-6" size={64} />
                
                <div className="min-h-[180px] flex flex-col justify-center transition-opacity duration-500">
                  {selectedNorm === null ? (
                    <div>
                      <h3 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-6">Excelencia Acreditada</h3>
                      <p className="max-w-4xl mx-auto text-xl md:text-2xl text-white/70 font-light leading-relaxed">
                        Contamos con certificaciones internacionales <span className="text-white font-black underline decoration-white/30 decoration-wavy underline-offset-8">ISO 9001:2015</span> y Normas Técnicas de Calidad (NTC) que avalan nuestra trayectoria ininterrumpida desde el año 2000.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-black text-white/60 tracking-widest uppercase mb-4">{normsData[selectedNorm].title}</p>
                      <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-6">{normsData[selectedNorm].subtitle}</h3>
                      <p className="max-w-4xl mx-auto text-xl text-white/80 font-light leading-relaxed mb-8">
                        {normsData[selectedNorm].desc}
                      </p>
                      <button 
                        onClick={() => setSelectedNorm(null)}
                        className="text-xs font-black tracking-widest uppercase bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full transition-colors cursor-pointer"
                      >
                        Volver a vista general
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap justify-center gap-6 pt-8 border-t border-white/10">
                  {normsData.map((cert) => (
                    <button 
                      key={cert.id}
                      onClick={() => setSelectedNorm(cert.id)}
                      className={`w-20 h-20 md:w-24 md:h-24 bg-white rounded-3xl p-3 shadow-lg flex items-center justify-center transition-all duration-300 ${selectedNorm === cert.id ? 'ring-4 ring-white scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100 cursor-pointer'}`}
                    >
                      <div className="relative w-full h-full pointer-events-none">
                        <Image src={cert.src} alt={cert.alt} fill className="object-contain" />
                      </div>
                    </button>
                  ))}
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
