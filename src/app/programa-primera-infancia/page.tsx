"use client";

import React, { useState, useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Calendar, Award, UserCheck, MapPin, CheckCircle2, ArrowRight, Baby, ShieldCheck, Clock } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import gsap from "gsap";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function EarlyChildhoodProgram() {
  const [activeTab, setActiveTab] = useState("plan");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".reveal-content", {
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
      });
    }, containerRef);
    return () => ctx.revert();
  }, [activeTab]);

  const tabs = [
    { id: "plan", name: "PLAN DE ESTUDIOS", icon: <Calendar size={18} /> },
    { id: "admision", name: "ADMISIÓN", icon: <UserCheck size={18} /> },
    { id: "acreditacion", name: "CALIDAD", icon: <ShieldCheck size={18} /> },
    { id: "practicas", name: "PRÁCTICAS", icon: <MapPin size={18} /> },
  ];

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      
      {/* Cinematic Program Header */}
      <section className="relative min-h-[70vh] flex flex-col lg:flex-row pt-24 overflow-hidden bg-fsm-red">
        <div className="lg:w-[55%] flex items-center px-8 md:px-20 py-20 bg-white relative z-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-8">
              <span className="w-12 h-px bg-fsm-red"></span>
              <span className="text-[10px] font-black tracking-[0.5em] text-fsm-red uppercase">Programa de Educación</span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-fsm-blue leading-[0.9] mb-10 text-balance uppercase">
              Atención <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fsm-red to-red-600">INFANTIL</span>
            </h1>
            <p className="text-xl text-gray-400 font-medium leading-relaxed max-w-lg mb-12">
              Formamos expertos en el cuidado y la educación integral de la primera infancia, con bases pedagógicas sólidas y vocación humanista.
            </p>
            <div className="flex flex-wrap gap-8 opacity-40">
               <div className="flex items-center gap-3">
                 <Clock size={20} className="text-fsm-blue" />
                 <span className="text-[10px] font-black tracking-widest uppercase text-fsm-blue">2 Semestres</span>
               </div>
               <div className="flex items-center gap-3">
                  <Baby size={20} className="text-fsm-blue" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-fsm-blue">Enfoque Pedagógico</span>
               </div>
            </div>
          </div>
        </div>
        <div className="lg:w-[45%] relative min-h-[400px] lg:min-h-full">
          <Image src="/img/banner13.jpg" alt="Atención Integral a la Primera Infancia" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-white lg:via-white/5 to-transparent z-10"></div>
          {/* Decorative element */}
          <div className="absolute top-1/2 left-0 w-full h-px bg-fsm-red/20 -translate-y-1/2 -rotate-12"></div>
        </div>
      </section>

      <div className="container mx-auto px-8 py-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-300 mb-20">
          <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <Link href="/oferta-academica" className="hover:text-fsm-red transition-colors">Oferta académica</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-fsm-blue">Primera Infancia</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
          {/* Main Strategic Content */}
          <div className="lg:col-span-8 space-y-24" ref={containerRef}>
            <section className="reveal-content">
              <div className="mb-8">
                <h2 className="text-[10px] font-black text-fsm-red tracking-[0.4em] uppercase mb-4 flex items-center gap-4">
                  <span className="w-12 h-px bg-fsm-red"></span>
                  Perfil Profesional
                </h2>
                <p className="text-3xl md:text-4xl font-black text-fsm-blue leading-tight uppercase font-display">
                   DANDO LOS PRIMEROS PASOS <br />
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-fsm-blue-deep to-fsm-blue">HACIA EL FUTURO</span>
                </p>
              </div>
              
              <div className="space-y-8 text-lg text-gray-500 font-medium leading-[1.8]">
                <p>
                  El Programa <strong>Técnico Laboral por Competencias en Atención Integral a la Primera Infancia</strong> de la Fundación San Mateo, promueve el desarrollo de competencias relacionadas con el cuidado y la atención integral (protección, nutrición, salud y educación) de los niños y las niñas de 0 a 6 años.
                </p>
                <p>
                  El egresado tendrá una concepción integral del manejo de las necesidades de los infantes al interior de un jardín infantil y contará con las herramientas pedagógicas necesarias para liderar procesos de enseñanza-aprendizaje desde la ternura y la técnica.
                </p>
              </div>
            </section>

            {/* Reimagined Tabs Section */}
            <div className="reveal-content">
              <div className="inline-flex p-1.5 bg-gray-50 rounded-full border border-gray-100 mb-12 overflow-x-auto max-w-full no-scrollbar">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-8 py-4 rounded-full text-[10px] font-black tracking-widest transition-all duration-500 whitespace-nowrap",
                      activeTab === tab.id 
                        ? "bg-fsm-blue text-white shadow-premium scale-105" 
                        : "text-gray-400 hover:text-fsm-blue"
                    )}
                  >
                    {tab.icon}
                    {tab.name}
                  </button>
                ))}
              </div>

              <div className="bg-gray-50/50 rounded-[4rem] p-10 md:p-16 border border-gray-100 min-h-[500px] shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-fsm-red/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="relative z-10">
                   {activeTab === "plan" && (
                     <div className="space-y-12">
                        <div className="flex justify-between items-end">
                           <h3 className="text-2xl font-black text-fsm-blue uppercase">Ruta de Formación (2 Semestres)</h3>
                           <Link href="/contacto" className="text-[10px] font-black text-fsm-red tracking-widest uppercase hover:underline">Descargar Brochure</Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                           {[
                             "Inducción educativa", "Primeros auxilios", "Orientación educativa", "Programas académicos",
                             "Prácticas saludables", "Tecnologías TICs", "Educación incluyente", "Práctica 1",
                             "Inglés", "Práctica 2"
                           ].map((item, i) => (
                             <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-100 group">
                               <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[10px] font-black text-fsm-red shadow-sm group-hover:bg-fsm-red group-hover:text-white transition-all">
                                 {String(i + 1).padStart(2, '0')}
                               </div>
                               <span className="text-sm font-bold text-gray-600 uppercase tracking-tighter">{item}</span>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}

                   {activeTab === "admision" && (
                     <div className="space-y-12">
                        <h3 className="text-2xl font-black text-fsm-blue uppercase">Proceso de Ingreso</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           {[
                             { label: "Documento al 150%", icon: "01" },
                             { label: "Certificado EPS/SISBEN", icon: "02" },
                             { label: "Diploma bachiller (min. 9°)", icon: "03" },
                             { label: "2 Fotos 3x4 fondo blanco", icon: "04" },
                             { label: "Mayor de 16 años", icon: "05" }
                           ].map((req, i) => (
                             <div key={i} className="flex items-center gap-6 p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-all">
                               <span className="text-2xl font-black text-fsm-red/20">{req.icon}</span>
                               <span className="text-sm font-black text-fsm-blue leading-tight uppercase tracking-tighter">{req.label}</span>
                             </div>
                           ))}
                        </div>
                        <div className="p-8 bg-fsm-blue text-white rounded-[3rem] shadow-premium items-center flex justify-between">
                           <p className="text-sm leading-relaxed font-bold italic">Matrículas abiertas permanentemente.</p>
                           <Link href="/" className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all"><ChevronRight size={20} /></Link>
                        </div>
                     </div>
                   )}

                   {activeTab === "acreditacion" && (
                      <div className="space-y-12">
                         <h3 className="text-2xl font-black text-fsm-blue uppercase">Excelencia Normativa</h3>
                         <div className="flex flex-col gap-6">
                            <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm flex gap-6">
                               <Award className="text-fsm-red shrink-0" size={32} />
                               <div>
                                  <p className="font-black text-fsm-blue mb-2">RESOLUCIÓN OFICIAL</p>
                                  <p className="text-sm text-gray-500 font-medium">Resolución No. 0883 del 29 de mayo de 2023 - Secretaría de Educación de Soacha.</p>
                               </div>
                            </div>
                            <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm flex gap-6">
                               <ShieldCheck className="text-fsm-red shrink-0" size={32} />
                               <div>
                                  <p className="font-black text-fsm-blue mb-2">CERTIFICACIÓN ESPECÍFICA</p>
                                  <p className="text-sm text-gray-500 font-medium">Programa certificado bajo la Norma Técnica NTC 5581:2011.</p>
                               </div>
                            </div>
                         </div>
                      </div>
                   )}

                   {activeTab === "practicas" && (
                      <div className="space-y-12">
                         <h3 className="text-2xl font-black text-fsm-blue uppercase">Convenios de Práctica</h3>
                         <p className="text-gray-500 font-medium italic">Experiencia real en los mejores centros educativos y jardines infantiles de la zona.</p>
                         <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                              "Jean Fritz Piaget", "Mundo Activo", "Abraham Lincoln", "British School",
                              "Gimnasio Alameda", "Colegio Niño Jesús", "Antonia Santos", "García Márquez",
                              "Eko Garden", "Nueva Generación"
                            ].map((place) => (
                               <div key={place} className="p-6 bg-white rounded-[2rem] border border-gray-100 flex items-center justify-center text-center group hover:bg-fsm-red hover:text-white transition-all duration-500">
                                  <span className="text-[10px] font-black tracking-widest uppercase">{place}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                   )}
                </div>
              </div>
            </div>
          </div>

          {/* Premium Floating Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-8">
              <div className="bg-fsm-blue rounded-[4rem] p-12 text-white shadow-premium relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-fsm-red/40 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
                <h3 className="text-2xl font-black mb-10 text-balance uppercase leading-tight">Impulsa el <br /> mañana hoy</h3>
                
                <div className="space-y-8 mb-12">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center"><Calendar size={20} /></div>
                      <div>
                         <p className="text-[9px] font-black opacity-40 tracking-widest uppercase">Duración</p>
                         <p className="font-black text-sm">2 Semestres</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center"><Baby size={20} /></div>
                      <div>
                         <p className="text-[9px] font-black opacity-40 tracking-widest uppercase">Enfoque</p>
                         <p className="font-black text-sm">Educación Inicial</p>
                      </div>
                   </div>
                </div>

                <Link 
                  href="https://fundacionsanmateo.q10.com/Preinscripcion"
                  target="_blank"
                  className="w-full bg-white text-fsm-blue py-5 rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-fsm-red hover:text-white transition-all flex items-center justify-center gap-3 group shadow-xl"
                >
                  PREINSCRIPCIÓN <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                </Link>
              </div>

              <div className="p-10 bg-gray-50 rounded-[4rem] border border-gray-100">
                 <h4 className="font-black text-fsm-blue mb-6 uppercase text-[10px] tracking-widest">Salida Laboral</h4>
                 <ul className="space-y-4">
                    {[
                      "Asistente Preescolar", "Madre Comunitaria", "Niñera Profesional", "Líder en Jardines"
                    ].map((job) => (
                      <li key={job} className="flex items-center gap-3">
                         <div className="w-1.5 h-1.5 bg-fsm-red rounded-full" />
                         <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">{job}</span>
                      </li>
                    ))}
                 </ul>
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
