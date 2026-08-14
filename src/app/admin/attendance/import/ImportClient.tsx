'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ChevronRight, Upload, FileSpreadsheet, FileText, FileType,
  AlertTriangle, CheckCircle2, XCircle, Loader2, Users, CreditCard, HelpCircle,
} from 'lucide-react';
import {
  parseCsv, filasARegistros, clasificar, bloqueos,
  type Clasificacion, type RegistroPadron,
} from '@/lib/padron';

/**
 * Alta masiva de alumnos desde un fichero.
 *
 * El fichero se lee aquí, en el navegador, y no se sube a ningún sitio hasta que
 * alguien mira la vista previa y confirma. Dos razones, y las dos pesan:
 *
 * Son datos de personas reales. Una importación que escribe en cuanto sueltas el
 * fichero es una importación que se ejecuta dos veces, o que mete 600 filas de
 * una columna mal leída sin que nadie llegue a verlo.
 *
 * Y la técnica: esto se despliega en Cloudflare Workers, con límite de memoria y
 * de CPU por petición. Un Excel de 618 alumnos parseado en el servidor va justo;
 * parseado en el navegador, el servidor solo recibe JSON ya limpio.
 */

const LOTE = 100;

type Estado =
  | { fase: 'vacio' }
  | { fase: 'leyendo'; nombre: string }
  | { fase: 'listo'; nombre: string; clase: Clasificacion }
  | { fase: 'guardando'; nombre: string; clase: Clasificacion; hechos: number; total: number }
  | { fase: 'hecho'; nombre: string; creados: number; actualizados: number }
  | { fase: 'error'; mensaje: string };

/** Lo que trae un Excel, hoja por hoja, como si fuera un CSV. */
async function leerExcel(file: File): Promise<string[][]> {
  const XLSX = await import('xlsx');
  const libro = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  // raw:false para que las fechas y los números lleguen como los ve el usuario en
  // Excel. Un "Tarjeta Nro." leído como número perdería los ceros de la izquierda
  // y, peor, podría salir en notación científica.
  return XLSX.utils.sheet_to_json<string[]>(hoja, { header: 1, raw: false, defval: '' });
}

/**
 * Un PDF no es una tabla: es texto con coordenadas.
 *
 * Aquí se reconstruye la rejilla agrupando por la altura de cada fragmento --
 * lo que está a la misma altura es la misma fila -- y ordenando por la
 * horizontal. Funciona con las tablas que exporta un terminal, y no funciona
 * con un PDF escaneado, que es una foto y no lleva texto ninguno.
 *
 * Por eso el PDF pasa por la misma vista previa que los demás: si la rejilla
 * sale mal, se ve antes de escribir y no se confirma.
 */
async function leerPdf(file: File): Promise<string[][]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const filas: string[][] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const pagina = await doc.getPage(p);
    const contenido = await pagina.getTextContent();

    const porAltura = new Map<number, Array<{ x: number; texto: string }>>();
    for (const item of contenido.items as Array<{ str: string; transform: number[] }>) {
      if (!item.str.trim()) continue;
      // Se redondea porque dos fragmentos de la misma línea rara vez comparten
      // la altura al decimal: basta con que caigan en la misma banda de 2 puntos.
      const y = Math.round(item.transform[5] / 2) * 2;
      if (!porAltura.has(y)) porAltura.set(y, []);
      porAltura.get(y)!.push({ x: item.transform[4], texto: item.str });
    }

    // De arriba abajo: en un PDF la Y crece hacia arriba, al revés que la página.
    const alturas = [...porAltura.keys()].sort((a, b) => b - a);
    for (const y of alturas) {
      const celdas = porAltura.get(y)!.sort((a, b) => a.x - b.x).map((c) => c.texto.trim());
      if (celdas.length) filas.push(celdas);
    }
  }

  return filas;
}

