"use client";

import React, { useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ShieldCheck, Mail, Info, Gavel, Scale, Lock } from "lucide-react";
import gsap from "gsap";

export default function DataTreatmentPage() {
  const containerRef = useRef<HTMLDivElement>(null);

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
      
      {/* Cinematic Header - Split Screen */}
      <section className="relative min-h-[60vh] flex flex-col lg:flex-row pt-24 overflow-hidden">
        <div className="lg:w-1/2 flex items-center px-8 md:px-20 py-20 bg-white relative z-10">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-12 h-px bg-fsm-red"></span>
              <span className="text-[10px] font-black tracking-[0.4em] text-fsm-red uppercase">Responsabilidad Legal</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-fsm-blue leading-none mb-8">
              PRIVACIDAD Y <br />
              <span className="text-fsm-blue-light uppercase">Datos</span>
            </h1>
            <p className="text-lg text-gray-400 font-medium leading-relaxed">
              Dando cumplimiento a la Ley 1581 de 2012, garantizamos la protección y el tratamiento ético de su información personal.
            </p>
          </div>
        </div>
        <div className="lg:w-1/2 relative min-h-[300px] lg:min-h-full overflow-hidden bg-fsm-blue">
          <Image src="/img/banner19.jpg" alt="Tratamiento de Datos" fill className="object-cover scale-110 brightness-75" priority />
          {/* Gradient removed as per user request */}
          {/* Decorative element */}
          <div className="absolute bottom-12 right-12 z-20 bg-white/10  p-6 rounded-[2.5rem] border border-white/20 shadow-premium">
             <Lock className="text-white opacity-50" size={32} />
          </div>
        </div>
      </section>

      <div ref={containerRef} className="container mx-auto px-8 py-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-300 mb-20">
          <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <Link href="/institucion/normatividad" className="hover:text-fsm-red transition-colors">Normatividad</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-fsm-blue">Tratamiento de Datos</span>
        </div>

        <div className="max-w-5xl mx-auto space-y-24">
          <div className="reveal-item flex flex-col md:flex-row md:items-center justify-between gap-12 mb-16">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-fsm-blue text-white rounded-[2.5rem] flex items-center justify-center shadow-premium">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-fsm-blue uppercase tracking-tighter leading-none">Política <br /> <span className="text-fsm-red">Institucional</span></h2>
              </div>
            </div>
          </div>

          <div className="prose prose-lg max-w-none text-gray-400 font-medium leading-relaxed space-y-12">
            <div className="reveal-item bg-gray-50/50 p-10 md:p-16 rounded-[4rem] border border-gray-100 shadow-sm relative overflow-hidden group">
               <div className="absolute -top-12 -right-12 w-48 h-48 bg-fsm-red/5 rounded-full  group-hover:scale-125 transition-transform duration-1000"></div>
               <p className="m-0 italic text-fsm-blue font-bold text-xl relative z-10">
                La Fundación San Mateo informa que, en cumplimiento de los estándares legales de protección de datos, actúa como Responsable del Tratamiento de su información bajo los siguientes principios:
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {[
                {
                  id: 1,
                  icon: <Gavel size={24} />,
                  text: "La FUNDACION SAN MATEO actuará como Responsable del Tratamiento de datos personales conforme la Constitución y la Ley 1581 de 2012."
                },
                {
                  id: 2,
                  icon: <Scale size={24} />,
                  text: "Finalidad de la recolección: Autorización plena para efectos institucionales, publicitarios y académicos en escenarios que apruebo totalmente."
                },
                {
                  id: 3,
                  icon: <ShieldCheck size={24} />,
                  text: "Es de carácter facultativo responder preguntas sobre Datos Sensibles o referentes a menores de edad."
                },
                {
                  id: 4,
                  icon: <Lock size={24} />,
                  text: "Derechos del Titular: Conocer, actualizar, rectificar y suprimir su información personal en cualquier momento."
                }
              ].map((item) => (
                <div key={item.id} className="reveal-item group flex gap-10 p-10 bg-white rounded-[3rem] border border-gray-50 hover:border-gray-100 hover:shadow-premium transition-all duration-700">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-fsm-red shrink-0 group-hover:bg-fsm-red group-hover:text-white transition-all duration-500">
                    {item.icon}
                  </div>
                  <div className="space-y-4">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Artículo {item.id.toString().padStart(2, '0')}</span>
                    <p className="m-0 text-gray-500 font-bold leading-relaxed">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="reveal-item grid grid-cols-1 md:grid-cols-2 gap-12 pt-12">
               <div className="bg-fsm-blue p-12 rounded-[4rem] text-white shadow-premium relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-fsm-red/40  rounded-full translate-x-1/2 -translate-y-1/2"></div>
                  <Mail className="mb-8 text-fsm-red" size={40} />
                  <h4 className="text-2xl font-black mb-6 uppercase tracking-tighter">Canal de Atención</h4>
                  <p className="text-white/60 font-medium leading-relaxed mb-10 text-sm">
                    Para radicar cualquier tipo de requerimiento relacionado con sus datos personales, escriba a:
                  </p>
                  <a href="mailto:fun.secretaria@gmail.com" className="bg-white text-fsm-blue px-10 py-5 rounded-2xl font-black text-[10px] tracking-widest inline-block hover:bg-fsm-red hover:text-white transition-all shadow-xl uppercase">
                    fun.secretaria@gmail.com
                  </a>
               </div>

               <div className="bg-gray-50 p-12 rounded-[4rem] border border-gray-100 flex flex-col justify-center relative overflow-hidden">
                  <Info className="absolute top-8 right-8 text-fsm-blue/5" size={80} />
                  <div className="flex items-start gap-6 relative z-10">
                    <div>
                      <h4 className="font-black text-fsm-blue uppercase text-sm tracking-widest mb-4">Aviso Legal</h4>
                      <p className="text-sm font-bold text-gray-400 leading-relaxed">
                        La institución se reserva el derecho de modificar su Política de Tratamiento de Datos Personales en cualquier momento. Cualquier cambio será informado oportunamente a través de este canal oficial.
                      </p>
                    </div>
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
