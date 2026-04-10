"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GraduationCap, Users, BookOpen, Award } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const BentoPrograms = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".bento-item", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        },
        y: 60,
        opacity: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: "power4.out",
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="py-32 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex flex-col lg:flex-row justify-between items-end mb-20 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-sm font-black text-fsm-red tracking-[0.4em] uppercase mb-6 flex items-center gap-4">
              <span className="w-12 h-px bg-fsm-red"></span>
              Oferta Programática
            </h2>
            <h3 className="text-5xl md:text-6xl font-black text-fsm-blue leading-tight uppercase font-display">
              Elige tu camino hacia la <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fsm-red to-fsm-red-deep">Excelencia</span>
            </h3>
          </div>
          <Link 
            href="/oferta-academica"
            className="group flex items-center gap-3 font-black text-xs tracking-widest text-fsm-blue hover:text-fsm-red transition-colors mb-4"
          >
            VER TODA LA OFERTA <ArrowRight size={20} className="transition-transform group-hover:translate-x-2" />
          </Link>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-full min-h-[800px]">
          {/* Main Program: Nursing (Large Vertical) */}
          <Link 
            href="/programa-enfermeria"
            className="bento-item md:col-span-8 lg:col-span-5 relative group rounded-[4rem] overflow-hidden shadow-premium h-[500px] lg:h-auto"
          >
            <Image 
              src="/img/image18.jpg" 
              alt="Auxiliar de Enfermería" 
              fill 
              className="object-cover transition-transform duration-1000 group-hover:scale-110 brightness-75 group-hover:brightness-50"
            />
            <div className="absolute inset-0 p-12 flex flex-col justify-end text-white z-10 bg-gradient-to-t from-fsm-blue/80 to-transparent">
              <div className="mb-6 w-16 h-16 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/30 transform group-hover:rotate-12 transition-transform duration-500">
                <GraduationCap size={32} />
              </div>
              <p className="text-xs font-black tracking-widest mb-4 uppercase opacity-70">Técnico Laboral por Competencias</p>
              <h4 className="text-3xl md:text-4xl font-black mb-6 leading-tight">AUXILIAR DE <br /> ENFERMERÍA</h4>
              <button className="flex items-center gap-2 font-black text-[10px] tracking-widest bg-white text-fsm-blue px-8 py-4 rounded-2xl w-fit group-hover:bg-fsm-red group-hover:text-white transition-all duration-300">
                EXPLORAR PROGRAMA <ArrowRight size={14} />
              </button>
            </div>
          </Link>

          {/* Feature Program: Early Childhood (Large Horizontal) */}
          <div className="md:col-span-12 lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
            <Link 
              href="/programa-primera-infancia"
              className="bento-item md:col-span-2 relative group rounded-[4rem] overflow-hidden shadow-premium h-[450px]"
            >
              <Image 
                src="/img/image27.jpg" 
                alt="Primera Infancia" 
                fill 
                className="object-cover transition-transform duration-1000 group-hover:scale-110 brightness-75 group-hover:brightness-50"
              />
              <div className="absolute inset-0 p-12 flex flex-col justify-end text-white z-10 bg-gradient-to-t from-fsm-red/80 to-transparent">
                <div className="mb-6 w-16 h-16 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/30 transform group-hover:-rotate-12 transition-transform duration-500">
                  <Users size={32} />
                </div>
                <p className="text-xs font-black tracking-widest mb-4 uppercase opacity-70">Técnico Laboral por Competencias</p>
                <h4 className="text-3xl md:text-4xl font-black mb-6 leading-tight">ATENCIÓN INTEGRAL A <br /> LA PRIMERA INFANCIA</h4>
                <button className="flex items-center gap-2 font-black text-[10px] tracking-widest bg-fsm-blue text-white px-8 py-4 rounded-2xl w-fit group-hover:bg-white group-hover:text-fsm-blue transition-all duration-300">
                  EXPLORAR PROGRAMA <ArrowRight size={14} />
                </button>
              </div>
            </Link>

            {/* Sub-card: Continuing Education */}
            <Link 
              href="/oferta-academica#cursos"
              className="bento-item relative group rounded-[4rem] overflow-hidden shadow-premium h-[320px] bg-fsm-blue flex flex-col p-10 justify-between text-white"
            >
              <div className="relative z-10">
                <BookOpen size={40} className="text-fsm-red mb-6" />
                <h4 className="text-2xl font-black mb-2 uppercase">Educación Continua</h4>
                <p className="text-white/60 text-sm font-medium">Cursos y diplomados especializados para el sector salud.</p>
              </div>
              <div className="flex items-center gap-2 font-black text-[10px] tracking-widest uppercase relative z-10 group-hover:text-fsm-red transition-colors">
                Ver 7 cursos <ArrowRight size={14} />
              </div>
              {/* Decorative background element */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full transform group-hover:scale-150 transition-transform duration-700"></div>
            </Link>

            {/* Sub-card: Why Us Feature */}
            <div 
              className="bento-item relative group rounded-[4rem] overflow-hidden shadow-premium h-[320px] bg-gray-50 flex flex-col p-10 justify-between border border-gray-100"
            >
              <div>
                <Award size={40} className="text-fsm-blue mb-6" />
                <h4 className="text-2xl font-black text-fsm-blue mb-2 uppercase">Calidad ISO</h4>
                <p className="text-gray-500 text-sm font-medium">Contamos con cuatro normas técnicas de calidad vigentes.</p>
              </div>
              <div className="w-12 h-1 bg-fsm-red rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Floating Tag */}
        <div className="mt-20 flex justify-center">
          <div className="bg-fsm-red/5 p-8 rounded-[3rem] border border-fsm-red/10 flex flex-col md:flex-row items-center gap-8 justify-between w-full max-w-4xl shadow-sm">
            <p className="text-fsm-red font-black text-xl italic uppercase tracking-tighter text-center md:text-left">
              ¡Matricúlate hoy y obtén tu <span className="underline decoration-wavy">Uniforme Gratis</span>!
            </p>
            <Link 
              href="https://fundacionsanmateo.q10.com/Preinscripcion"
              target="_blank"
              className="bg-fsm-red text-white px-8 py-4 rounded-2xl font-black text-xs tracking-widest hover:bg-fsm-blue transition-all"
            >
              INSCRIBIRSE AHORA
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BentoPrograms;
