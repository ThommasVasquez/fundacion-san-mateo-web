"use client";

import React, { useState, useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, GraduationCap, BookOpen, UserPlus, ArrowRight, Star } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import gsap from "gsap";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const categories = [
  { id: "tecnicos", name: "PROGRAMAS TÉCNICOS", icon: <GraduationCap size={20} /> },
  { id: "continua", name: "EDUCACIÓN CONTINUA", icon: <BookOpen size={20} /> },
];

const technicalPrograms = [
  { 
    title: "AUXILIAR DE ENFERMERÍA", 
    subtitle: "Excelencia en Salud",
    image: "/img/image21.jpg", 
    href: "/programa-enfermeria",
    description: "Formación líder en Soacha con altos estándares de calidad técnica y humana."
  },
  { 
    title: "ATENCIÓN INTEGRAL A LA PRIMERA INFANCIA", 
    subtitle: "Educación de Futuro",
    image: "/img/image25.jpg", 
    href: "/programa-primera-infancia",
    description: "Especialízate en el cuidado y desarrollo pedagógico de los más pequeños." 
  },
];

const continuousEducation = [
  { title: "SOPORTE VITAL BÁSICO", image: "/img/curso-soporte-vital-basico.jpg", href: "/curso-soporte-vital-basico" },
  { title: "MANEJO DEL DUELO", image: "/img/curso-manejo-de-duelo-2.jpg", href: "/curso-manejo-de-duelo" },
  { title: "PAI E INYECTOLOGÍA", image: "/img/curso-pai-inyectologia.jpg", href: "/curso-pai-inyectologia" },
  { title: "PRIMEROS AUXILIOS", image: "/img/curso-primeros-auxilios.jpg", href: "/curso-primeros-auxilios" },
  { title: "SUTURAS", image: "/img/curso-suturas.jpg", href: "/curso-suturas" },
  { title: "CÓDIGO BLANCO Y ATENCIÓN A VÍCTIMAS", image: "/img/image17.jpg", href: "/curso-codigo-blanco-atencion-victimas" },
  { title: "SOCORRISMO Y RESCATE", image: "/img/image14.jpg", href: "/curso-socorrismo-y-rescate" },
];