export default function ImportClient() {
  const [estado, setEstado] = React.useState<Estado>({ fase: 'vacio' });
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function elegir(file: File | undefined) {
    if (!file) return;
    setEstado({ fase: 'leyendo', nombre: file.name });
    try {
      const ext = file.name.toLowerCase().split('.').pop() ?? '';
      let filas: string[][];
      if (ext === 'xlsx' || ext === 'xls') filas = await leerExcel(file);
      else if (ext === 'pdf') filas = await leerPdf(file);
      // El BOM que Excel deja al guardar como CSV se cuela en la primera
      // cabecera y hace que "Usuario Nro." deje de reconocerse.
      else filas = parseCsv((await file.text()).replace(/^﻿/, ''));

      const { registros, columnasNoReconocidas, faltanColumnas, sinColumnaTarjeta } =
        filasARegistros(filas);
      setEstado({
        fase: 'listo',
        nombre: file.name,
        clase: clasificar(registros, { columnasNoReconocidas, faltanColumnas, sinColumnaTarjeta }),
      });
    } catch (e: any) {
      setEstado({ fase: 'error', mensaje: e?.message ?? String(e) });
    }
  }

  async function guardar(clase: Clasificacion, nombre: string) {
    const guardables = clase.conTarjeta.concat(clase.sinTarjeta);
    setEstado({ fase: 'guardando', nombre, clase, hechos: 0, total: guardables.length });

    let creados = 0;
    let actualizados = 0;
    try {
      for (let i = 0; i < guardables.length; i += LOTE) {
        const lote = guardables.slice(i, i + LOTE);
        const res = await fetch('/api/students/import', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ registros: lote }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(
            [json?.error, ...(json?.razones ?? [])].filter(Boolean).join(' — ') || 'Error al guardar',
          );
        }
        creados += json.creados ?? 0;
        actualizados += json.actualizados ?? 0;
        setEstado({ fase: 'guardando', nombre, clase, hechos: Math.min(i + LOTE, guardables.length), total: guardables.length });
      }
      setEstado({ fase: 'hecho', nombre, creados, actualizados });
    } catch (e: any) {
      // Se dice cuántos entraron antes de fallar: sin ese número, quien lo lea no
      // sabe si repetir la importación duplicará a nadie. (No lo hará -- el alta
      // actualiza por Usuario Nro. -- pero eso hay que poder deducirlo.)
      setEstado({
        fase: 'error',
        mensaje: `${e?.message ?? String(e)}. Se guardaron ${creados + actualizados} alumnos antes del fallo; volver a subir el mismo fichero es seguro, actualiza en vez de duplicar.`,
      });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500">
        <Link href="/admin" className="hover:text-fsm-red transition-colors flex items-center gap-2">
          <ArrowLeft size={14} /> Panel
        </Link>
        <ChevronRight size={14} />
        <Link href="/admin/attendance" className="hover:text-fsm-red transition-colors">
          Control de Asistencia
        </Link>
        <ChevronRight size={14} />
        <span className="text-fsm-blue">Subir Alumnos</span>
      </div>

      <div>
        <h1 className="text-3xl font-black text-fsm-blue uppercase tracking-tighter mb-2">SUBIR ALUMNOS EN BLOQUE</h1>
        <p className="text-gray-900 font-medium">
          Carga un listado de alumnos desde Excel, CSV o PDF. Nada se guarda hasta que revises la vista previa.
        </p>
      </div>

      {/* --- selector de fichero --- */}
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-premium">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.pdf,text/csv"
          className="hidden"
          onChange={(e) => elegir(e.target.files?.[0])}
        />
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); elegir(e.dataTransfer.files?.[0]); }}
          className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center cursor-pointer hover:border-fsm-blue transition-colors"
        >
          <Upload className="mx-auto mb-3 text-fsm-blue" size={28} />
          <p className="font-black text-fsm-blue uppercase tracking-widest text-xs mb-1">
            Arrastra el fichero o haz clic
          </p>
          <p className="text-gray-500 text-sm">Excel (.xlsx), CSV o PDF</p>
          <div className="flex items-center justify-center gap-6 mt-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            <span className="flex items-center gap-1"><FileSpreadsheet size={12} /> Excel</span>
            <span className="flex items-center gap-1"><FileText size={12} /> CSV</span>
            <span className="flex items-center gap-1"><FileType size={12} /> PDF</span>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-600 space-y-1">
          <p className="font-bold text-fsm-blue text-xs uppercase tracking-widest mb-2">Columnas que se reconocen</p>
          <p><b>Obligatorias:</b> Nombre y Usuario Nro.</p>
          <p><b>Opcionales:</b> Tarjeta Nro., Posición (curso), Departamento, Género (rol), ID en dispositivo, Teléfono, Domicilio, Dispositivos.</p>
          <p className="text-gray-500 pt-2">
            Sirve la exportación del terminal de control de acceso tal cual, sin tocar nada.
            Volver a subir el mismo fichero <b>actualiza</b> a quien ya exista; no duplica.
          </p>
        </div>
      </div>

      {estado.fase === 'leyendo' && (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-premium flex items-center gap-3">
          <Loader2 className="animate-spin text-fsm-blue" size={20} />
          <span className="font-medium text-gray-900">Leyendo {estado.nombre}…</span>
        </div>
      )}

      {estado.fase === 'error' && (
        <div className="bg-red-50 p-6 rounded-[2rem] border border-red-200 flex items-start gap-3">
          <XCircle className="text-fsm-red shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-black text-fsm-red uppercase tracking-widest text-xs mb-1">No se pudo</p>
            <p className="text-gray-900">{estado.mensaje}</p>
          </div>
        </div>
      )}

      {estado.fase === 'hecho' && (
        <div className="bg-green-50 p-6 rounded-[2rem] border border-green-200 flex items-start gap-3">
          <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-black text-green-700 uppercase tracking-widest text-xs mb-1">Importación terminada</p>
            <p className="text-gray-900">
              <b>{estado.creados}</b> alumnos nuevos y <b>{estado.actualizados}</b> actualizados desde {estado.nombre}.
            </p>
            <Link href="/admin/attendance" className="inline-block mt-3 text-fsm-blue font-bold text-xs uppercase tracking-widest hover:text-fsm-red">
              Volver a asistencia →
            </Link>
          </div>
        </div>
      )}

      {(estado.fase === 'listo' || estado.fase === 'guardando') && (
        <Preview
          clase={estado.clase}
          nombre={estado.nombre}
          guardando={estado.fase === 'guardando'}
          progreso={estado.fase === 'guardando' ? { hechos: estado.hechos, total: estado.total } : null}
          onConfirmar={() => guardar(estado.clase, estado.nombre)}
        />
      )}
    </div>
  );
}

