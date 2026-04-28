"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GraduationCap, Users } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const programs = [
  {
    title: "AUXILIAR DE ENFERMERÍA",
    subtitle: "Técnico Laboral por Competencias",
    image: "/img/image18.jpg",
    href: "/programa-enfermeria",
    color: "bg-fsm-red",
    icon: <GraduationCap className="text-white" size={32} />,
  },
  {
    title: "ATENCIÓN INTEGRAL A LA PRIMERA INFANCIA",
    subtitle: "Técnico Laboral por Competencias",
    image: "/img/image27.jpg",
    href: "/programa-primera-infancia",
    color: "bg-fsm-blue",
    icon: <Users className="text-white" size={32} />,
  },
];

const ProgramsPreview = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".section-title", {
        scrollTrigger: {
          trigger: ".section-title",
          start: "top 80%",
        },
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      });

      cardsRef.current.forEach((card, index) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
          },
          y: 50,
          opacity: 0,
          duration: 1,
          delay: index * 0.2,
          ease: "back.out(1.7)",
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 section-title">
          <h2 className="text-sm font-black text-fsm-red tracking-[0.3em] uppercase mb-4">
            Oferta Académica
          </h2>
          <h3 className="text-4xl md:text-5xl font-black text-fsm-blue">
            CONOCE NUESTROS PROGRAMAS
          </h3>
          <div className="w-24 h-1.5 bg-fsm-red mx-auto mt-6 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {programs.map((program, index) => (
            <div
              key={program.title}
              ref={(el) => { cardsRef.current[index] = el; }}
              className="group relative h-[400px] rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:-translate-y-2"
            >
              {/* Background Image */}
              <Image
                src={program.image}
                alt={program.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Overlay */}
              <div className={`absolute inset-0 ${program.color}/80 mix-blend-multiply opacity-60 group-hover:opacity-80 transition-opacity duration-500`}></div>
              
              {/* Content */}
              <div className="absolute inset-0 p-8 flex flex-col justify-end text-white z-10">
                <div className="mb-4 bg-white/20  w-fit p-3 rounded-2xl border border-white/30">
                  {program.icon}
                </div>
                <span className="text-xs font-bold tracking-widest uppercase opacity-80 mb-2">
                  {program.subtitle}
                </span>
                <h4 className="text-2xl md:text-3xl font-black mb-6 leading-tight">
                  {program.title}
                </h4>
                
                <Link 
                  href={program.href}
                  className="flex items-center gap-2 font-bold text-sm bg-white text-fsm-blue px-6 py-3 rounded-xl w-fit hover:bg-fsm-red hover:text-white transition-all duration-300"
                >
                  SABER MÁS <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link 
            href="/oferta-academica"
            className="inline-flex items-center gap-2 font-black text-fsm-blue hover:text-fsm-red transition-colors group"
          >
            Ver toda la oferta académica 
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-2" />
          </Link>
          
          <div className="mt-12 p-6 bg-fsm-red/5 border border-fsm-red/10 rounded-2xl inline-block">
            <p className="text-fsm-red font-black text-xl">
              ¡Matricúlate ya, y obtendrás UNIFORME GRATIS!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProgramsPreview;
