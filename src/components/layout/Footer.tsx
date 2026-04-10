import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Facebook as FacebookIcon, Instagram as InstagramIcon, Mail, MapPin, Phone, Calendar } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    institucion: [
      { name: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
      { name: "Normatividad", href: "/institucion/normatividad" },
      { name: "Galería", href: "/galeria" },
      { name: "Calendario académico", href: "/calendario-academico", icon: <Calendar size={14} className="inline mr-1" /> },
    ],
    servicios: [
      { name: "Noticias y eventos", href: "/noticias-y-eventos" },
      { name: "Ofertas laborales - Creación", href: "https://fundacionsanmateo.q10.com/OfertaLaboral/Crear", external: true },
      { name: "Solicitudes", href: "https://solicitudes.fundacionsanmateosoacha.edu.co/centro-de-solicitudes", external: true },
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
              <div className="flex gap-3">
                <MapPin className="text-fsm-red shrink-0" size={18} />
                <p>
                  <strong className="block">Sede Académica:</strong>
                  calle 19 # 7A-29
                </p>
              </div>
              <div className="flex gap-3">
                <MapPin className="text-fsm-red shrink-0" size={18} />
                <p>
                  <strong className="block">Sede Administrativa:</strong>
                  carrera 7 # 18-99
                </p>
              </div>
              <div className="flex gap-3">
                <Phone className="text-fsm-red shrink-0" size={18} />
                <p>(601) 732 1080 – (601) 900 2302</p>
              </div>
              <div className="flex gap-6 mt-2">
                <a href="https://www.facebook.com/profile.php?id=100064034556004" target="_blank" className="hover:text-fsm-red transition-colors">
                  <FacebookIcon size={24} />
                </a>
                <a href="https://www.instagram.com/fundacionsanmateosoacha" target="_blank" className="hover:text-fsm-red transition-colors">
                  <InstagramIcon size={24} />
                </a>
              </div>
            </div>
          </div>

          {/* Column 4 */}
          <div className="lg:text-right">
            <h4 className="text-xl font-bold mb-6 lg:ml-auto border-b-2 border-fsm-red w-fit pb-1">Legado</h4>
            <p className="text-sm mb-6 leading-relaxed">
              &copy; Fundación San Mateo - Soacha, {currentYear}<br />
              Vigilada Secretaría de Educación de Soacha
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

        <div className="border-t border-white/10 mt-16 pt-8 text-center text-xs text-white/50">
          <p>Los programas no conducen a la obtención de título profesional. Institución para el Trabajo y Desarrollo Humano.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