function Preview({
  clase, nombre, guardando, progreso, onConfirmar,
}: {
  clase: Clasificacion;
  nombre: string;
  guardando: boolean;
  progreso: { hechos: number; total: number } | null;
  onConfirmar: () => void;
}) {
  const razones = bloqueos(clase);
  const guardables = clase.conTarjeta.length + clase.sinTarjeta.length;
  const muestra = clase.conTarjeta.concat(clase.sinTarjeta).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Tarjeta icono={<Users size={22} />} rotulo="Filas leídas" valor={clase.registros.length} />
        <Tarjeta icono={<CreditCard size={22} />} rotulo="Con tarjeta" valor={clase.conTarjeta.length} />
        <Tarjeta icono={<HelpCircle size={22} />} rotulo="Sin tarjeta" valor={clase.sinTarjeta.length} />
        <Tarjeta icono={<AlertTriangle size={22} />} rotulo="Con problemas" valor={clase.problemas.length} alerta={clase.problemas.length > 0} />
      </div>

      {razones.length > 0 && (
        <div className="bg-red-50 p-6 rounded-[2rem] border border-red-200">
          <p className="font-black text-fsm-red uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
            <XCircle size={14} /> No se puede importar todavía
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-900">
            {razones.map((r) => <li key={r}>{r}</li>)}
          </ul>
          {clase.duplicadas.length > 0 && (
            <div className="mt-4 text-sm text-gray-700">
              <p className="font-bold mb-1">Tarjetas repartidas entre varias personas:</p>
              {clase.duplicadas.slice(0, 8).map((d) => (
                <p key={d.tarjeta} className="font-mono text-xs">{d.tarjeta}: {d.nombres.join('  |  ')}</p>
              ))}
              <p className="mt-2 text-gray-600">
                Dos personas con la misma tarjeta significa que una abriría la puerta a nombre de la otra.
                Hay que corregirlo en el fichero antes de subirlo.
              </p>
            </div>
          )}
          {clase.usuariosRepetidos.length > 0 && (
            <div className="mt-4 text-sm text-gray-700">
              <p className="font-bold mb-1">Usuario Nro. repetidos:</p>
              {clase.usuariosRepetidos.slice(0, 8).map((u) => (
                <p key={u.usuario} className="font-mono text-xs">{u.usuario}: {u.nombres.join('  |  ')}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Una columna ausente no aparece en columnasNoReconocidas -- ahí solo caen
          las que vienen y no se saben leer -- así que sin este aviso el fichero
          se veía impecable y el recuento "Sin tarjeta" era el único rastro. */}
      {clase.sinColumnaTarjeta && (
        <div className="bg-amber-50 p-5 rounded-[2rem] border border-amber-200 text-sm text-gray-900">
          <p className="font-black text-amber-700 uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
            <AlertTriangle size={14} /> Este fichero no trae columna de tarjeta
          </p>
          <p className="text-gray-600">
            Los {clase.sinTarjeta.length} alumnos aparecen como «sin tarjeta» porque el fichero no
            dice nada de tarjetas, no porque no la tengan. Se importarán nombres, cursos y datos de
            contacto, y <b>las tarjetas que ya estén asignadas se conservan</b>. Si querías
            actualizarlas, la columna se llama «Tarjeta Nro.».
          </p>
        </div>
      )}

      {clase.columnasNoReconocidas.length > 0 && (
        <div className="bg-amber-50 p-5 rounded-[2rem] border border-amber-200 text-sm text-gray-900">
          <p className="font-black text-amber-700 uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
            <AlertTriangle size={14} /> Columnas que no se han sabido leer
          </p>
          <p className="font-mono text-xs mb-2">{clase.columnasNoReconocidas.join('  ·  ')}</p>
          <p className="text-gray-600">
            Se van a ignorar. Si alguna de ellas era importante, renómbrala en el fichero
            a uno de los nombres reconocidos y vuelve a subirlo.
          </p>
        </div>
      )}

      {clase.problemas.length > 0 && (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-premium">
          <p className="font-black text-fsm-blue uppercase tracking-widest text-xs mb-3">
            Filas que se van a saltar ({clase.problemas.length})
          </p>
          <div className="max-h-56 overflow-y-auto text-sm">
            {clase.problemas.slice(0, 60).map((p, i) => (
              <div key={i} className="flex gap-3 py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-400 font-mono text-xs w-16 shrink-0">fila {p.fila}</span>
                <span className="text-gray-900 flex-1">{p.nombre}</span>
                <span className="text-fsm-red text-xs">{p.por}</span>
              </div>
            ))}
          </div>
          {clase.problemas.length > 60 && (
            <p className="text-gray-500 text-xs mt-2">…y {clase.problemas.length - 60} más.</p>
          )}
        </div>
      )}

      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-premium">
        <p className="font-black text-fsm-blue uppercase tracking-widest text-xs mb-4">
          Vista previa — primeras {muestra.length} de {guardables}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-100">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Curso</th>
                <th className="py-2 pr-4">Usuario</th>
                <th className="py-2 pr-4">Tarjeta</th>
              </tr>
            </thead>
            <tbody>
              {muestra.map((r, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-4 text-gray-900 font-medium">{r.nombre}</td>
                  <td className="py-2 pr-4 text-gray-600">{r.curso || '—'}</td>
                  <td className="py-2 pr-4 text-gray-600 font-mono text-xs">{r.usuarioNro}</td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {r.tarjetaNum ?? <span className="text-amber-600">sin tarjeta</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {clase.cursos.length > 0 && (
          <p className="text-gray-500 text-xs mt-4">
            <b>{clase.cursos.length} cursos distintos:</b> {clase.cursos.slice(0, 12).join(' · ')}
            {clase.cursos.length > 12 && ' …'}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onConfirmar}
          disabled={razones.length > 0 || guardando}
          className="px-6 py-3 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all shadow-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-fsm-blue"
        >
          {guardando
            ? <><Loader2 className="animate-spin" size={14} /> Guardando {progreso?.hechos} de {progreso?.total}…</>
            : <><Upload size={14} /> Importar {guardables} alumnos</>}
        </button>
        <span className="text-gray-500 text-sm">desde {nombre}</span>
      </div>

      {clase.sinTarjeta.length > 0 && razones.length === 0 && !clase.sinColumnaTarjeta && (
        <p className="text-gray-600 text-sm">
          {clase.sinTarjeta.length} alumnos entrarán <b>sin tarjeta asignada</b> (los que ya tengan
          una la conservan). Se les puede asignar una después desde <Link href="/admin/attendance/enrollment" className="text-fsm-blue font-bold hover:text-fsm-red">Vincular Tarjetas</Link>.
        </p>
      )}
    </div>
  );
}

function Tarjeta({ icono, rotulo, valor, alerta }: {
  icono: React.ReactNode; rotulo: string; valor: number; alerta?: boolean;
}) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-premium flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
        alerta ? 'bg-fsm-red/5 text-fsm-red' : 'bg-fsm-blue/5 text-fsm-blue'}`}>
        {icono}
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">{rotulo}</p>
        <h3 className={`text-2xl font-black leading-none ${alerta ? 'text-fsm-red' : 'text-fsm-blue'}`}>{valor}</h3>
      </div>
    </div>
  );
}
