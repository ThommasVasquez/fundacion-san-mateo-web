"use client";

import React, { useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, FileText, Download, Shield, Scale, ArrowRight, Gavel, FileSignature, BookOpen } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function NormativityPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray(".reveal-item").forEach((el: any) => {
        gsap.from(el, {
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
          },
          y: 30,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out"
        });
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const documents = [
    {
      category: "Aprobación oficial Secretaría de Educación de Soacha",
      icon: <FileText className="text-fsm-blue" size={24} />,
      links: [
        { name: "Personería Jurídica - Resolución No. 14 del 23 de mayo de 2001", href: "/docs/PersoneriaJuridica.pdf" },
      ],
    },
    {
      category: "Aprobación Programa Auxiliar de Enfermería",
      icon: <Shield className="text-fsm-red" size={24} />,
      links: [
        { name: "Resolución No. 1066 del 1 de junio de 2022", href: "/docs/Resolucion1066-2.pdf" },
        { name: "Resolución No. 2074 del 21 de septiembre de 2010", href: "/docs/Resolucion2074.pdf" },
        { name: "Resolución No. 513 del 5 de junio de 2009", href: "/docs/Resolucion513-2.pdf" },
      ],
    },
    {
      category: "Aprobación Programa Primera Infancia",
      icon: <Scale className="text-fsm-blue" size={24} />,
      links: [
        { name: "Resolución No. 0883 del 29 de mayo de 2023", href: "/docs/Resolucion0883-2.pdf" },
      ],
    },
    {
      category: "Documentos Institucionales",
      icon: <Gavel className="text-gray-700" size={24} />,
      links: [
        { name: "Manual de Convivencia", href: "/docs/ManualDeConvivencia.pdf" },
        { name: "Política de Tratamiento de Datos Personales", href: "/tratamiento-datos" },
        { name: "Proyecto Educativo Institucional (PEI)", href: "#" },
        { name: "Reglamento Estudiantil", href: "#" },
        { name: "Reglamento Docente", href: "#" },
      ],
    },
    {
      category: "Aprobación Programa Servicios Farmacéuticos",
      icon: <FileSignature className="text-fsm-red" size={24} />,
      links: [
        { name: "Resolución pendiente de cargar", href: "#" },
      ],
    },
    {
      category: "Aprobación Programa Asistencia Administrativa",
      icon: <BookOpen className="text-fsm-blue" size={24} />,
      links: [
        { name: "Resolución pendiente de cargar", href: "#" },
      ],
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
              <span className="text-[10px] font-black tracking-[0.4em] text-fsm-red uppercase">Marco Legal</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-fsm-blue leading-none mb-8">
              TRANSPARENCIA <br />
              <span className="text-fsm-blue-light">NORMATIVA</span>
            </h1>
            <p className="text-lg text-gray-700 font-medium leading-relaxed">
              Consulte nuestra base documental, resoluciones de aprobación y manuales institucionales que garantizan nuestra excelencia académica.
            </p>
          </div>
        </div>
        <div className="lg:w-1/2 relative min-h-[300px] lg:min-h-full overflow-hidden bg-fsm-blue">
          <Image src="/img/banner12.jpg" alt="Normatividad" fill className="object-cover scale-110 brightness-75" priority />
        </div>
      </section>

      <div ref={containerRef} className="container mx-auto px-8 py-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-800 mb-20">
          <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-gray-700">Institución</span>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-fsm-blue">Normatividad</span>
        </div>

        <div className="max-w-5xl mx-auto space-y-16">
          {documents.map((group, i) => (
            <div key={i} className="reveal-item group">
              <div className="flex items-center gap-6 mb-10">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 group-hover:bg-fsm-red group-hover:text-white transition-all duration-500">
                  {group.icon}
                </div>
                <div>
                   <h3 className="text-xl md:text-2xl font-black text-fsm-blue leading-tight uppercase tracking-tighter">{group.category}</h3>
                   <div className="w-12 h-0.5 bg-fsm-red mt-2 opacity-30 group-hover:w-full transition-all duration-700"></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6 lg:ml-20">
                {group.links.map((link) => (
                  <a 
                    key={link.name} 
                    href={link.href} 
                    target={link.href.endsWith(".pdf") ? "_blank" : "_self"}
                    className="group/link flex items-center justify-between p-8 bg-gray-50/50 rounded-[2.5rem] border border-transparent hover:bg-white hover:border-gray-100 hover:shadow-premium transition-all duration-500"
                  >
                    <div className="flex items-center gap-6">
                       <FileText size={20} className="text-fsm-red opacity-40 group-hover/link:opacity-100 transition-opacity" />
                       <span className="text-sm md:text-base font-black text-fsm-blue/60 group-hover/link:text-fsm-blue transition-colors uppercase tracking-tight leading-none">
                         {link.name}
                       </span>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="text-[9px] font-black tracking-widest text-fsm-red opacity-0 group-hover/link:opacity-100 transition-all uppercase">Descargar</span>
                       <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-fsm-red group-hover/link:bg-fsm-red group-hover/link:text-white transition-all duration-500">
                          <Download size={18} />
                       </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-20">
             <div className="p-12 md:p-16 bg-fsm-blue rounded-[4rem] text-center relative overflow-hidden group shadow-premium">
                <div className="absolute top-0 right-0 w-64 h-64 bg-fsm-red/40  rounded-full translate-x-1/2 -translate-y-1/2 z-0"></div>
                <div className="relative z-10 max-w-2xl mx-auto space-y-8">
                   <h4 className="text-3xl font-black text-white uppercase tracking-tighter">¿Requiere Consultar <br /> Más Información?</h4>
                   <p className="text-white/60 text-lg font-medium leading-relaxed">
                     Nuestro archivo institucional está disponible para consulta en la sede administrativa para toda la comunidad académica.
                   </p>
                   <Link 
                    href="https://api.whatsapp.com/send?phone=573184349631&text=Hola, quisiera obtener información sobre los programas académicos."
                    target="_blank"
                    className="inline-flex items-center gap-4 bg-white text-fsm-blue px-10 py-5 rounded-full font-black text-xs tracking-widest uppercase hover:bg-fsm-red hover:text-white transition-all duration-500 shadow-xl"
                   >
                     HABLAR CON SECRETARÍA <ArrowRight size={18} />
                   </Link>
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
