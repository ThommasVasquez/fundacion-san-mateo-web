/**
 * Lectura y validación de un padrón de alumnos.
 *
 * Es la misma lógica que `scripts/importar_padron.mjs`, que ya se usó para
 * meter los 618 alumnos del instituto. Vive aquí para que la página de
 * importación y la ruta de API compartan un solo criterio: si el navegador
 * acepta una fila y el servidor la rechaza, el usuario ve una vista previa que
 * no se parece a lo que acaba guardado, y ese desajuste no se descubre hasta
 * que alguien no puede entrar por la puerta.
 *
 * Sobre el número de tarjeta, que es lo delicado:
 *
 * El terminal exporta el ID de 32 bits en decimal. El lector reporta cinco
 * bytes, y el primero -- el byte de versión -- no forma parte de ese número y no
 * es constante (en las tarjetas medidas vale 4F, 59, 54). Así que desde el
 * decimal del padrón NO se puede reconstruir el UID que el lector va a leer.
 * Por eso la clave de cruce es el propio decimal.
 */

export interface RegistroPadron {
  usuarioNro: string;
  idDispositivo: string;
  tarjeta: string;
  nombre: string;
  departamento: string;
  rol: string;
  curso: string;
  cumpleanos: string | null;
  inicioPracticas: string | null;
  telefono: string | null;
  domicilio: string | null;
  dispositivos: string | null;
  /** Se rellena al clasificar; null cuando el terminal marcó "sin tarjeta". */
  tarjetaNum?: number | null;
}

export interface Problema {
  fila: number;
  nombre: string;
  por: string;
}

export interface Clasificacion {
  registros: RegistroPadron[];
  conTarjeta: RegistroPadron[];
  sinTarjeta: RegistroPadron[];
  problemas: Problema[];
  duplicadas: Array<{ tarjeta: number; nombres: string[] }>;
  usuariosRepetidos: Array<{ usuario: string; nombres: string[] }>;
  cursos: string[];
  columnasNoReconocidas: string[];
  faltanColumnas: string[];
}

/** Un CSV con comas dentro de campos entrecomillados; suficiente para este. */
export function parseCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let campo = '';
  let fila: string[] = [];
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ',' || c === ';') { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}

/**
 * Nombres en MAYÚSCULAS y con dobles espacios, tal como los escupe el terminal.
 * Se normaliza el espaciado pero se respetan las mayúsculas: convertirlas a
 * capitalización adivinaría dónde va cada tilde y cada partícula, y una lista de
 * alumnos no es sitio para adivinar cómo se escribe el apellido de nadie.
 */
const limpiarNombre = (s: string) => s.replace(/\s+/g, ' ').trim();

/** "3  SABADO A" y "3 SABADO  A" son el mismo curso escrito dos veces. */
const limpiarCurso = (s: string) => s.replace(/\s+/g, ' ').trim().toUpperCase();

/**
 * Cabeceras sin tildes, sin puntos y en minúsculas.
 *
 * El fichero puede venir del terminal, de un Excel que alguien reguardó o de
 * una exportación con la codificación cambiada, y "Tarjeta Nro.", "TARJETA NRO"
 * y "tarjeta nro" son la misma columna. Comparar los nombres tal cual obligaría
 * a que coincidieran hasta en el punto final.
 */
const normalizarCabecera = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.\s_]+/g, ' ').trim().toLowerCase();

/**
 * Qué columna es cada cosa.
 *
 * Los alias existen porque la cabecera del terminal miente en dos sitios: dice
 * "Género" y trae el rol ("Estudiante"), y dice "Posición" y trae el curso. Se
 * leen por lo que contienen, no por su etiqueta -- y se aceptan además los
 * nombres sensatos, para quien prepare el fichero a mano.
 */
