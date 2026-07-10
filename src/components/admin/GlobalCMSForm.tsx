"use client";

import React, { useState } from "react";
import { updateContent } from "@/app/actions";
import {
  Save,
  Image as ImageIcon,
  FileText,
  CheckCircle,
  Loader2,
  ChevronDown,
  FolderTree,
  ToggleLeft,
  ToggleRight,
  MessageSquareQuote,
  Contact,
  GraduationCap,
  HelpCircle,
} from "lucide-react";
import Image from "next/image";
import TestimonialManager from "./TestimonialManager";
import DirectoryManager from "./DirectoryManager";
import ProgramManager from "./ProgramManager";
import NewsManager from "./NewsManager";
import GalleryManager from "./GalleryManager";
import CalendarManager from "./CalendarManager";
import FAQManager from "./FAQManager";
import NormativityManager from "./NormativityManager";
import { Newspaper, Image as GalleryIcon, CalendarDays } from "lucide-react";

interface GlobalCMSFormProps {
  initialContent: Record<string, string>;
  initialTestimonials?: any[];
  initialDirectoryItems?: any[];
  initialPrograms?: any[];
  initialNews: any[];
  initialGallery: any[];
  initialCalendar: any[];
  blogPosts?: any[];
  initialFAQs?: any[];
  initialNormativityDocs?: any[];
}

