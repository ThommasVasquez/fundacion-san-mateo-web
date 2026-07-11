"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Facebook as FacebookIcon, 
  Instagram as InstagramIcon, 
  Mail, 
  MapPin, 
  Phone, 
  Calendar,
  Twitter,
  Youtube,
  Linkedin,
  Github,
  Globe
} from "lucide-react";
import { getFooterSettings, getFooterAddresses, getFooterSocials } from "@/app/actions";

const getSocialIcon = (iconName: string) => {
  switch (iconName?.toLowerCase()) {
    case "facebook": return <FacebookIcon size={24} />;
    case "instagram": return <InstagramIcon size={24} />;
    case "twitter": return <Twitter size={24} />;
    case "youtube": return <Youtube size={24} />;
    case "linkedin": return <Linkedin size={24} />;
    case "github": return <Github size={24} />;
    default: return <Globe size={24} />;
  }
};

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [addresses, setAddresses] = useState<any[]>([]);
  const [socials, setSocials] = useState<any[]>([]);

  useEffect(() => {
    async function loadFooter() {
      try {
        const [footerSettings, footerAddr, footerSoc] = await Promise.all([
          getFooterSettings(),
          getFooterAddresses(),
          getFooterSocials()
        ]);
        setSettings(footerSettings);
        setAddresses(footerAddr);
        setSocials(footerSoc);
      } catch (err) {
        console.error("Error loading footer settings:", err);
      }
    }
    loadFooter();
  }, []);

  const footerLinks = {
    institucion: [
      { name: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
      { name: "Normatividad", href: "/institucion/normatividad" },
      { name: "Galería", href: "/galeria" },
      { name: "Calendario académico", href: "/calendario-academico", icon: <Calendar size={14} className="inline mr-1" /> },
    ],
    servicios: [
      { name: "Noticias y eventos", href: "/noticias-y-eventos" },
      { name: "Ofertas laborales - Creación", href: settings['footer_link_ofertas_laborales'] || "https://fundacionsanmateo.q10.com/OfertaLaboral/Crear", external: true },
      { name: "Solicitudes", href: settings['footer_link_solicitudes'] || "https://solicitudes.fundacionsanmateosoacha.edu.co/centro-de-solicitudes", external: true },
    ],
  };

  const certifications = [
    { src: "/img/logo-ISO9001.jpg", alt: "ISO 9001" },
    { src: "/img/logo-NTC5555.jpg", alt: "NTC 5555" },
    { src: "/img/logo-NTC5581.jpg", alt: "NTC 5581" },
    { src: "/img/logo-NTC5663.jpg", alt: "NTC 5663" },
  ];

  return (
    <footer className="bg-fsm-blue-light text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Column 1 */}
          <div>
            <h4 className="text-xl font-bold mb-6 border-b-2 border-fsm-red w-fit pb-1">Institución</h4>
            <ul className="flex flex-col gap-3">
              {footerLinks.institucion.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm hover:text-white/70 transition-colors flex items-center">
                    {link.icon}
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2 */}
          <div>
            <h4 className="text-xl font-bold mb-6 border-b-2 border-fsm-red w-fit pb-1">Servicios</h4>
            <ul className="flex flex-col gap-3">
              {footerLinks.servicios.map((link) => (
                <li key={link.name}>
                  {link.external ? (
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-white/70 transition-colors">
                      {link.name}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-sm hover:text-white/70 transition-colors">
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h4 className="text-xl font-bold mb-6 border-b-2 border-fsm-red w-fit pb-1">Contacto</h4>
            <div className="flex flex-col gap-4 text-sm">
              {addresses.length > 0 ? (
                addresses.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <MapPin className="text-fsm-red shrink-0" size={18} />
                    <p>
                      <strong className="block">{item.name}:</strong>
                      {item.address}
                    </p>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex gap-3">
                    <MapPin className="text-fsm-red shrink-0" size={18} />
                    <p>
                      <strong className="block">Sede Académica:</strong>
                      {settings['footer_sede_academica'] || "calle 19 # 7A-29"}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <MapPin className="text-fsm-red shrink-0" size={18} />
                    <p>
                      <strong className="block">Sede de Soacha:</strong>
                      {settings['footer_sede_soacha'] || "carrera 7 # 18-99"}
                    </p>
                  </div>
                </>
              )}
              <div className="flex gap-3">
                <Phone className="text-fsm-red shrink-0" size={18} />
                <p>{settings['footer_phones'] || "(601) 732 1080 – (601) 900 2302"}</p>
              </div>
              <div className="flex gap-6 mt-2">
                {socials.length > 0 ? (
                  socials.map((item) => (
                    <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-fsm-red transition-colors" title={item.name}>
                      {getSocialIcon(item.icon)}
                    </a>
                  ))
                ) : (
                  <>
                    <a href={settings['footer_facebook_url'] || "https://www.facebook.com/profile.php?id=100064034556004"} target="_blank" className="hover:text-fsm-red transition-colors">
                      <FacebookIcon size={24} />
                    </a>
                    <a href={settings['footer_instagram_url'] || "https://www.instagram.com/fundacionsanmateosoacha"} target="_blank" className="hover:text-fsm-red transition-colors">
                      <InstagramIcon size={24} />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Column 4 */}
          <div className="lg:text-right">
            <h4 className="text-xl font-bold mb-6 lg:ml-auto border-b-2 border-fsm-red w-fit pb-1">Legado</h4>
            <p className="text-sm mb-6 leading-relaxed">
              &copy; {settings['footer_copyright_prefix'] || "Fundación San Mateo - Soacha"}, {currentYear}<br />
              {settings['footer_vigilado_text'] || "Vigilado por Secretaría de Educación de Soacha"}
            </p>
            <div className="grid grid-cols-4 gap-2 lg:justify-items-end">
              {certifications.map((cert) => (
                <div key={cert.alt} className="relative w-full h-12 bg-white rounded p-1">
                  <Image src={cert.src} alt={cert.alt} fill className="object-contain" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-16 pt-8 text-center text-xs text-white/50 flex flex-col items-center gap-4">
          <p>{settings['footer_legal_notice'] || "Los programas no conducen a la obtención de título profesional. Institución para el Trabajo y Desarrollo Humano."}</p>
          
          <a 
            href="https://www.energysoftmedia.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6 mt-4 border-t border-white/5 w-full hover:opacity-80 transition-opacity group cursor-pointer"
          >
             <div className="relative w-32 h-10 shrink-0">
                <Image src="/img/energysoft-logo.png" alt="ENERGYSOFTmedia Logo" fill className="object-contain" />
             </div>
             <p className="text-white/70 font-medium text-xs sm:text-sm text-center sm:text-left leading-relaxed">
               Desarrollado con todo el poder de <strong className="text-white font-bold group-hover:text-fsm-red transition-colors">ENERGYSOFTmedia®</strong><br />
               | Software con Energía! ⚡️
             </p>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