const COLUMNAS: Record<keyof Omit<RegistroPadron, 'tarjetaNum'>, string[]> = {
  usuarioNro:      ['usuario nro', 'usuario', 'no usuario', 'numero de usuario'],
  idDispositivo:   ['id en dispositivo', 'id dispositivo'],
  tarjeta:         ['tarjeta nro', 'tarjeta', 'numero de tarjeta', 'no tarjeta'],
  nombre:          ['nombre', 'nombres', 'nombre completo', 'alumno', 'estudiante'],
  departamento:    ['departamento', 'sede'],
  rol:             ['genero', 'rol', 'tipo'],
  curso:           ['posicion', 'curso', 'grado', 'programa'],
  cumpleanos:      ['cumpleanos', 'fecha de nacimiento', 'nacimiento'],
  inicioPracticas: ['fecha de inicio laboral', 'inicio laboral', 'fecha de inicio'],
  telefono:        ['telefono', 'celular', 'movil'],
  domicilio:       ['domicilio', 'direccion'],
  dispositivos:    ['dispositivos', 'dispositivo'],
};

/** Sin estas dos no hay padrón que valga: una fila sin ellas no identifica a nadie. */
const OBLIGATORIAS: Array<keyof typeof COLUMNAS> = ['nombre', 'usuarioNro'];

export function filasARegistros(filas: string[][]): {
  registros: RegistroPadron[];
  columnasNoReconocidas: string[];
  faltanColumnas: string[];
} {
  const utiles = filas.filter((f) => f.some((c) => (c ?? '').trim()));
  if (utiles.length === 0) {
    return { registros: [], columnasNoReconocidas: [], faltanColumnas: [...OBLIGATORIAS] };
  }

  const [cabecera, ...cuerpo] = utiles;
  const normalizadas = cabecera.map((c) => normalizarCabecera(c ?? ''));

  const indice = {} as Record<keyof typeof COLUMNAS, number>;
  const usados = new Set<number>();
  for (const clave of Object.keys(COLUMNAS) as Array<keyof typeof COLUMNAS>) {
    const i = normalizadas.findIndex((n) => COLUMNAS[clave].includes(n));
    indice[clave] = i;
    if (i >= 0) usados.add(i);
  }

  // Se avisa de lo que no se ha sabido leer en vez de descartarlo en silencio:
  // una columna con un nombre inesperado suele ser justamente la que importa.
  const columnasNoReconocidas = cabecera
    .map((c, i) => (usados.has(i) || !(c ?? '').trim() ? null : c.trim()))
    .filter((c): c is string => c !== null);

  const faltanColumnas = OBLIGATORIAS.filter((c) => indice[c] < 0);

  const dato = (f: string[], clave: keyof typeof COLUMNAS) =>
    indice[clave] >= 0 ? (f[indice[clave]] ?? '').trim() : '';

  const registros = cuerpo.map((f) => ({
    usuarioNro: dato(f, 'usuarioNro'),
    idDispositivo: dato(f, 'idDispositivo'),
    tarjeta: dato(f, 'tarjeta'),
    nombre: limpiarNombre(dato(f, 'nombre')),
    departamento: dato(f, 'departamento'),
    rol: dato(f, 'rol'),
    curso: limpiarCurso(dato(f, 'curso')),
    cumpleanos: dato(f, 'cumpleanos') || null,
    inicioPracticas: dato(f, 'inicioPracticas') || null,
    telefono: dato(f, 'telefono') || null,
    domicilio: dato(f, 'domicilio') || null,
    dispositivos: dato(f, 'dispositivos') || null,
  }));

  return { registros, columnasNoReconocidas, faltanColumnas };
}

