"use client";

import React, { useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Phone, MapPin, Clock, Headphones, ArrowRight, Star } from "lucide-react";
import gsap from "gsap";

export default function DirectoryPage() {
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

  const directory = [
    { title: "Dirección Académica", phone: "318 612 6728", icon: <Star size={20} /> },
    { title: "Área Académica", phone: "318 892 5098 / (601) 817 5456", icon: <Headphones size={20} /> },
    { title: "Área Financiera", phone: "350 296 3826 / (601) 732 1080", icon: <Star size={20} /> },
    { title: "Área de Bienestar", phone: "318 434 9631", icon: <Star size={20} /> },
    { title: "Área de Información", phone: "321 451 0680", icon: <Star size={20} /> },
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
              <span className="text-[10px] font-black tracking-[0.4em] text-fsm-red uppercase">Contacto Administrativo</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-fsm-blue leading-none mb-8">
              PUNTOS DE <br />
              <span className="text-fsm-blue-light uppercase">Contacto</span>
            </h1>
            <p className="text-lg text-gray-400 font-medium leading-relaxed">
              Nuestro equipo administrativo está listo para brindarle la asesoría técnica y humana que requiere en cada etapa de su formación.
            </p>
          </div>
        </div>
        <div className="lg:w-1/2 relative min-h-[300px] lg:min-h-full overflow-hidden bg-fsm-blue">
          <Image src="/img/banner11.jpg" alt="Directorio FSM" fill className="object-cover scale-110 brightness-75" priority />
          {/* Gradient removed as per user request */}
          {/* Floating badge */}
          <div className="absolute bottom-12 right-12 z-20 bg-white/10 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/20 shadow-premium">
             <Headphones size={32} className="text-white opacity-50" />
          </div>
        </div>
      </section>

      <div ref={containerRef} className="container mx-auto px-8 py-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-300 mb-20">
          <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-gray-400">Institución</span>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-fsm-blue">Directorio</span>
        </div>

        <div className="max-w-7xl mx-auto space-y-32">
          {/* Main Directory Table-style Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
             <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="mb-10">
                   <h3 className="text-3xl font-black text-fsm-blue uppercase tracking-tighter leading-none mb-4">Líneas de Atención</h3>
                   <p className="text-gray-400 font-medium">Comuníquese directamente con el área de su interés.</p>
                </div>
                
                {directory.map((item, i) => (
                  <div key={i} className="reveal-item group flex flex-col md:flex-row md:items-center justify-between p-10 bg-gray-50/50 rounded-[3rem] border border-transparent hover:border-gray-100 hover:bg-white hover:shadow-premium transition-all duration-700">
                    <div className="flex items-center gap-6 mb-4 md:mb-0">
                       <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-fsm-red shadow-sm group-hover:bg-fsm-red group-hover:text-white transition-all duration-500">
                          {item.icon}
                       </div>
                       <h4 className="text-xl font-black text-fsm-blue uppercase tracking-tight">{item.title}</h4>
                    </div>
                    <a 
                      href={`tel:${item.phone.split("/")[0].trim()}`} 
                      className="inline-flex items-center gap-4 text-sm font-black text-gray-400 group-hover:text-fsm-red transition-colors"
                    >
                      <Phone size={20} className="text-fsm-red/20 group-hover:text-fsm-red transition-colors" />
                      {item.phone}
                    </a>
                  </div>
                ))}
             </div>

             {/* Location & Correspondence Sidebar */}
             <div className="lg:col-span-4 space-y-10">
                <div className="reveal-item sticky top-32 space-y-10">
                   <div className="bg-fsm-blue rounded-[4rem] p-12 text-white shadow-premium relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-fsm-red/40 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
                      <div className="flex items-center gap-4 mb-10">
                         <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20"><MapPin size={24} /></div>
                         <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">Ubicación y <br /> Correspondencia</h3>
                      </div>
                      
                      <div className="space-y-10">
                         <div>
                            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-4">Sede Administrativa</p>
                            <p className="text-xl font-bold mb-6">Carrera 7 # 18-99, <br /> Soacha Centro</p>
                            <a 
                              href="https://www.google.com/maps?ll=4.583678,-74.214367&z=16&t=m&hl=en&gl=CO&mapclient=embed&cid=2402955356151310862" 
                              target="_blank"
                              className="text-xs font-black text-fsm-red uppercase tracking-widest flex items-center gap-2 hover:text-white transition-colors"
                            >
                              Explorar en Google Maps <ArrowRight size={18} />
                            </a>
                         </div>

                         <div className="pt-10 border-t border-white/10">
                            <div className="flex items-center gap-3 mb-6">
                               <Clock size={20} className="text-fsm-red" />
                               <span className="text-[10px] font-black uppercase tracking-widest">Horario de Atención</span>
                            </div>
                            <div className="space-y-4 text-sm text-white/60 font-medium">
                               <p className="flex justify-between"><span>Lun - Vie:</span> <span className="text-white">8:00am - 5:30pm</span></p>
                               <p className="flex justify-between"><span>Sábados:</span> <span className="text-white">7:30am - 12:00m</span></p>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="p-12 bg-gray-50 rounded-[4rem] text-center border border-gray-100 shadow-sm overflow-hidden relative group">
                      {/* Gradient removed as per user request */}
                      <div className="relative z-10">
                         <p className="text-fsm-red font-black text-xs tracking-widest uppercase mb-4">Atención Virtual</p>
                         <p className="text-sm text-gray-400 font-bold mb-8">Nuestros asesores también están disponibles vía WhatsApp para trámites rápidos.</p>
                         <Link 
                           href="/contacto"
                           className="text-[10px] font-black text-fsm-blue hover:text-fsm-red transition-colors flex items-center justify-center gap-2"
                         >
                           TODOS LOS CANALES <ArrowRight size={16} />
                         </Link>
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
