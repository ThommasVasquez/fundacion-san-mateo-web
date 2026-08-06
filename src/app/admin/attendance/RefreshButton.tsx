'use client';

import React, { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

/**
 * El "Actualizar" de la barra de filtros.
 *
 * Sigue siendo el submit del formulario: sin JavaScript, o antes de que hidrate,
 * el clic hace el GET de siempre y la pagina se recarga entera. Con JavaScript
 * hacemos nosotros la navegacion dentro de una transicion, que es lo unico que
 * nos deja saber cuando termina: la pagina es `force-dynamic` y no tiene
 * loading.js, asi que el servidor tarda lo que tarden las consultas y hasta
 * entonces no habia ninguna senal de que el clic hubiera hecho algo.
 *
 * Mientras dura, las flechas del icono giran. Paran solas cuando el HTML nuevo
 * ya esta pintado, no antes: lo que gira es la espera real, no una animacion de
 * duracion fija que podria acabar mientras la tabla sigue siendo la vieja.
 */
export default function RefreshButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form;
    if (!form) return;
    event.preventDefault();

    // Mismas reglas que un GET nativo -- los checkbox sin marcar no viajan --,
    // asi que la URL que construimos aqui es la que habria puesto el navegador.
    const query = new URLSearchParams(
      Array.from(new FormData(form), ([name, value]) => [name, String(value)])
    ).toString();
    const target = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      // Si no se ha tocado ningun filtro no hay ruta nueva a la que ir, y un
      // push a la misma URL no obliga al servidor a nada: las flechas girarian
      // un instante para volver a dejar los datos de hace media hora. refresh()
      // si vuelve a ejecutar el componente de servidor.
      if (target === `${window.location.pathname}${window.location.search}`) {
        router.refresh();
      } else {
        // Sin saltar arriba: quien actualiza suele estar mirando una fila.
        router.push(target, { scroll: false });
      }
    });
  };

  return (
    <button
      type="submit"
      onClick={handleClick}
      disabled={isPending}
      aria-busy={isPending}
      className="px-6 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all flex items-center gap-2 disabled:cursor-wait disabled:hover:bg-fsm-blue"
    >
      <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
      Actualizar
    </button>
  );
}
