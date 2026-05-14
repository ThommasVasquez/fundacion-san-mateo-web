"use client";

import React, { useState, useEffect, useRef } from "react";
import { Quote, ChevronLeft, ChevronRight, Star } from "lucide-react";
import gsap from "gsap";

const testimonials = [
  {
    text: "Quiero agradecerle a la Fundación San Mateo porque aprendí mucho y obtuve habilidades en el tema de Auxiliar de Enfermería y crecimiento como persona. Recomendaría la Fundación y a sus docentes sin ninguna duda, además porque me ayudaron a emplearme una vez me gradué.",
    author: "Wilmer Flórez",
    role: "Egresado de Auxiliar de Enfermería",
  },
  {
    text: "Soy feliz con mi labor, todo gracias a mi Fundación San Mateo de la cual soy egresada, el lugar que me dio la oportunidad de conseguir un trabajo y así avanzar en mi proyecto de vida, el lugar que me vio crecer como estudiante enfermera y sobre todo persona que me guió en este camino.",
    author: "Luisa Ortiz Carrillo",
    role: "Egresada de Auxiliar de Enfermería",
  },
  {
    text: "La Fundación San Mateo es un lugar lleno de oportunidades, donde cada esfuerzo vale la pena y es reconocido. Durante mi paso por ella conocí amigos, compañeros, jefes y docentes que me infundieron la confianza y la seguridad en mí.",
    author: "Liset Bustos Gomez",
    role: "Egresada de Auxiliar de Enfermería",
  },
];

const Testimonials = ({ content = {} }: { content?: Record<string, string> }) => {
  const [current, setCurrent] = useState(0);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        textRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" }
      );
    }, textRef);

    return () => ctx.revert();
  }, [current]);

  const handleNext = () => setCurrent((prev) => (prev + 1) % testimonials.length);
  const handlePrev = () => setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="py-24 bg-fsm-blue overflow-hidden relative">
      {/* Background patterns */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-white opacity-[0.03] skew-x-[-15deg] translate-x-1/2"></div>
      <div className="absolute top-0 left-0 w-1/3 h-full bg-fsm-red opacity-[0.1] skew-x-[-15deg] -translate-x-1/2"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-sm font-black text-fsm-red tracking-[0.3em] uppercase mb-4">
            {content['home_test_subtitle'] || 'Testimonios'}
          </h2>
          <h3 className="text-4xl font-black text-white" dangerouslySetInnerHTML={{ __html: content['home_test_title'] || 'VOCES DE NUESTROS EGRESADOS' }}>
          </h3>
        </div>

        <div className="max-w-4xl mx-auto relative">
          {/* Quote Icon */}
          <div className="absolute -top-10 -left-10 text-fsm-red/20 opacity-50 z-0">
            <Quote size={120} />
          </div>

          <div ref={textRef} className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl relative z-10">
            <div className="flex justify-center mb-8 gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={20} className="fill-fsm-red text-fsm-red" />
              ))}
            </div>

            <p className="text-xl md:text-2xl text-gray-700 italic text-center leading-relaxed mb-10">
              &quot;{testimonials[current].text}&quot;
            </p>

            <div className="text-center">
              <h4 className="text-fsm-blue font-black text-xl mb-1">{testimonials[current].author}</h4>
              <span className="text-gray-700 text-sm font-bold uppercase tracking-widest">
                {testimonials[current].role}
              </span>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-center mt-12 gap-6">
            <button 
              onClick={handlePrev}
              className="p-4 rounded-full bg-white/10 border border-white/20 text-white hover:bg-fsm-red hover:border-fsm-red transition-all duration-300 transform hover:scale-110 active:scale-90"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={handleNext}
              className="p-4 rounded-full bg-white/10 border border-white/20 text-white hover:bg-fsm-red hover:border-fsm-red transition-all duration-300 transform hover:scale-110 active:scale-90"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Indicators */}
          <div className="flex justify-center mt-8 gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all duration-500 ${
                  i === current ? "w-8 bg-fsm-red" : "w-2 bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