// Estructura Jerárquica del CMS
export const cmsStructure: Record<string, any> = {
  Inicio: [
    {
      group: "Hero Section",
      key: "home_hero_subtitle",
      label: "Subtítulo Superior",
      type: "text",
      default: "Excelencia en Educación Superior",
    },
    {
      group: "Hero Section",
      key: "home_hero_title1",
      label: "Título Línea 1",
      type: "text",
      default: "FORJANDO",
    },
    {
      group: "Hero Section",
      key: "home_hero_title_highlight",
      label: "Título Resaltado",
      type: "text",
      default: "FUTUROS",
    },
    {
      group: "Hero Section",
      key: "home_hero_title2",
      label: "Título Línea 3",
      type: "text",
      default: "BRILLANTES",
    },
    {
      group: "Hero Section",
      key: "home_hero_desc",
      label: "Descripción Principal",
      type: "text",
      default:
        "Institución de educación para el trabajo y desarrollo humano en Soacha, comprometida con la formación integral y la calidad técnica.",
    },
    {
      group: "Hero Section",
      key: "home_hero_image",
      label: "Imagen Hero",
      type: "image",
      default: "/img/servicio-al-cliente.jpg",
    },
    {
      group: "Hero Section (Botón Primario)",
      key: "home_hero_cta_primary_show",
      label: "Mostrar Botón Primario",
      type: "toggle",
      default: "true",
    },
    {
      group: "Hero Section (Botón Primario)",
      key: "home_hero_cta_primary_text",
      label: "Texto Botón Primario",
      type: "text",
      default: "EXPLORAR PROGRAMAS",
    },
    {
      group: "Hero Section (Botón Primario)",
      key: "home_hero_cta_primary_link",
      label: "Enlace Botón Primario",
      type: "text",
      default: "/oferta-academica",
    },
    {
      group: "Hero Section (Botón Secundario)",
      key: "home_hero_cta_secondary_show",
      label: "Mostrar Botón Secundario",
      type: "toggle",
      default: "true",
    },
    {
      group: "Hero Section (Botón Secundario)",
      key: "home_hero_cta_secondary_text",
      label: "Texto Botón Secundario",
      type: "text",
      default: "VER VIDEO INSTITUCIONAL",
    },
    {
      group: "Hero Section (Botón Secundario)",
      key: "home_hero_cta_secondary_link",
      label: "Enlace Botón Secundario",
      type: "text",
      default: "#",
    },
    {
      group: "Sección Programas",
      key: "home_programs_subtitle",
      label: "Subtítulo",
      type: "text",
      default: "Oferta Programática",
    },
    {
      group: "Sección Programas",
      key: "home_programs_title",
      label: "Título HTML",
      type: "text",
      default:
        'Elige tu camino hacia la <br /><span class="text-fsm-red">Excelencia</span>',
    },
    {
      group: "Sección Programas (Prog 1)",
      key: "home_prog1_title",
      label: "Nombre Programa 1",
      type: "text",
      default: "AUXILIAR DE ENFERMERÍA",
    },
    {
      group: "Sección Programas (Prog 1)",
      key: "home_prog1_image",
      label: "Imagen Programa 1",
      type: "image",
      default: "/img/image18.jpg",
    },
    {
      group: "Sección Programas (Prog 1)",
      key: "home_prog1_link",
      label: "Link Programa 1",
      type: "text",
      default: "/programa-enfermeria",
    },
    {
      group: "Sección Programas (Prog 2)",
      key: "home_prog2_title",
      label: "Nombre Programa 2",
      type: "text",
      default: "ATENCIÓN INTEGRAL A LA PRIMERA INFANCIA",
    },
    {
      group: "Sección Programas (Prog 2)",
      key: "home_prog2_image",
      label: "Imagen Programa 2",
      type: "image",
      default: "/img/image27.jpg",
    },
    {
      group: "Sección Programas (Prog 2)",
      key: "home_prog2_link",
      label: "Link Programa 2",
      type: "text",
      default: "/programa-primera-infancia",
    },
    {
      group: "Sección Programas (Prog 3)",
      key: "home_prog3_title",
      label: "Nombre Programa 3",
      type: "text",
      default: "Sistemas e Informática",
    },
    {
      group: "Sección Programas (Prog 3)",
      key: "home_prog3_image",
      label: "Imagen Programa 3",
      type: "image",
      default: "/img/image11.jpg",
    },
    {
      group: "Sección Programas (Prog 3)",
      key: "home_prog3_link",
      label: "Link Programa 3",
      type: "text",
      default: "/programa-sistemas",
    },
    {
      group: "Sección Programas (Prog 4)",
      key: "home_prog4_title",
      label: "Nombre Programa 4",
      type: "text",
      default: "Contabilidad y Finanzas",
    },
    {
      group: "Sección Programas (Prog 4)",
      key: "home_prog4_image",
      label: "Imagen Programa 4",
      type: "image",
      default: "/img/image12.jpg",
    },
    {
      group: "Sección Programas (Prog 4)",
      key: "home_prog4_link",
      label: "Link Programa 4",
      type: "text",
      default: "/programa-contabilidad",
    },
    {
      group: "Sección Programas (Promoción)",
      key: "home_promo_banner_text",
      label: "Texto Banner Promo",
      type: "text",
      default:
        '¡Matricúlate hoy y obtén tu <span class="underline decoration-wavy">Uniforme Gratis</span>!',
    },
    {
      group: "Sección Programas (Promoción)",
      key: "home_promo_banner_link",
      label: "Link Banner Promo",
      type: "text",
      default: "https://fundacionsanmateo.q10.com/Preinscripcion",
    },
    {
      group: "Sección Certificaciones",
      key: "home_cert_title",
      label: "Título",
      type: "text",
      default: "RECONOCIMIENTO <br /> INSTITUCIONAL",
    },
    {
      group: "Sección Certificaciones",
      key: "home_cert_desc",
      label: "Descripción",
      type: "text",
      default:
        "Operamos bajo la aprobación oficial de la Secretaría de Educación de Soacha y contamos con certificaciones internacionales que avalan nuestros procesos pedagógicos.",
    },
    {
      group: "Valores (¿Por Qué Elegirnos?)",
      key: "home_why_subtitle",
      label: "Subtítulo",
      type: "text",
      default: "Nuestra Identidad",
    },
    {
      group: "Valores (¿Por Qué Elegirnos?)",
      key: "home_why_title",
      label: "Título",
      type: "text",
      default:
        'VALORES QUE <br /><span class="text-fsm-red">TRANSFORMAN</span>',
    },
    {
      group: "Valores (¿Por Qué Elegirnos?)",
      key: "home_why_quote",
      label: "Cita Principal",
      type: "text",
      default:
        '"Formamos con vocación y excelencia técnica, integrando principios éticos y humanistas en cada paso de nuestro proceso educativo."',
    },
    {
      group: "Testimonios",
      key: "home_test_subtitle",
      label: "Subtítulo",
      type: "text",
      default: "Testimonios",
    },
    {
      group: "Testimonios",
      key: "home_test_title",
      label: "Título Principal",
      type: "text",
      default: "VOCES DE NUESTROS EGRESADOS",
    },
  ],
  Institución: {
    "Acerca de la FSM": [
      {
        group: "Encabezado Hero",
        key: "about_hero_subtitle",
        label: "Subtítulo",
        type: "text",
        default: "Nuestra Institución",
      },
      {
        group: "Encabezado Hero",
        key: "about_hero_title",
        label: "Título HTML",
        type: "text",
        default:
          'CONOCE LA <br /> <span class="text-fsm-blue-light uppercase">Historia</span>',
      },
      {
        group: "Encabezado Hero",
        key: "about_hero_desc",
        label: "Descripción",
        type: "text",
        default:
          "Más de dos décadas transformando vidas a través de la educación técnica de calidad en el municipio de Soacha.",
      },
      {
        group: "Encabezado Hero",
        key: "about_hero_image",
        label: "Imagen Hero",
        type: "image",
        default: "/img/banner32.jpg",
      },
      {
        group: "Nuestra Trayectoria",
        key: "about_history_title",
        label: "Título Sección",
        type: "text",
        default: "Nuestra Trayectoria",
      },
      {
        group: "Nuestra Trayectoria",
        key: "about_history_p1",
        label: "Párrafo 1",
        type: "text",
        default:
          "La FUNDACIÓN SAN MATEO nació en noviembre del año 2000 como una respuesta valiente a las crecientes necesidades educativas de las comunidades en riesgo de Soacha.",
      },
      {
        group: "Nuestra Trayectoria",
        key: "about_history_p2",
        label: "Párrafo 2",
        type: "text",
        default:
          "Desde el barrio San Mateo, iniciamos formando Promotores de Salud, evolucionando hasta convertirnos en la institución líder en formación de Técnicos Laborales que somos hoy, capacitándonos para interactuar con excelencia en el mercado laboral real.",
      },
      {
        group: "Nuestra Trayectoria",
        key: "about_history_quote",
        label: "Cita Destacada",
        type: "text",
        default:
          '"Cumplimos una labor social vital, empoderando a jóvenes y adultos para transformar su realidad socioeconómica."',
      },
      {
        group: "Nuestra Trayectoria",
        key: "about_history_image",
        label: "Imagen de la Sección",
        type: "image",
        default: "/img/image4.png",
      },
      {
        group: "Misión y Visión",
        key: "about_mission_title",
        label: "Título Misión",
        type: "text",
        default: "Misión",
      },
      {
        group: "Misión y Visión",
        key: "about_mission_desc",
        label: "Descripción Misión",
        type: "text",
        default:
          "Formar integralmente a nuestros estudiantes mediante programas técnicos con alto nivel de exigencia y competitividad, orientados por un talento humano idóneo y el mejoramiento continuo institucional.",
      },
      {
        group: "Misión y Visión",
        key: "about_vision_title",
        label: "Título Visión",
        type: "text",
        default: "Visión",
      },
      {
        group: "Misión y Visión",
        key: "about_vision_desc",
        label: "Descripción Visión",
        type: "text",
        default:
          "Ser reconocidos en todo Cundinamarca por la excelencia educativa, compromiso social y el liderazgo en la formación técnica certificada bajo rigurosos sistemas de gestión de calidad.",
      },
      {
        group: "Acreditaciones",
        key: "about_cert_title",
        label: "Título Acreditaciones",
        type: "text",
        default: "Excelencia Acreditada",
      },
      {
        group: "Acreditaciones",
        key: "about_cert_desc",
        label: "Descripción Acreditaciones",
        type: "text",
        default:
          "Nuestra institución está comprometida con los más altos estándares educativos. Contamos con certificaciones ISO que garantizan la calidad en todos nuestros procesos administrativos y pedagógicos.",
      },
      {
        group: "Banner Final",
        key: "about_norms_title",
        label: "Título Banner",
        type: "text",
        default: "Excelencia Acreditada",
      },
      {
        group: "Banner Final",
        key: "about_norms_desc",
        label: "Descripción Banner HTML",
        type: "text",
        default:
          'Contamos con certificaciones internacionales <span class="text-white font-black underline decoration-white/30 decoration-wavy underline-offset-8">ISO 9001:2015</span> y Normas Técnicas de Calidad (NTC) que avalan nuestra trayectoria ininterrumpida desde el año 2000.',
      },
    ],
    "¿Por Qué Nosotros?": [
      {
        group: "Encabezado Hero",
        key: "whyus_hero_subtitle",
        label: "Subtítulo",
        type: "text",
        default: "Valor Diferencial",
      },
      {
        group: "Encabezado Hero",
        key: "whyus_hero_title",
        label: "Título HTML",
        type: "text",
        default: '¿POR QUÉ <br /> <span class="text-fsm-red">ELEGIRNOS</span>?',
      },
      {
        group: "Encabezado Hero",
        key: "whyus_hero_desc",
        label: "Descripción",
        type: "text",
        default:
          "Formación integral con altos niveles de exigencia, competitividad y calidad certificada bajo estándares internacionales.",
      },
      {
        group: "Encabezado Hero",
        key: "whyus_hero_image",
        label: "Imagen Hero",
        type: "image",
        default: "/img/banner4.jpg",
      },
      {
        group: "Política de Calidad",
        key: "whyus_quality_title",
        label: "Título Sección",
        type: "text",
        default: "Política de Calidad",
      },
      {
        group: "Política de Calidad",
        key: "whyus_quality_p1",
        label: "Párrafo 1",
        type: "text",
        default:
          "En la FUNDACIÓN SAN MATEO brindamos un servicio de educación para el trabajo y el desarrollo humano comprometido con la mejora continua.",
      },
      {
        group: "Política de Calidad",
        key: "whyus_quality_p2",
        label: "Párrafo 2",
        type: "text",
        default:
          "Nuestra política se centra en direccionar estratégicamente la organización, diversificar la oferta según las necesidades del sector productivo y estandarizar la gestión de nuestros recursos para garantizar el éxito de cada estudiante.",
      },
      {
        group: "Política de Calidad",
        key: "whyus_quality_highlight",
        label: "Texto Destacado",
        type: "text",
        default: "Mejoramiento continuo en todos los niveles institucionales.",
      },
      {
        group: "Política de Calidad",
        key: "whyus_quality_image",
        label: "Imagen de la Sección",
        type: "image",
        default: "/img/image24.jpg",
      },
      {
        group: "Objetivos de Gestión",
        key: "whyus_obj_subtitle",
        label: "Subtítulo",
        type: "text",
        default: "Compromiso",
      },
      {
        group: "Objetivos de Gestión",
        key: "whyus_obj_title",
        label: "Título Principal HTML",
        type: "text",
        default:
          'Objetivos de <br /> <span class="text-fsm-blue-light">Nuestra Gestión</span>',
      },
      {
        group: "Objetivo 1",
        key: "whyus_obj1_title",
        label: "Título Obj 1",
        type: "text",
        default: "Direccionamiento Estratégico",
      },
      {
        group: "Objetivo 1",
        key: "whyus_obj1_desc",
        label: "Descripción Obj 1",
        type: "text",
        default:
          "Definir e implementar un plan estratégico por medio de un modelo de gestión que permita el mejoramiento continuo.",
      },
      {
        group: "Objetivo 2",
        key: "whyus_obj2_title",
        label: "Título Obj 2",
        type: "text",
        default: "Diversificación de la Oferta",
      },
      {
        group: "Objetivo 2",
        key: "whyus_obj2_desc",
        label: "Descripción Obj 2",
        type: "text",
        default:
          "Diversificar la oferta de formación laboral en coherencia con las necesidades del sector productivo y el mercado.",
      },
      {
        group: "Objetivo 3",
        key: "whyus_obj3_title",
        label: "Título Obj 3",
        type: "text",
        default: "Estandarización de Recursos",
      },
      {
        group: "Objetivo 3",
        key: "whyus_obj3_desc",
        label: "Descripción Obj 3",
        type: "text",
        default:
          "Estandarizar la gestión de recursos humanos, físicos y tecnológicos para garantizar la calidad del servicio.",
      },
      {
        group: "Banner Final",
        key: "whyus_cta_title",
        label: "Título Banner",
        type: "text",
        default: "Transparencia y Legalidad",
      },
      {
        group: "Banner Final",
        key: "whyus_cta_desc",
        label: "Descripción Banner",
        type: "text",
        default:
          "Contamos con todas las resoluciones oficiales y certificaciones técnicas necesarias para garantizar tu titulación.",
      },
      {
        group: "Banner Final",
        key: "whyus_cta_button",
        label: "Texto Botón",
        type: "text",
        default: "VER NORMATIVIDAD",
      },
    ],
    Normatividad: [
      {
        group: "Encabezado Hero",
        key: "norm_hero_subtitle",
        label: "Subtítulo",
        type: "text",
        default: "Marco Legal",
      },
      {
        group: "Encabezado Hero",
        key: "norm_hero_title",
        label: "Título HTML",
        type: "text",
        default:
          'TRANSPARENCIA <br /> <span class="text-fsm-blue-light">NORMATIVA</span>',
      },
      {
        group: "Encabezado Hero",
        key: "norm_hero_desc",
        label: "Descripción",
        type: "text",
        default:
          "Consulte nuestra base documental, resoluciones de aprobación y manuales institucionales que garantizan nuestra excelencia académica.",
      },
      {
        group: "Encabezado Hero",
        key: "norm_hero_image",
        label: "Imagen Hero",
        type: "image",
        default: "/img/banner12.jpg",
      },
      {
        group: "Categorías de Documentos",
        key: "norm_cat1_title",
        label: "Título Cat 1",
        type: "text",
        default: "Aprobación oficial Secretaría de Educación de Soacha",
      },
      {
        group: "Categorías de Documentos",
        key: "norm_cat2_title",
        label: "Título Cat 2",
        type: "text",
        default: "Aprobación Programa Auxiliar de Enfermería",
      },
      {
        group: "Categorías de Documentos",
        key: "norm_cat3_title",
        label: "Título Cat 3",
        type: "text",
        default: "Aprobación Programa Primera Infancia",
      },
      {
        group: "Categorías de Documentos",
        key: "norm_cat4_title",
        label: "Título Cat 4",
        type: "text",
        default: "Documentos Institucionales",
      },
      {
        group: "Categorías de Documentos",
        key: "norm_cat5_title",
        label: "Título Cat 5",
        type: "text",
        default: "Aprobación Programa Servicios Farmacéuticos",
      },
      {
        group: "Categorías de Documentos",
        key: "norm_cat6_title",
        label: "Título Cat 6",
        type: "text",
        default: "Aprobación Programa Asistencia Administrativa",
      },
      {
        group: "Banner Final",
        key: "norm_cta_title",
        label: "Título Banner HTML",
        type: "text",
        default: "¿Requiere Consultar <br /> Más Información?",
      },
      {
        group: "Banner Final",
        key: "norm_cta_desc",
        label: "Descripción Banner",
        type: "text",
        default:
          "Nuestro archivo institucional está disponible para consulta en la sede administrativa para toda la comunidad académica.",
      },
      {
        group: "Banner Final",
        key: "norm_cta_button",
        label: "Texto Botón",
        type: "text",
        default: "HABLAR CON SECRETARÍA",
      },
    ],
    Directorio: [
      {
        group: "Encabezado Hero",
        key: "dir_hero_subtitle",
        label: "Subtítulo",
        type: "text",
        default: "Contacto Administrativo",
      },
      {
        group: "Encabezado Hero",
        key: "dir_hero_title",
        label: "Título HTML",
        type: "text",
        default:
          'PUNTOS DE <br /> <span class="text-fsm-blue-light uppercase">Contacto</span>',
      },
      {
        group: "Encabezado Hero",
        key: "dir_hero_desc",
        label: "Descripción",
        type: "text",
        default:
          "Nuestro equipo administrativo está listo para brindarle la asesoría técnica y humana que requiere en cada etapa de su formación.",
      },
      {
        group: "Encabezado Hero",
        key: "dir_hero_image",
        label: "Imagen Hero",
        type: "image",
        default: "/img/banner11.jpg",
      },
      {
        group: "Líneas de Atención",
        key: "dir_list_title",
        label: "Título Sección",
        type: "text",
        default: "Líneas de Atención",
      },
      {
        group: "Líneas de Atención",
        key: "dir_list_desc",
        label: "Descripción Sección",
        type: "text",
        default: "Comuníquese directamente con el área de su interés.",
      },
      {
        group: "Ubicación",
        key: "dir_sidebar_title",
        label: "Título Sidebar HTML",
        type: "text",
        default: "Ubicación y <br /> Correspondencia",
      },
      {
        group: "Ubicación",
        key: "dir_sede_adm_val",
        label: "Dirección Sede Adm HTML",
        type: "text",
        default: "Calle 19 #8-21, <br /> Soacha Cundinamarca",
      },
      {
        group: "Ubicación",
        key: "dir_sede_aca_val",
        label: "Dirección Sede Aca HTML",
        type: "text",
        default: "Calle 19 # 7A - 29, <br /> Soacha Cundinamarca",
      },
      {
        group: "Horario",
        key: "dir_schedule_title",
        label: "Título Horario",
        type: "text",
        default: "Horario de Atención",
      },
      {
        group: "Horario",
        key: "dir_schedule_week",
        label: "Lunes a Viernes",
        type: "text",
        default: "8:00am - 5:30pm",
      },
      {
        group: "Horario",
        key: "dir_schedule_sat",
        label: "Sábados",
        type: "text",
        default: "7:30am - 12:00m",
      },
    ],
  },
  "Oferta Académica": [
    {
      group: "Programas",
      key: "academic_title",
      label: "Título Principal",
      type: "text",
      default: "Nuestros Programas",
    },
  ],
  Comunidad: {
    "Noticias y Eventos": [
      {
        group: "Encabezado Hero",
        key: "news_magazine_label",
        label: "Etiqueta Superior",
        type: "text",
        default: "Magazine Institucional",
      },
      {
        group: "Encabezado Hero",
        key: "news_title_1",
        label: "Título Línea 1",
        type: "text",
        default: "NOTICIAS Y",
      },
      {
        group: "Encabezado Hero",
        key: "news_title_2",
        label: "Título Línea 2 (Resaltado)",
        type: "text",
        default: "Eventos",
      },
      {
        group: "Encabezado Hero",
        key: "news_description",
        label: "Descripción",
        type: "text",
        default:
          "Manténgase al día con los logros, celebraciones y anuncios más importantes de nuestra comunidad académica.",
      },
      {
        group: "Encabezado Hero",
        key: "news_hero_image",
        label: "Imagen Hero",
        type: "image",
        default: "/img/banner14.jpg",
      },
    ],

    Galería: [
      {
        group: "Encabezado Hero",
        key: "gallery_hero_subtitle",
        label: "Etiqueta Superior",
        type: "text",
        default: "Comunidad FSM",
      },
      {
        group: "Encabezado Hero",
        key: "gallery_hero_title1",
        label: "Título Línea 1",
        type: "text",
        default: "NUESTRA",
      },
      {
        group: "Encabezado Hero",
        key: "gallery_hero_title2",
        label: "Título Línea 2 (Resaltado)",
        type: "text",
        default: "Experiencia",
      },
      {
        group: "Encabezado Hero",
        key: "gallery_hero_description",
        label: "Descripción",
        type: "text",
        default:
          "Un recorrido visual por las prácticas, eventos y momentos que definen nuestra excelencia educativa en la Fundación San Mateo.",
      },
      {
        group: "Encabezado Hero",
        key: "gallery_hero_image",
        label: "Imagen Hero",
        type: "image",
        default: "/img/banner10.jpg",
      },
      {
        group: "Interface",
        key: "gallery_breadcrumbs_label",
        label: "Texto Breadcrumbs",
        type: "text",
        default: "Galería fotográfica",
      },
      {
        group: "Interface",
        key: "gallery_load_more_text",
        label: "Texto Botón Cargar Más",
        type: "text",
        default: "Cargar más fotos",
      },
    ],
    "Calendario Académico": [
      {
        group: "Encabezado Hero",
        key: "calendar_hero_subtitle",
        label: "Etiqueta Superior",
        type: "text",
        default: "Cronograma Escolar",
      },
      {
        group: "Encabezado Hero",
        key: "calendar_hero_title1",
        label: "Título Línea 1",
        type: "text",
        default: "CALENDARIO",
      },
      {
        group: "Encabezado Hero",
        key: "calendar_hero_title2",
        label: "Título Línea 2 (Resaltado)",
        type: "text",
        default: "Académico",
      },
      {
        group: "Encabezado Hero",
        key: "calendar_hero_description",
        label: "Descripción",
        type: "text",
        default:
          "Planifique su semestre con nuestra programación oficial de clases, eventos, periodos de matrícula y fechas institucionales.",
      },
      {
        group: "Encabezado Hero",
        key: "calendar_hero_image",
        label: "Imagen Hero",
        type: "image",
        default: "/img/banner8.jpg",
      },
    ],
    "Preguntas Frecuentes": [
      {
        group: "Encabezado Hero",
        key: "faq_hero_subtitle",
        label: "Etiqueta Superior",
        type: "text",
        default: "Centro de Ayuda",
      },
      {
        group: "Encabezado Hero",
        key: "faq_hero_title1",
        label: "Título Línea 1",
        type: "text",
        default: "PREGUNTAS",
      },
      {
        group: "Encabezado Hero",
        key: "faq_hero_title2",
        label: "Título Línea 2 (Resaltado)",
        type: "text",
        default: "Frecuentes",
      },
      {
        group: "Encabezado Hero",
        key: "faq_hero_description",
        label: "Descripción",
        type: "text",
        default: "Resuelva sus dudas sobre procesos de admisión, programas, pagos y normatividad institucional de manera rápida.",
      },
      {
        group: "Encabezado Hero",
        key: "faq_hero_image",
        label: "Imagen Hero",
        type: "image",
        default: "/img/banner6.jpg",
      },
    ],
  },
  Contacto: [
    {
      group: "Encabezado Hero",
      key: "contact_hero_subtitle",
      label: "Etiqueta Superior",
      type: "text",
      default: "Atención Directa",
    },
    {
      group: "Encabezado Hero",
      key: "contact_hero_title1",
      label: "Título Línea 1",
      type: "text",
      default: "ESTAMOS",
    },
    {
      group: "Encabezado Hero",
      key: "contact_hero_title2",
      label: "Título Línea 2 (Resaltado)",
      type: "text",
      default: "Contigo",
    },
    {
      group: "Encabezado Hero",
      key: "contact_hero_description",
      label: "Descripción",
      type: "text",
      default: "Resuelva sus dudas de manera personalizada. Nuestro equipo está listo para asesorarle en su camino hacia la excelencia técnica.",
    },
    {
      group: "Encabezado Hero",
      key: "contact_hero_image",
      label: "Imagen Hero",
      type: "image",
      default: "/img/banner16.jpg",
    },
    {
      group: "Datos de Ubicación",
      key: "contact_addr_academic",
      label: "Dirección Sede Académica",
      type: "text",
      default: "Calle 19 # 7A - 29 Soacha",
    },
    {
      group: "Datos de Ubicación",
      key: "contact_addr_admin",
      label: "Dirección Sede Administrativa",
      type: "text",
      default: "Calle 19 #8-21, Soacha Centro",
    },
    {
      group: "Líneas y Correo",
      key: "contact_phone_main",
      label: "Teléfono Principal",
      type: "text",
      default: "(601) 732 1080",
    },
    {
      group: "Líneas y Correo",
      key: "contact_phone_sec",
      label: "Teléfono Secundario",
      type: "text",
      default: "(601) 817 5456",
    },
    {
      group: "Líneas y Correo",
      key: "contact_email",
      label: "Correo Electrónico Oficial",
      type: "text",
      default: "info@fundacionsanmateosoacha.edu.co",
    },
    {
      group: "Mapa Interactivo",
      key: "contact_map_url",
      label: "URL Embed de Google Maps",
      type: "text",
      default: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3976.985633364958!2d-74.22019912411933!3d4.596637495378297!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f9fcbb9480cc3%3A0x6b2e353272dc645a!2sCl.%2019%20%238-21%2C%20Soacha%2C%20Cundinamarca!5e0!3m2!1ses!2sco!4v1714500000000!5m2!1ses!2sco",
    },
    {
      group: "Formulario",
      key: "contact_form_title",
      label: "Título del Formulario",
      type: "text",
      default: "Consulta Digital",
    },
  ],
  Navegación: [
    {
      group: "Botón de Inscripciones (Navbar)",
      key: "navbar_inscripciones_text",
      label: "Texto del Botón",
      type: "text",
      default: "Inscripciones",
    },
    {
      group: "Botón de Inscripciones (Navbar)",
      key: "navbar_inscripciones_link",
      label: "Enlace del Botón",
      type: "text",
      default: "https://fundacionsanmateo.q10.com/Preinscripcion",
    },
  ],
};

