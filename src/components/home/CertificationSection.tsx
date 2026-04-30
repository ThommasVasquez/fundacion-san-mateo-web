"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronRight, Award, ShieldCheck, CheckCircle2 } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const CertificationSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".cert-badge", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
        scale: 0.8,
        opacity: 0,
        duration: 1,
        stagger: 0.1,
        ease: "back.out(1.7)",
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 bg-gray-50/50 border-y border-gray-100 relative overflow-hidden">
      <div className="container mx-auto px-8">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="text-sm font-black text-fsm-red tracking-[0.4em] uppercase mb-6 flex items-center gap-4">
              <span className="w-12 h-px bg-fsm-red"></span>
              Calidad & Legalidad
            </h2>
            <h3 className="text-4xl md:text-5xl font-black text-fsm-blue mb-8 leading-tight uppercase">
              RECONOCIMIENTO <br /> INSTITUCIONAL
            </h3>
            <p className="text-lg text-gray-500 mb-10 leading-relaxed font-medium">
              Operamos bajo la aprobación oficial de la Secretaría de Educación de Soacha y contamos con certificaciones internacionales que avalan nuestros procesos pedagógicos.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <a 
                href="/institucion/normatividad"
                className="group flex items-center gap-3 bg-fsm-blue text-white px-8 py-4 rounded-full font-black text-xs tracking-widest hover:bg-fsm-red transition-all duration-500"
              >
                VER RESOLUCIONES <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <div className="flex items-center gap-3 px-6 py-4 bg-white rounded-full border border-gray-100 shadow-sm">
                <ShieldCheck size={20} className="text-fsm-red" />
                <span className="text-[10px] font-black tracking-widest text-fsm-blue uppercase">Vigilado por Secretaría de Educación</span>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 grid grid-cols-2 lg:grid-cols-4 gap-6">
             {[
               { img: "/img/icon-certif.png", name: "ISO 9001" },
               { img: "/img/footerlog1.png", name: "NTC 5555" },
               { img: "/img/footerlog2.png", name: "SGS" },
               { img: "/img/footerlog3.png", name: "IQNET" }
             ].map((cert, i) => (
                <div 
                  key={i} 
                  className="cert-badge aspect-square bg-white rounded-[2.5rem] p-6 flex items-center justify-center shadow-premium hover:-translate-y-2 transition-transform duration-500 border border-gray-50"
                >
                  <div className="relative w-full h-full opacity-60 hover:opacity-100 transition-opacity">
                    <Image 
                      src={cert.img} 
                      alt={cert.name} 
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
  );
};

export default CertificationSection;
