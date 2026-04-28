"use client";

import React, { useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Send, Phone, Home, Mail, ArrowRight, MessageSquare, Headphones } from "lucide-react";
import gsap from "gsap";

export default function ContactPage() {
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
              <span className="text-[10px] font-black tracking-[0.4em] text-fsm-red uppercase">Atención Directa</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-fsm-blue leading-none mb-8">
              ESTAMOS <br />
              <span className="text-fsm-blue-light uppercase">Contigo</span>
            </h1>
            <p className="text-lg text-gray-400 font-medium leading-relaxed">
              Resuelva sus dudas de manera personalizada. Nuestro equipo está listo para asesorarle en su camino hacia la excelencia técnica.
            </p>
          </div>
        </div>
        <div className="lg:w-1/2 relative min-h-[300px] lg:min-h-full overflow-hidden bg-fsm-blue">
          <Image src="/img/banner16.jpg" alt="Contacto FSM" fill className="object-cover scale-110 brightness-75" priority />
          {/* Gradient removed as per user request */}
          {/* Decorative element */}
          <div className="absolute bottom-12 right-12 z-20 bg-white/10  p-6 rounded-[2.5rem] border border-white/20 shadow-premium">
             <MessageSquare className="text-white opacity-50" size={32} />
          </div>
        </div>
      </section>

      <div ref={containerRef} className="container mx-auto px-8 py-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-300 mb-20">
          <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-fsm-blue">Canales de Contacto</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
          {/* Premium Form Block */}
          <div className="reveal-item lg:col-span-7 bg-gray-50/50 p-10 md:p-16 rounded-[4rem] border border-gray-100 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-fsm-red/5 rounded-full  -translate-y-1/2 translate-x-1/2"></div>
             
             <div className="relative z-10">
                <h2 className="text-3xl font-black text-fsm-blue mb-10 uppercase tracking-tighter">Consulta Digital</h2>
                
                <form className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4">Nombre Completo</label>
                      <input type="text" className="w-full bg-white border border-gray-100 rounded-[2rem] px-8 py-5 outline-none focus:border-fsm-red transition-all shadow-sm font-medium" placeholder="Escriba su nombre" required />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4">Teléfono Móvil</label>
                      <input type="tel" className="w-full bg-white border border-gray-100 rounded-[2rem] px-8 py-5 outline-none focus:border-fsm-red transition-all shadow-sm font-medium" placeholder="300 000 0000" required />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4">Correo Institucional / Personal</label>
                    <input type="email" className="w-full bg-white border border-gray-100 rounded-[2rem] px-8 py-5 outline-none focus:border-fsm-red transition-all shadow-sm font-medium" placeholder="ejemplo@correo.com" required />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4">Programa de Interés</label>
                    <select className="w-full bg-white border border-gray-100 rounded-[2rem] px-8 py-5 outline-none focus:border-fsm-red transition-all shadow-sm appearance-none font-medium cursor-pointer" required>
                      <option value="">Seleccione una opción</option>
                      <option>Técnico Laboral en Auxiliar de Enfermería</option>
                      <option>Técnico Laboral en Primera Infancia</option>
                      <option>Cursos de Educación Continua</option>
                      <option>Procesos Administrativos</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4">Su Mensaje</label>
                    <textarea rows={4} className="w-full bg-white border border-gray-100 rounded-[2rem] px-8 py-5 outline-none focus:border-fsm-red transition-all shadow-sm resize-none font-medium" placeholder="¿En qué podemos ayudarle?" required></textarea>
                  </div>

                  <div className="flex items-start gap-4 p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <input type="checkbox" className="mt-1 w-5 h-5 accent-fsm-red cursor-pointer" required id="terms" />
                    <label htmlFor="terms" className="text-[10px] text-gray-400 font-bold leading-relaxed uppercase tracking-tighter">
                      Acepto la <Link href="/institucion/tratamiento-datos" className="text-fsm-red hover:underline">Política de Protección de Datos</Link> (Ley 1581 de 2012).
                    </label>
                  </div>

                  <button type="submit" className="group w-full bg-fsm-blue text-white font-black py-6 rounded-[2.5rem] hover:bg-fsm-red shadow-premium transition-all duration-500 flex items-center justify-center gap-4 uppercase text-[10px] tracking-[0.2em]">
                    ENVIAR SOLICITUD <Send size={20} className="group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" />
                  </button>
                </form>
             </div>
          </div>

          {/* Contact Info & Map Side */}
          <div className="lg:col-span-5 flex flex-col gap-12">
            <div className="reveal-item bg-fsm-blue p-12 md:p-16 rounded-[4rem] text-white shadow-premium relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-fsm-red/40  rounded-full translate-x-1/2 -translate-y-1/2"></div>
              <h2 className="text-2xl font-black mb-12 uppercase tracking-tighter leading-none">Datos de <br /> Contacto</h2>
              
              <div className="space-y-10 relative z-10">
                <div className="flex gap-6">
                  <div className="w-12 h-12 bg-white/10  rounded-2xl flex items-center justify-center border border-white/20 shrink-0">
                    <Home size={22} className="text-fsm-red" />
                  </div>
                  <div>
                    <h4 className="font-black text-[9px] opacity-40 uppercase tracking-[0.3em] mb-4">Ubicación Central</h4>
                    <p className="font-bold text-sm leading-relaxed mb-1">Sede Administrativa: Carrera 7 # 18-99</p>
                    <p className="font-bold text-sm leading-relaxed">Sede Académica: Calle 19 # 7A-29</p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="w-12 h-12 bg-white/10  rounded-2xl flex items-center justify-center border border-white/20 shrink-0">
                    <Phone size={22} className="text-fsm-red" />
                  </div>
                  <div>
                    <h4 className="font-black text-[9px] opacity-40 uppercase tracking-[0.3em] mb-4">Líneas Telefónicas</h4>
                    <p className="text-xl font-black tracking-tighter">(601) 732 1080</p>
                    <p className="text-sm font-bold opacity-60">(601) 817 5456</p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="w-12 h-12 bg-white/10  rounded-2xl flex items-center justify-center border border-white/20 shrink-0">
                    <Mail size={22} className="text-fsm-red" />
                  </div>
                  <div>
                    <h4 className="font-black text-[9px] opacity-40 uppercase tracking-[0.3em] mb-4">E-mail Oficial</h4>
                    <p className="font-black text-sm lowercase tracking-tighter">info@fundacionsanmateosoacha.edu.co</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Immersive Map Section */}
            <div className="reveal-item flex-1 min-h-[400px] rounded-[4rem] overflow-hidden shadow-premium border-[12px] border-gray-50 bg-gray-50 relative group">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3977.0576247706867!2d-74.21655598523816!3d4.58367759666995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f9fd6e33585e1%3A0x2159032a3e856a0e!2sSan%20Mateo%20Foundation!5e0!3m2!1sen!2sco!4v1670905879405!5m2!1sen!2sco"
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy" 
                className="opacity-90 contrast-[0.9] saturate-[0.8] grayscale-[0.2] hover:grayscale-0 hover:opacity-100 transition-all duration-700"
              ></iframe>
              {/* Floating Map Label */}
              <div className="absolute top-6 left-6 p-4 bg-white/90  rounded-2xl border border-white shadow-xl flex items-center gap-3">
                 <Headphones size={20} className="text-fsm-red" />
                 <span className="text-[10px] font-black text-fsm-blue uppercase tracking-widest">Sede Soacha Centro</span>
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
