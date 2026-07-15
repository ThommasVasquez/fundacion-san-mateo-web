"use client";

import React, { useState, useEffect } from "react";
import { X, FileText } from "lucide-react";

interface FloatingLandingModalProps {
  showModal: boolean;
  link: string;
}

export default function FloatingLandingModal({ showModal, link }: FloatingLandingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Check if user has already explicitly closed it in this session
    const hasClosed = sessionStorage.getItem("fsm_landing_modal_closed");
    if (showModal && link) {
      if (hasClosed === "true") {
        setIsMinimized(true);
      } else {
        // Auto open after a small delay for premium entrance feel
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [showModal, link]);

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(true);
    sessionStorage.setItem("fsm_landing_modal_closed", "true");
  };

  if (!showModal || !link) return null;

  return (
    <>
      {/* Floating Minimized Badge */}
      {isMinimized && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-[120] bg-fsm-red text-white px-5 py-4 rounded-2xl shadow-premium border border-fsm-red/20 hover:bg-fsm-blue hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 font-black text-[10px] tracking-widest uppercase"
        >
          <FileText size={16} className="animate-pulse" />
          ¡Inscríbete Ahora!
        </button>
      )}

      {/* Floating Modal Box */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 z-[120] w-[360px] max-w-[calc(100vw-3rem)] bg-white rounded-[2.5rem] border border-gray-100 shadow-premium overflow-hidden transition-all duration-500 animate-in slide-in-from-bottom-8 ease-out flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center bg-fsm-blue text-white px-8 py-4">
            <span className="text-[9px] font-black tracking-widest uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
              INSCRIPCIÓN DIGITAL
            </span>
            <button
              onClick={handleClose}
              className="text-white/70 hover:text-fsm-red transition-colors p-1"
              title="Minimizar"
            >
              <X size={18} />
            </button>
          </div>

          {/* IFrame Lead Form */}
          <div className="relative h-[480px] w-full bg-gray-50">
            <iframe
              src={link}
              className="w-full h-full border-0 rounded-b-[2.5rem]"
              title="Formulario de Inscripción Escala"
              allow="clipboard-write"
            />
          </div>
        </div>
      )}
    </>
  );
}
