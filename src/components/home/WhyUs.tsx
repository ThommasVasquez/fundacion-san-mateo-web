"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { Award, Target, BookOpen, ShieldCheck } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const WhyUs = ({ content = {} }: { content?: Record<string, string> }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Parallax effect on background
      gsap.to(bgRef.current, {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
        yPercent: 20,
        ease: "none",
      });

      // Reveal content
      gsap.from(contentRef.current, {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 85%",
          once: true,
        },
        y: 50,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center justify-center overflow-hidden py-32 bg-[#1A3B80]">
      {/* Background with Parallax */}
      <div ref={bgRef} className="absolute inset-0 -z-10 bg-[#1A3B80] scale-110">
        <Image 
          src="/img/image19.jpg" 
          alt="Trayectoria FSM" 
          fill 
          className="object-cover opacity-30 brightness-[0.3]"
        />
        {/* Gradient removed as per user request */}
      </div>

      <div className="container mx-auto px-8 relative z-10">
        <div ref={contentRef} className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-sm font-black text-white tracking-[0.5em] uppercase mb-8">
               {content['home_why_subtitle'] || 'Nuestra Identidad'}
            </h2>
            <h3 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-none uppercase mb-12" dangerouslySetInnerHTML={{ __html: content['home_why_title'] || 'VALORES QUE <br /><span class="text-fsm-red">TRANSFORMAN</span>' }}>
            </h3>
            <div className="w-24 h-1.5 bg-fsm-red mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-12">
              <p className="text-xl text-white/70 leading-relaxed font-light italic">
                {content['home_why_quote'] || '"Formamos con vocación y excelencia técnica, integrando principios éticos y humanistas en cada paso de nuestro proceso educativo."'}
              </p>
              
              <div className="flex flex-col gap-8">
                <div className="flex items-center gap-4 group">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-all">
                    <ShieldCheck className="text-white" size={32} />
                  </div>
                  <div>
                    <p className="text-white font-black text-lg">LEGALIDAD</p>
                    <p className="text-white/40 text-xs tracking-widest uppercase">Aprobados por Ley</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-all">
                    <Award className="text-white" size={32} />
                  </div>
                  <div>
                    <p className="text-white font-black text-lg">CALIDAD</p>
                    <p className="text-white/40 text-xs tracking-widest uppercase">Certificación ISO</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-premium">
              <div className="space-y-10">
                {[
                  { icon: <Target size={24} />, title: "Propósito Claro", desc: "Nuestra misión es la superación constante de cada estudiante." },
                  { icon: <BookOpen size={24} />, title: "Metodología", desc: "Aprendizaje teórico-práctico en escenarios reales de salud." },
                  { icon: <Award size={24} />, title: "Reconocimiento", desc: `Más de ${new Date().getFullYear() - 2000} años siendo la institución de referencia en Soacha.` },
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="text-fsm-red transition-transform group-hover:scale-110 duration-500">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-black text-fsm-blue text-xl mb-2 tracking-tight uppercase">{item.title}</h4>
                      <p className="text-gray-900 text-sm leading-relaxed font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Blur Elements */}
      {/* Blurs removed */}
    </section>
  );
};

export default WhyUs;