export default function GlobalCMSForm({
  initialContent,
  initialTestimonials = [],
  initialDirectoryItems = [],
  initialPrograms = [],
  initialNews = [],
  initialGallery = [],
  initialCalendar = [],
  blogPosts = [],
  initialFAQs = [],
  initialNormativityDocs = [],
}: GlobalCMSFormProps) {
  const [contentMap, setContentMap] =
    useState<Record<string, string>>(initialContent);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [successMap, setSuccessMap] = useState<Record<string, boolean>>({});

  // Navigation State
  const [activeCategory, setActiveCategory] = useState<string>("Inicio");
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(
    null,
  );

  // Determinar si la categoría actual tiene submenús (es un objeto y no un array)
  const isSubmenu = !Array.isArray(cmsStructure[activeCategory]);

  // Obtener los campos a renderizar
  let activeFields = [];
  const currentSub =
    activeSubcategory &&
    isSubmenu &&
    Object.keys(cmsStructure[activeCategory]).includes(activeSubcategory)
      ? activeSubcategory
      : isSubmenu
        ? Object.keys(cmsStructure[activeCategory])[0]
        : null;

  if (isSubmenu) {
    activeFields = cmsStructure[activeCategory][currentSub as string];
  } else {
    activeFields = cmsStructure[activeCategory];
  }

  // Agrupar los campos activos por 'group'
  const groupedFields = activeFields.reduce(
    (acc: any, field: any) => {
      if (!acc[field.group]) acc[field.group] = [];
      acc[field.group].push(field);
      return acc;
    },
    {} as Record<string, any>,
  );

  const handleUpdate = async (key: string, newValue: string, type: string) => {
    setLoadingMap((prev) => ({ ...prev, [key]: true }));
    setSuccessMap((prev) => ({ ...prev, [key]: false }));

    const res = await updateContent(key, newValue, "/", type);

    if (res?.success) {
      setContentMap((prev) => ({ ...prev, [key]: newValue }));
      setSuccessMap((prev) => ({ ...prev, [key]: true }));
      setTimeout(
        () => setSuccessMap((prev) => ({ ...prev, [key]: false })),
        3000,
      );
    } else {
      alert("Error al actualizar");
    }

    setLoadingMap((prev) => ({ ...prev, [key]: false }));
  };

  const handleImageUpload = async (key: string, file: File) => {
    setLoadingMap((prev) => ({ ...prev, [key]: true }));
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
            await handleUpdate(key, compressedBase64, "image");
          } else {
            alert("Error interno en el navegador. Intenta con otro.");
            setLoadingMap((prev) => ({ ...prev, [key]: false }));
          }
        };
      };
      reader.onerror = () => {
        alert("No se pudo leer la imagen.");
        setLoadingMap((prev) => ({ ...prev, [key]: false }));
      };
    } catch (e: any) {
      alert("Error fatal al procesar la imagen: " + e.message);
      setLoadingMap((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="space-y-8">
      {/* Selector de Páginas / Menú de Navegación del CMS */}
      <div className="bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100 mb-12">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4 border-r border-gray-100 pr-6">
            <div className="w-12 h-12 bg-fsm-blue/5 rounded-2xl flex items-center justify-center text-fsm-blue">
              <FolderTree size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest text-gray-700 uppercase">
                Sección Activa
              </p>
              <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight">
                Gestor Global
              </h2>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Main Category Selector */}
            <div className="relative">
              <label className="text-xs font-bold text-gray-900 mb-2 block uppercase tracking-widest">
                Página Principal
              </label>
              <div className="relative">
                <select
                  className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-fsm-red cursor-pointer uppercase"
                  value={activeCategory}
                  onChange={(e) => {
                    setActiveCategory(e.target.value);
                    setActiveSubcategory(null); // Reset subcategory on main category change
                  }}
                >
                  {Object.keys(cmsStructure).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none"
                  size={16}
                />
              </div>
            </div>

            {/* Subcategory Selector (Only visible if the category is a submenu) */}
            {isSubmenu && (
              <div className="relative">
                <label className="text-xs font-bold text-gray-900 mb-2 block uppercase tracking-widest">
                  Sub-Sección
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-fsm-red cursor-pointer uppercase"
                    value={
                      activeSubcategory ||
                      Object.keys(cmsStructure[activeCategory])[0]
                    }
                    onChange={(e) => setActiveSubcategory(e.target.value)}
                  >
                    {Object.keys(cmsStructure[activeCategory]).map((subcat) => (
                      <option key={subcat} value={subcat}>
                        {subcat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none"
                    size={16}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Renderizado de Campos */}
      <div className="space-y-12">
        {Object.entries(groupedFields).map(([groupName, fields]) => (
          <div
            key={groupName}
            className="bg-white p-8 rounded-[2rem] shadow-premium border border-gray-100"
          >
            <h3 className="text-2xl font-black text-fsm-blue mb-6 pb-4 border-b border-gray-100">
              Sección: <span className="text-fsm-red">{groupName}</span>
            </h3>

            <div className="space-y-6">
              {(fields as any[]).map((field) => {
                const currentValue = contentMap[field.key] ?? field.default;

                return (
                  <div
                    key={field.key}
                    className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-colors"
                  >
                    {/* Left Column: Label and Key */}
                    <div className="md:col-span-3 flex flex-col justify-start">
                      <div className="flex items-center gap-2 mb-1">
                        {field.type === "image" ? (
                          <ImageIcon size={16} className="text-fsm-red" />
                        ) : field.type === "toggle" ? (
                          <ToggleRight size={16} className="text-green-500" />
                        ) : (
                          <FileText size={16} className="text-fsm-blue" />
                        )}
                        <span className="font-bold text-gray-700 text-sm">
                          {field.key}
                        </span>
                      </div>
                      <span className="text-xs text-gray-700 uppercase tracking-widest">
                        {field.type}
                      </span>
                      <span className="text-[10px] font-bold text-fsm-blue mt-2 block">
                        {field.label}
                      </span>
                    </div>

                    {/* Middle Column: Input Area */}
                    <div className="md:col-span-7">
                      {field.type === "text" ? (
                        <textarea
                          defaultValue={currentValue}
                          className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-fsm-red outline-none min-h-[100px] text-sm text-gray-700 font-medium font-mono"
                          onBlur={(e) => {
                            if (e.target.value !== currentValue) {
                              handleUpdate(field.key, e.target.value, "text");
                            }
                          }}
                        />
                      ) : field.type === "toggle" ? (
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() =>
                              handleUpdate(
                                field.key,
                                currentValue === "true" ? "false" : "true",
                                "toggle",
                              )
                            }
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-fsm-red focus:ring-offset-2 ${currentValue === "true" ? "bg-green-500" : "bg-gray-300"}`}
                          >
                            <span
                              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${currentValue === "true" ? "translate-x-7" : "translate-x-1"}`}
                            />
                          </button>
                          <span className="text-sm font-bold text-gray-700 uppercase">
                            {currentValue === "true"
                              ? "Activado"
                              : "Desactivado"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {currentValue && (
                            <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-200 shadow-inner">
                              <Image
                                src={currentValue}
                                alt={field.key}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <label className="cursor-pointer bg-fsm-blue text-white px-4 py-3 rounded-xl text-xs font-bold text-center hover:bg-fsm-red transition-all shadow-md inline-block w-full">
                            Cambiar Imagen
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleImageUpload(
                                    field.key,
                                    e.target.files[0],
                                  );
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Status */}
                    <div className="md:col-span-2 flex items-center justify-end h-full min-h-[40px]">
                      {loadingMap[field.key] && (
                        <span className="flex items-center gap-2 text-sm font-bold text-fsm-blue animate-pulse">
                          <Loader2 size={16} className="animate-spin" />{" "}
                          Guardando...
                        </span>
                      )}
                      {successMap[field.key] && (
                        <div className="flex flex-col items-center justify-center gap-1">
                          <CheckCircle size={24} className="text-green-500" />
                          <span className="text-[10px] text-green-600 font-bold uppercase tracking-widest">
                            Guardado
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Special Managers */}
              {groupName === "Testimonios" && (
                <div className="mt-12 pt-12 border-t border-gray-100">
                  <div className="mb-8">
                    <h4 className="text-lg font-black text-fsm-blue uppercase flex items-center gap-2">
                      <MessageSquareQuote className="text-fsm-red" size={20} />{" "}
                      Listado de Testimonios
                    </h4>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                      Agrega o edita las voces individuales de tus egresados
                    </p>
                  </div>
                  <TestimonialManager
                    initialTestimonials={initialTestimonials}
                  />
                </div>
              )}

              {groupName === "Horario" && currentSub === "Directorio" && (
                <div className="mt-12 pt-12 border-t border-gray-100">
                  <div className="mb-8">
                    <h4 className="text-lg font-black text-fsm-blue uppercase flex items-center gap-2">
                      <Contact className="text-fsm-red" size={20} /> Directorio
                      Telefónico
                    </h4>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                      Gestiona los contactos de las dependencias
                    </p>
                  </div>
                  <DirectoryManager initialItems={initialDirectoryItems} />
                </div>
              )}

              {groupName === "Programas" && activeCategory === "Oferta Académica" && (
                <div className="mt-12 pt-12 border-t border-gray-100">
                  <div className="mb-8">
                    <h4 className="text-lg font-black text-fsm-blue uppercase flex items-center gap-2">
                      <GraduationCap className="text-fsm-red" size={20} />{" "}
                      Gestión de Programas
                    </h4>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                      Añade, edita o elimina programas técnicos y cursos
                    </p>
                  </div>
                  <ProgramManager initialPrograms={initialPrograms} />
                </div>
              )}

              {groupName === "Encabezado Hero" && currentSub === "Noticias y Eventos" && (
                <div className="mt-12 pt-12 border-t border-gray-100">
                  <div className="mb-8">
                    <h4 className="text-lg font-black text-fsm-blue uppercase flex items-center gap-2">
                      <Newspaper className="text-fsm-red" size={20} /> Gestión
                      de Noticias
                    </h4>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                      Administra los eventos y noticias institucionales
                    </p>
                  </div>
                  <NewsManager news={initialNews} />
                </div>
              )}

              {groupName === "Interface" && currentSub === "Galería" && (
                <div className="mt-12 pt-12 border-t border-gray-100">
                  <div className="mb-8">
                    <h4 className="text-lg font-black text-fsm-blue uppercase flex items-center gap-2">
                      <GalleryIcon className="text-fsm-red" size={20} /> Gestión
                      de Galería
                    </h4>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                      Administra las fotos y el diseño de la galería
                      institucional
                    </p>
                  </div>
                  <GalleryManager galleryItems={initialGallery} />
                </div>
              )}

              {groupName === "Encabezado Hero" && currentSub === "Calendario Académico" && (
                <div className="mt-12 pt-12 border-t border-gray-100">
                  <div className="mb-8">
                    <h4 className="text-lg font-black text-fsm-blue uppercase flex items-center gap-2">
                      <CalendarDays className="text-fsm-red" size={20} /> Gestión
                      de Calendario
                    </h4>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                      Administra las fechas y eventos del cronograma escolar
                    </p>
                  </div>
                  <CalendarManager events={initialCalendar} blogPosts={blogPosts} />
                </div>
              )}

              {groupName === "Encabezado Hero" && currentSub === "Preguntas Frecuentes" && (
                <div className="mt-12 pt-12 border-t border-gray-100">
                  <div className="mb-8">
                    <h4 className="text-lg font-black text-fsm-blue uppercase flex items-center gap-2">
                      <HelpCircle className="text-fsm-red" size={20} /> Gestión
                      de Preguntas (FAQ)
                    </h4>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                      Administra las dudas comunes y sus respuestas
                    </p>
                  </div>
                  <FAQManager faqs={initialFAQs} />
                </div>
              )}

              {groupName === "Categorías de Documentos" && currentSub === "Normatividad" && (
                <div className="mt-12 pt-12 border-t border-gray-100">
                  <div className="mb-8">
                    <h4 className="text-lg font-black text-fsm-blue uppercase flex items-center gap-2">
                      <FileText className="text-fsm-red" size={20} /> Gestión de Documentos Normativos
                    </h4>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                      Administra los documentos PDF y enlaces de normatividad por categorías
                    </p>
                  </div>
                  <NormativityManager
                    initialDocs={initialNormativityDocs}
                    categoryTitles={{
                      norm_cat1: contentMap.norm_cat1_title || '',
                      norm_cat2: contentMap.norm_cat2_title || '',
                      norm_cat3: contentMap.norm_cat3_title || '',
                      norm_cat4: contentMap.norm_cat4_title || '',
                      norm_cat5: contentMap.norm_cat5_title || '',
                      norm_cat6: contentMap.norm_cat6_title || '',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