export default function AcademicOffer() {
  const [activeTab, setActiveTab] = useState("tecnicos");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".reveal-item", {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out"
      });
    }, containerRef);
    return () => ctx.revert();
  }, [activeTab]);

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      
      {/* Immersive Header - Split Screen */}
      <section className="relative min-h-[60vh] flex flex-col lg:flex-row pt-24 overflow-hidden">
        <div className="lg:w-1/2 flex items-center px-8 md:px-20 py-20 bg-white relative z-10">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-12 h-px bg-fsm-red"></span>
              <span className="text-[10px] font-black tracking-[0.4em] text-fsm-red uppercase">Directorio Académico</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-fsm-blue leading-none mb-8">
              TU FUTURO <br />
              <span className="text-fsm-red">EMPIEZA AQUÍ</span>
            </h1>
            <p className="text-lg text-gray-400 font-medium leading-relaxed">
              Descubre nuestra amplia gama de programas técnicos y cursos de actualización diseñados para potenciar tu perfil profesional en el sector real.
            </p>
          </div>
        </div>
        <div className="lg:w-1/2 relative min-h-[300px] lg:min-h-full overflow-hidden">
          <Image src="/img/banner31.jpg" alt="FSM Class" fill className="object-cover scale-110" priority />
        </div>
      </section>

      <div ref={containerRef} className="container mx-auto px-8 py-24">
        {/* Navigation & Filter */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-12 mb-20">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-300">
            <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
            <ChevronRight size={14} className="text-fsm-red" />
            <span className="text-fsm-blue">Oferta académica</span>
          </div>

          {/* Premium Filter Pills */}
          <div className="inline-flex p-1.5 bg-gray-50 rounded-full border border-gray-100 shadow-inner">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-8 py-3.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase transition-all duration-500",
                  activeTab === cat.id 
                    ? "bg-fsm-blue text-white shadow-lg" 
                    : "text-gray-400 hover:text-fsm-blue"
                )}
              >
                {cat.icon}
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Display Content */}
        <div className="min-h-[600px]">
          {activeTab === "tecnicos" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 h-full">
              {technicalPrograms.map((program, i) => (
                <Link 
                  href={program.href} 
                  key={program.title}
                  className="reveal-item group relative h-[500px] lg:h-[600px] rounded-[4rem] overflow-hidden shadow-premium border border-gray-100"
                >
                  <Image src={program.image} alt={program.title} fill className="object-cover transition-transform duration-1000 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-fsm-blue/40 opacity-80 group-hover:opacity-95 transition-opacity duration-700" />
                  <div className="absolute inset-0 p-12 md:p-16 flex flex-col justify-end text-white z-10">
                    <div className="mb-6 w-14 h-14 bg-fsm-blue/20 rounded-2xl flex items-center justify-center border border-white/20 group-hover:bg-fsm-red group-hover:border-fsm-red transition-all duration-500">
                      <GraduationCap size={28} />
                    </div>
                    <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-70 mb-4">{program.subtitle}</span>
                    <h2 className="text-3xl md:text-5xl font-black leading-none mb-8 text-balance">{program.title}</h2>
                    <p className="text-white/60 text-lg mb-12 max-w-sm line-clamp-2 font-medium">{program.description}</p>
                    <div className="flex items-center gap-4 font-black text-[10px] tracking-widest text-white group-hover:text-fsm-red transition-colors">
                      SABER MÁS <ArrowRight size={18} className="transition-transform group-hover:translate-x-2" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {continuousEducation.map((program) => (
                <Link 
                  href={program.href} 
                  key={program.title}
                  className="reveal-item group bg-white rounded-[3rem] overflow-hidden shadow-premium border border-gray-50 hover:-translate-y-4 transition-all duration-700"
                >
                  <div className="relative h-72">
                    <Image src={program.image} alt={program.title} fill className="object-cover transition-transform duration-1000 group-hover:scale-110 group-hover:grayscale-0" />
                    <div className="absolute inset-0 bg-fsm-blue/10 group-hover:bg-transparent transition-colors duration-500" />
                  </div>
                  <div className="p-10">
                    <div className="flex items-center gap-2 mb-6">
                      <span className="w-8 h-px bg-fsm-red"></span>
                      <span className="text-[9px] font-black tracking-widest text-fsm-red uppercase">Educación Continua</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-fsm-blue group-hover:text-fsm-red transition-colors leading-[1.1] mb-8 min-h-[3rem]">{program.title}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-black text-[9px] tracking-widest text-fsm-blue group-hover:gap-4 transition-all transition-all duration-500 uppercase">
                        Detalles <ArrowRight size={14} className="text-fsm-red" />
                      </div>
                      <Link 
                        href="https://fundacionsanmateo.q10.com/Preinscripcion"
                        target="_blank"
                        className="p-3 bg-gray-50 rounded-xl hover:bg-fsm-red hover:text-white transition-all text-fsm-blue"
                      >
                         <UserPlus size={16} />
                      </Link>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic CTA */}
        <div className="mt-32 p-12 md:p-20 bg-fsm-blue rounded-[5rem] relative overflow-hidden text-center group">
          <div className="relative z-10 max-w-3xl mx-auto">
            <h4 className="text-4xl md:text-5xl font-black text-white mb-8 uppercase leading-tight">
              ¿LISTO PARA <br /> <span className="text-fsm-red">DAR EL SALTO</span>?
            </h4>
            <p className="text-white/60 text-xl font-medium mb-12">
              Únete a la mejor institución técnica de Soacha. Matrículas abiertas con facilidades de pago.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <a 
                href="https://fundacionsanmateo.q10.com/Preinscripcion"
                target="_blank"
                className="bg-fsm-red text-white px-12 py-5 rounded-full font-black text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-fsm-blue transition-all duration-500 shadow-xl"
              >
                PREINSCRIBIRME YA
              </a>
              <Link 
                href="/contacto"
                className="text-white/70 hover:text-white font-black text-xs tracking-widest uppercase flex items-center gap-2"
              >
                Hablar con un asesor <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <WhatsAppButton />
    </main>
  );
}
