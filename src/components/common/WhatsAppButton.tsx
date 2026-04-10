"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

const WhatsAppButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <a
      href="https://api.whatsapp.com/send?phone=573184349631&text=Hola, quisiera obtener información sobre los programas académicos."
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed bottom-8 right-8 z-[60] flex items-center gap-3 bg-white shadow-2xl rounded-full p-2 pl-4 border border-green-100 transition-all duration-500 transform ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-20 opacity-0"
      } hover:scale-105 active:scale-95 group`}
    >
      <span className="text-sm font-bold text-gray-700 max-w-0 overflow-hidden group-hover:max-w-[200px] transition-all duration-500 whitespace-nowrap">
        ¡Estamos para ayudarte!
      </span>
      <div className="relative w-12 h-12">
        <Image 
          src="/img/icon-whatsapp.png" 
          alt="WhatsApp" 
          fill 
          className="object-contain"
        />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
        </span>
      </div>
    </a>
  );
};

export default WhatsAppButton;