export function clasificar(
  registros: RegistroPadron[],
  extra: { columnasNoReconocidas?: string[]; faltanColumnas?: string[] } = {},
): Clasificacion {
  const conTarjeta: RegistroPadron[] = [];
  const sinTarjeta: RegistroPadron[] = [];
  const problemas: Problema[] = [];

  registros.forEach((r, i) => {
    // +2: la cabecera es la fila 1, y las hojas de cálculo cuentan desde 1. El
    // número tiene que servir para abrir el fichero y mirar esa línea.
    const fila = i + 2;
    if (!r.nombre) { problemas.push({ fila, nombre: '(sin nombre)', por: 'sin nombre' }); return; }
    if (!r.usuarioNro) { problemas.push({ fila, nombre: r.nombre, por: 'sin Usuario Nro.' }); return; }

    // Una celda de tarjeta vacía es lo mismo que un cero: nadie le asignó una.
    const tarjeta = r.tarjeta === '' ? '0' : r.tarjeta;
    if (!/^\d+$/.test(tarjeta)) {
      problemas.push({ fila, nombre: r.nombre, por: `tarjeta no numérica: "${r.tarjeta}"` });
      return;
    }

    const num = Number(tarjeta);
    // Cero es como el terminal marca "sin tarjeta asignada". No es un error: son
    // los que habrá que matricular a mano junto al lector.
    if (num === 0) { sinTarjeta.push({ ...r, tarjetaNum: null }); return; }

    // El ID de un EM4100 son 32 bits. Por encima de eso el dato no puede venir
    // de una tarjeta de estas, así que se aparta en vez de importarse.
    if (num > 0xFFFFFFFF) {
      problemas.push({ fila, nombre: r.nombre, por: `fuera del rango de 32 bits: ${num}` });
      return;
    }

    conTarjeta.push({ ...r, tarjetaNum: num });
  });

  // Un número de tarjeta en dos personas significa que una de las dos abrirá la
  // puerta a nombre de la otra. Se detecta antes de escribir, no después.
  const porTarjeta = new Map<number, string[]>();
  for (const r of conTarjeta) {
    const n = r.tarjetaNum as number;
    if (!porTarjeta.has(n)) porTarjeta.set(n, []);
    porTarjeta.get(n)!.push(r.nombre);
  }
  const duplicadas = [...porTarjeta.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([tarjeta, nombres]) => ({ tarjeta, nombres }));

  const porUsuario = new Map<string, string[]>();
  for (const r of registros) {
    if (!r.usuarioNro) continue;
    if (!porUsuario.has(r.usuarioNro)) porUsuario.set(r.usuarioNro, []);
    porUsuario.get(r.usuarioNro)!.push(r.nombre);
  }
  const usuariosRepetidos = [...porUsuario.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([usuario, nombres]) => ({ usuario, nombres }));

  const cursos = [...new Set(registros.map((r) => r.curso).filter(Boolean))].sort();

  return {
    registros,
    conTarjeta,
    sinTarjeta,
    problemas,
    duplicadas,
    usuariosRepetidos,
    cursos,
    columnasNoReconocidas: extra.columnasNoReconocidas ?? [],
    faltanColumnas: extra.faltanColumnas ?? [],
  };
}

/**
 * ¿Se puede escribir esto?
 *
 * Un duplicado no es un aviso que se pueda aceptar y seguir: dos personas con la
 * misma tarjeta es una puerta que se abre a nombre de quien no es, y dos filas
 * con el mismo Usuario Nro. se pisan la una a la otra en el INSERT sin que
 * ninguna de las dos avise. Se para antes de tocar la base.
 */
export function bloqueos(c: Clasificacion): string[] {
  const razones: string[] = [];
  if (c.faltanColumnas.length) {
    razones.push(`Faltan columnas obligatorias: ${c.faltanColumnas.join(', ')}`);
  }
  if (c.duplicadas.length) {
    razones.push(`${c.duplicadas.length} número(s) de tarjeta repartidos entre varias personas`);
  }
  if (c.usuariosRepetidos.length) {
    razones.push(`${c.usuariosRepetidos.length} Usuario Nro. repetido(s)`);
  }
  if (c.conTarjeta.length + c.sinTarjeta.length === 0) {
    razones.push('No hay ninguna fila aprovechable');
  }
  return razones;
}
