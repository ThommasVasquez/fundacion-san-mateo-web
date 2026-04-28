"use client";

import React, { useState, useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Plus, Minus, HelpCircle, ArrowRight, ShieldCheck, Headphones } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import gsap from "gsap";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const faqs = [
  {
    category: "Institucional",
    items: [
      {
        question: "¿Qué clase de educación brinda la FUNDACIÓN SAN MATEO?",
        answer: "La FUNDACIÓN SAN MATEO es una Institución de Educación para el Trabajo y el Desarrollo Humano que forma integralmente a sus estudiantes, mediante la oferta de programas Técnico Laborales por competencias con alto nivel de exigencia y competitividad."
      },
      {
        question: "¿Cuántos años lleva la FUNDACIÓN SAN MATEO en el mercado?",
        answer: "La FUNDACIÓN SAN MATEO fue fundada en noviembre del año 2000 como respuesta a las necesidades educativas del municipio de Soacha, contando con más de 24 años de trayectoria ininterrumpida."
      }
    ]
  },
  {
    category: "Académico",
    items: [
      {
        question: "¿Puedo estudiar un programa técnico sin haber terminado mi bachillerato?",
        answer: "Sí se puede, siempre y cuando cumplas con los requisitos de cada programa técnico laboral. Usualmente se requiere haber aprobado mínimo el 9° grado."
      },
      {
        question: "¿Tienen convenios de prácticas o me toca conseguirlas?",
        answer: "La FUNDACIÓN SAN MATEO cuenta con más de 15 convenios activos en clínicas, hospitales y centros educativos de primer nivel para que realices tus prácticas profesionales en entornos reales."
      },
      {
        question: "¿Qué duración tienen los programas técnicos?",
        answer: "Auxiliar en Enfermería dura tres semestres (un año y medio). Atención Integral a la Primera Infancia dura dos semestres (un año)."
      }
    ]
  },
  {
    category: "Legal y Financiero",
    items: [
      {
        question: "¿La FUNDACIÓN SAN MATEO es una institución legal?",
        answer: "Contamos con aprobación oficial por parte de la Secretaría de Educación de Soacha (Resolución No. 513 del 5 de junio de 2009). Todos nuestros programas están registrados en el SIET y acreditados en calidad ISO 9001:2015."
      },
      {
        question: "¿Qué formas de pago tienen?",
        answer: "Ofrecemos financiación directa a cuotas sin ningún tipo de interés, sin entidades financieras externas ni procesos burocráticos complejos."
      }
    ]
  }
];

