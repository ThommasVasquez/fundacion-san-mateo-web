"use client";

import React, { useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Award, ShieldCheck, TrendingUp, Search, CheckCircle2, Star } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function WhyUsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".reveal-item", {
        scrollTrigger: {
          trigger: ".reveal-item",
          start: "top 85%",
        },
        y: 40,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out",
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const qualityObjectives = [
    {
      title: "Direccionamiento Estratégico",
      desc: "Definir e implementar un plan estratégico por medio de un modelo de gestión que permita el mejoramiento continuo.",
    },
    {
      title: "Diversificación de la Oferta",
      desc: "Diversificar la oferta de formación laboral en coherencia con las necesidades del sector productivo y el mercado.",
    },
    {
      title: "Estandarización de Recursos",
      desc: "Estandarizar la gestión de recursos humanos, físicos y tecnológicos para garantizar la calidad del servicio.",
    },
  ];

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      
      {/* Cinematic Header - Split Screen */}
      <section className="relative min-h-[60vh] flex flex-col lg:flex-row pt-24 overflow-hidden">
        <div className="lg:w-1/2 flex items-center px-8 md:px-20 py-20 bg-white relative z-10">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-12 h-px bg-fsm-red"></span>
              <span className="text-[10px] font-black tracking-[0.4em] text-fsm-red uppercase">Valor Diferencial</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-fsm-blue leading-none mb-8">
              ¿POR QUÉ <br />
              <span className="text-fsm-red">ELEGIRNOS</span>?
            </h1>
            <p className="text-lg text-gray-400 font-medium leading-relaxed">
              Formación integral con altos niveles de exigencia, competitividad y calidad certificada bajo estándares internacionales.
            </p>
          </div>
        </div>
        <div className="lg:w-1/2 relative min-h-[300px] lg:min-h-full overflow-hidden">
          <Image src="/img/banner4.jpg" alt="¿Por qué nosotros?" fill className="object-cover scale-110" priority />
        </div>
      </section>

      <div ref={containerRef} className="container mx-auto px-8 py-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-300 mb-24">
          <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-gray-400">Institución</span>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-fsm-blue">¿Por qué nosotros?</span>
        </div>

        <div className="max-w-7xl mx-auto space-y-40">
          {/* Quality Policy - Narrative Block */}
          <section className="reveal-item flex flex-col lg:flex-row gap-20 items-center">
            <div className="lg:w-1/2 space-y-10">
               <div className="flex items-center gap-4 text-fsm-red">
                 <ShieldCheck size={40} className="text-fsm-red" />
                 <h2 className="text-4xl font-black text-fsm-blue uppercase tracking-tighter">Política de Calidad</h2>
               </div>
               <div className="space-y-8 text-xl text-gray-400 font-medium leading-relaxed">
                 <p>
                   En la <strong>FUNDACIÓN SAN MATEO</strong> brindamos un servicio de educación para el trabajo y el desarrollo humano comprometido con la mejora continua.
                 </p>
                 <p>
                   Nuestra política se centra en direccionar estratégicamente la organización, diversificar la oferta según las necesidades del sector productivo y estandarizar la gestión de nuestros recursos para garantizar el éxito de cada estudiante.
                 </p>
                 <div className="flex items-center gap-5 p-10 bg-gray-50 rounded-[3rem] border border-gray-100 group">
                    <TrendingUp className="text-fsm-red transition-transform group-hover:translate-x-2" size={32} />
                    <p className="text-base text-fsm-blue font-bold italic">Mejoramiento continuo en todos los niveles institucionales.</p>
                 </div>
               </div>
            </div>
            <div className="lg:w-1/2 relative">
               <div className="relative h-[500px] w-full rounded-[4rem] overflow-hidden shadow-premium z-10 border border-gray-100">
                  <Image src="/img/image24.jpg" alt="Calidad FSM" fill className="object-cover transition-transform duration-1000 group-hover:scale-110" />
               </div>
               {/* Blur removed */}
            </div>
          </section>

          {/* Quality Objectives - Cinematic Grid */}
          <section className="reveal-item">
            <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
              <div className="max-w-2xl">
                <h2 className="text-sm font-black text-fsm-red tracking-[0.4em] uppercase mb-6 flex items-center gap-4">
                  <span className="w-12 h-px bg-fsm-red"></span>
                  Compromiso
                </h2>
                <h3 className="text-5xl md:text-6xl font-black text-fsm-blue leading-tight uppercase">
                  Objetivos de <br />
                  <span className="text-fsm-blue-light">Nuestra Gestión</span>
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {qualityObjectives.map((obj, i) => (
                <div key={i} className="group bg-white p-12 rounded-[4rem] border border-gray-100 shadow-premium hover:-translate-y-4 transition-all duration-700 h-full flex flex-col justify-between">
                  <div>
                    <div className="bg-fsm-red/5 p-6 rounded-3xl w-fit mb-10 group-hover:bg-fsm-red group-hover:text-white transition-all duration-500">
                      <Award size={40} className="text-fsm-red group-hover:text-white" />
                    </div>
                    <h4 className="text-2xl font-black text-fsm-blue mb-6 leading-tight uppercase tracking-tighter">{obj.title}</h4>
                    <p className="text-gray-400 font-medium text-lg leading-relaxed">{obj.desc}</p>
                  </div>
                  <div className="mt-12 flex items-center gap-3">
                    <CheckCircle2 size={24} className="text-fsm-red/20 group-hover:text-fsm-red transition-colors" />
                    <span className="text-[10px] font-black tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">Acreditado</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Normatividad Call-to-Action */}
          <div className="reveal-item bg-fsm-blue rounded-[5rem] p-16 md:p-24 text-white relative overflow-hidden shadow-premium">
             {/* Blur removed */}
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="max-w-xl text-center md:text-left">
                  <h4 className="text-4xl font-black mb-6 uppercase tracking-tighter">Transparencia y Legalidad</h4>
                  <p className="text-xl text-white/60 font-medium">Contamos con todas las resoluciones oficiales y certificaciones técnicas necesarias para garantizar tu titulación.</p>
                </div>
                <Link 
                  href="/institucion/normatividad"
                  className="group bg-white text-fsm-blue px-12 py-6 rounded-full font-black text-xs tracking-widest uppercase flex items-center gap-4 hover:bg-fsm-red hover:text-white transition-all duration-500 shadow-xl"
                >
                  VER NORMATIVIDAD <Search size={20} className="group-hover:rotate-12 transition-transform" />
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
