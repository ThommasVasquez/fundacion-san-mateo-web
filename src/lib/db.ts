/**
 * La base del colegio, que ya no está en Neon.
 *
 * Había dos censos de alumnos en dos bases distintas: `students` aquí, con el
 * padrón de verdad, y `users` en el Postgres de la puerta, con los que se
 * matricularon desde una app. La web leía la primera y la app de escritorio la
 * segunda, así que cada una enseñaba una lista y las dos tenían razón sobre su
 * propia base. Ahora hay una sola base -- la de la puerta -- y las dos leen de
 * ella.
 *
 * Lo que no cambia es la forma de preguntar. Este módulo sigue exportando `sql`
 * con la misma interfaz que daba `@neondatabase/serverless`, así que las casi
 * doscientas consultas repartidas por el resto del proyecto siguen escritas
 * igual, sin tocar una coma. Lo único que cambia es a qué servidor van.
 *
 * Y va por HTTP porque tiene que ir: esto corre en un Worker de Cloudflare, que
 * no puede abrir un socket de Postgres contra el equipo del colegio -- solo se
 * llega por el túnel, y el túnel habla HTTPS. Es exactamente lo que hacía el
 * driver de Neon, que también era SQL sobre HTTPS con una credencial que abre la
 * base entera; cambia el destino, no el mecanismo ni lo que hay que proteger.
 */

/** El backend de la puerta, p. ej. https://entrada.conjuntos.app */
function backendUrl(): string {
  const url = process.env.BACKEND_URL;
  if (!url) throw new Error('BACKEND_URL environment variable is not defined');
  return url.replace(/\/+$/, '');
}

function webDbKey(): string {
  const key = process.env.WEB_DB_KEY;
  if (!key) throw new Error('WEB_DB_KEY environment variable is not defined');
  return key;
}

/**
 * Una consulta ya escrita, todavía sin mandar.
 *
 * Se manda al esperarla, no al escribirla, que es lo que hacía el driver de
 * Neon y lo que permite las dos cosas que el proyecto ya daba por hechas: meter
 * varias en un `Promise.all` y, sobre todo, meter una dentro de otra como un
 * trozo de SQL más -- ver `desdePlantilla`.
 */
class ConsultaSql implements PromiseLike<any[]> {
  #enviada: Promise<any[]> | undefined;

  constructor(
    readonly text: string,
    readonly params: unknown[],
  ) {}

  #enviar(): Promise<any[]> {
    this.#enviada ??= ejecutar(this.text, this.params);
    return this.#enviada;
  }

  then<A = any[], B = never>(
    ok?: ((filas: any[]) => A | PromiseLike<A>) | null,
    mal?: ((error: unknown) => B | PromiseLike<B>) | null,
  ): Promise<A | B> {
    return this.#enviar().then(ok, mal);
  }

  catch<B = never>(mal?: ((error: unknown) => B | PromiseLike<B>) | null): Promise<any[] | B> {
    return this.#enviar().catch(mal);
  }

  finally(alFinal?: (() => void) | null): Promise<any[]> {
    return this.#enviar().finally(alFinal);
  }
}

/**
 * Una plantilla etiquetada se convierte en el texto con $1, $2... y la lista de
 * valores aparte. Es lo que hacía Neon y por la misma razón: así un nombre con
 * una comilla sigue siendo un nombre y no se convierte en SQL.
 *
 * Con una excepción, que también es de Neon: si lo interpolado es otra consulta
 * -- `${filtro ? sql`AND g.nombre = ${filtro}` : sql``}` -- no es un valor, es
 * un trozo de SQL. Entra su texto, con sus $ renumerados detrás de los que ya
 * había, y sus valores al final de la lista. Tratarlo como un valor es lo que
 * dejaba un `$5` suelto donde tenía que ir una condición, y Postgres respondía
 * lo único que podía: syntax error at or near "$5".
 */
function desdePlantilla(
  strings: TemplateStringsArray,
  valores: unknown[],
): { text: string; params: unknown[] } {
  let text = '';
  const params: unknown[] = [];
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i >= valores.length) continue;

    const valor = valores[i];
    if (valor instanceof ConsultaSql) {
      // Los suyos empiezan en $1; aquí van detrás de los que ya se han contado.
      text += valor.text.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + params.length}`);
      params.push(...valor.params);
    } else {
      params.push(valor);
      text += `$${params.length}`;
    }
  }
  return { text, params };
}

async function ejecutar(text: string, params: unknown[]): Promise<any[]> {
  const respuesta = await fetch(`${backendUrl()}/db/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-web-db-key': webDbKey(),
    },
    body: JSON.stringify({ text, params }),
    // Next cachearía por su cuenta un fetch de servidor, y una lista de alumnos
    // servida desde la caché es justamente el problema que esto viene a
    // arreglar: alguien matricula, y la página sigue enseñando la lista de
    // antes sin que se vea por qué.
    cache: 'no-store',
  });

  if (!respuesta.ok) {
    // El mensaje de Postgres viaja entero porque al otro lado hay páginas que ya
    // sabían leerlo: la importación de padrón distingue un duplicado de un fallo
    // de conexión por el texto del error, y resumirlo aquí la dejaría diciendo
    // "error al guardar" sin poder decir cuál.
    const cuerpo: any = await respuesta.json().catch(() => ({}));
    throw new Error(cuerpo?.error?.message ?? cuerpo?.error ?? `db/query ${respuesta.status}`);
  }

  const { rows } = (await respuesta.json()) as { rows: any[] };
  return rows;
}

/**
 * Las dos formas de llamar que usa el proyecto, y solo esas dos:
 *
 *   sql`SELECT ... WHERE id = ${id}`   la plantilla etiquetada, 101 sitios
 *   sql.query(texto, [params])         una sola vez, en lib/alumnos.ts
 *
 * Las dos devuelven el array de filas, que es lo que devolvía `neon()` con
 * fullResults en false y lo que espera quien las consume.
 */
export const sql = new Proxy(function () {} as any, {
  apply(_target, _thisArg, args: any[]) {
    const [strings, ...valores] = args;
    const { text, params } = desdePlantilla(strings as TemplateStringsArray, valores);
    return new ConsultaSql(text, params);
  },
  get(_target, prop: string) {
    if (prop === 'query') {
      return (text: string, params: unknown[] = []) => ejecutar(text, params);
    }
    return undefined;
  },
}) as any;