export default function FAQPage() {
  const [openItem, setOpenItem] = useState<{catId: number, itemId: number} | null>({catId: 0, itemId: 0});
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

  const toggleFAQ = (catId: number, itemId: number) => {
    if (openItem?.catId === catId && openItem?.itemId === itemId) {
      setOpenItem(null);
    } else {
      setOpenItem({catId, itemId});
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      
      {/* Cinematic Header - Split Screen */}
      <section className="relative min-h-[60vh] flex flex-col lg:flex-row pt-24 overflow-hidden">
        <div className="lg:w-1/2 flex items-center px-8 md:px-20 py-20 bg-white relative z-10">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-12 h-px bg-fsm-red"></span>
              <span className="text-[10px] font-black tracking-[0.4em] text-fsm-red uppercase">Centro de Ayuda</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-fsm-blue leading-none mb-8">
              PREGUNTAS <br />
              <span className="text-fsm-blue-light uppercase">Frecuentes</span>
            </h1>
            <p className="text-lg text-gray-400 font-medium leading-relaxed">
              Resuelva sus dudas sobre nuestros programas, procesos de matrícula, requisitos legales y formas de financiación en un solo lugar.
            </p>
          </div>
        </div>
        <div className="lg:w-1/2 relative min-h-[300px] lg:min-h-full overflow-hidden bg-fsm-blue">
          <Image src="/img/banner15.jpg" alt="FAQ FSM" fill className="object-cover scale-110 brightness-75" priority />
          {/* Gradient removed as per user request */}
          {/* Decorative element */}
          <div className="absolute bottom-12 right-12 z-20 bg-white/10  p-6 rounded-[2.5rem] border border-white/20 shadow-premium">
             <HelpCircle className="text-white opacity-50" size={32} />
          </div>
        </div>
      </section>

      <div ref={containerRef} className="container mx-auto px-8 py-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-300 mb-20">
          <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-fsm-blue">Preguntas frecuentes</span>
        </div>

        <div className="max-w-4xl mx-auto space-y-24">
          {faqs.map((category, catIndex) => (
            <div key={catIndex} className="reveal-item">
              <div className="flex items-center gap-6 mb-12">
                 <div className="w-1.5 h-16 bg-fsm-red rounded-full"></div>
                 <h2 className="text-2xl font-black text-fsm-blue uppercase tracking-tighter">{category.category}</h2>
              </div>
              
              <div className="space-y-6">
                {category.items.map((faq, itemIndex) => {
                  const isOpen = openItem?.catId === catIndex && openItem?.itemId === itemIndex;
                  return (
                    <div 
                      key={itemIndex} 
                      className={cn(
                        "group bg-gray-50/50 rounded-[3rem] overflow-hidden transition-all duration-700 border border-transparent",
                        isOpen ? "bg-white border-gray-100 shadow-premium -translate-y-2" : "hover:bg-gray-50"
                      )}
                    >
                      <button
                        onClick={() => toggleFAQ(catIndex, itemIndex)}
                        className="w-full flex items-center justify-between p-10 text-left transition-all duration-500"
                      >
                        <span className={cn(
                          "text-xl font-black transition-colors uppercase tracking-tight leading-tight",
                          isOpen ? "text-fsm-red" : "text-fsm-blue group-hover:text-fsm-red"
                        )}>
                          {faq.question}
                        </span>
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                          isOpen ? "bg-fsm-red text-white rotate-180" : "bg-white text-gray-400 border border-gray-100 group-hover:bg-fsm-red group-hover:text-white"
                        )}>
                          {isOpen ? <Minus size={20} /> : <Plus size={20} />}
                        </div>
                      </button>
                      
                      <div className={cn(
                        "px-10 overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]",
                        isOpen ? "max-h-[500px] pb-10" : "max-h-0"
                      )}>
                        <p className="text-gray-400 text-lg leading-relaxed font-medium pl-6 border-l-2 border-fsm-red/20 text-balance">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Premium Bottom Sidebar Call-out */}
          <div className="reveal-item grid grid-cols-1 md:grid-cols-2 gap-10 pt-20">
             <div className="bg-fsm-blue rounded-[4rem] p-12 text-white shadow-premium relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-fsm-red/40  rounded-full translate-x-1/2 -translate-y-1/2"></div>
                <div className="flex items-center gap-4 mb-8">
                   <ShieldCheck size={28} className="text-fsm-red" />
                   <h4 className="text-2xl font-black uppercase tracking-tighter">Legalidad 100%</h4>
                </div>
                <p className="text-white/60 font-medium mb-10 leading-relaxed italic">
                  Todos nuestros títulos cuentan con validez nacional y registro oficial ante las entidades regulatorias.
                </p>
                <Link href="/institucion/normatividad" className="text-[10px] font-black tracking-widest uppercase hover:text-fsm-red transition-colors flex items-center gap-3">
                   Ver resoluciones <ArrowRight size={16} />
                </Link>
             </div>

             <div className="bg-gray-50 rounded-[4rem] p-12 text-center border border-gray-100 flex flex-col items-center justify-center space-y-8">
                <Headphones className="text-fsm-red" size={32} />
                <div className="space-y-4">
                   <h4 className="text-2xl font-black text-fsm-blue uppercase tracking-tighter">¿Aún con dudas?</h4>
                   <p className="text-sm text-gray-400 font-bold max-w-xs mx-auto">Nuestro equipo de admisiones está listo para asesorarte de manera personalizada.</p>
                </div>
                <Link 
                  href="/contacto"
                  className="bg-fsm-blue text-white px-10 py-5 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-fsm-red transition-colors shadow-xl"
                >
                  Contactar Asesor
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
