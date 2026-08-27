"use client";

import React, { useState, useEffect } from "react";
import { X, FileText, ExternalLink } from "lucide-react";

interface FloatingLandingModalProps {
  showModal: boolean;
  link: string;
  image?: string;
  buttonText?: string;
}

export default function FloatingLandingModal({
  showModal,
  link,
  image,
  buttonText = "¡Inscríbete Ahora!",
}: FloatingLandingModalProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!showModal || !link) return null;

  const isImageUrl = (url: string) => {
    if (!url) return false;
    return /\.(jpg|jpeg|png|webp|avif|gif|svg)(\?.*)?$/i.test(url) || url.startsWith("data:image/");
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Determine if we have an image to display (either explicitly passed as image prop or if link is an image URL)
  const modalImageSrc = image || (isImageUrl(link) ? link : null);

  return (
    <>
      {/* Floating Minimized Badge */}
      {!isOpen && (
        <div className="fixed bottom-6 left-6 z-[120] flex items-center gap-2">
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-fsm-red text-white px-5 py-3.5 rounded-2xl shadow-premium border border-fsm-red/20 hover:bg-fsm-blue hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 font-black text-[10px] tracking-widest uppercase group"
          >
            <FileText size={16} className="animate-pulse" />
            <span>{buttonText}</span>
            <ExternalLink size={14} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <button
            onClick={() => setIsOpen(true)}
            title="Ver modal flotante"
            className="bg-white text-gray-700 hover:text-fsm-blue p-3.5 rounded-2xl shadow-premium border border-gray-100 hover:scale-105 active:scale-95 transition-all duration-300 text-[10px] font-bold uppercase tracking-wider"
          >
            Ver Modal
          </button>
        </div>
      )}

      {/* Floating Modal Box */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 z-[120] w-[380px] max-w-[calc(100vw-3rem)] bg-white rounded-[2.5rem] border border-gray-100 shadow-premium overflow-hidden transition-all duration-500 animate-in slide-in-from-bottom-8 ease-out flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center bg-fsm-blue text-white px-6 py-4">
            <span className="text-[9px] font-black tracking-widest uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
              INSCRIPCIÓN DIGITAL
            </span>
            <div className="flex items-center gap-1.5">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all flex items-center gap-1 text-[10px] font-semibold"
                title="Abrir enlace en nueva pestaña"
              >
                <ExternalLink size={16} />
              </a>
              <button
                onClick={handleClose}
                className="text-white/70 hover:text-fsm-red hover:bg-white/10 p-1.5 rounded-lg transition-colors"
                title="Minimizar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Content (Image preview wrapped in link or Iframe) */}
          <div className="relative h-[420px] w-full bg-gray-50 overflow-hidden">
            {modalImageSrc ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full h-full cursor-pointer group/img relative overflow-hidden"
              >
                <img
                  src={modalImageSrc}
                  alt="Inscripción"
                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/10 group-hover/img:bg-transparent transition-colors flex items-center justify-center">
                  <span className="bg-black/60 text-white text-[10px] font-bold px-3.5 py-1.5 rounded-full backdrop-blur-sm opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center gap-1.5 shadow-md">
                    <ExternalLink size={12} />
                    Abrir enlace
                  </span>
                </div>
              </a>
            ) : (
              <iframe
                src={link}
                className="w-full h-full border-0"
                title="Formulario de Inscripción Escala"
                allow="clipboard-write"
              />
            )}
          </div>

          {/* Footer with direct CTA button to navigate to the link */}
          <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-2">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-fsm-red hover:bg-fsm-blue text-white font-black py-3.5 px-5 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 text-xs tracking-wider uppercase text-center group"
            >
              <span>{buttonText}</span>
              <ExternalLink size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      )}
    </>
  );
}
