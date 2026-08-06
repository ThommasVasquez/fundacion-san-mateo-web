import React from 'react';
import ImportClient from './ImportClient';

/**
 * El trabajo entero ocurre en el navegador -- leer el fichero, clasificarlo y
 * enseñar la vista previa -- así que esta página solo existe para colgar el
 * componente de cliente dentro de /admin, que es lo que exige la sesión.
 */
export const metadata = {
  title: 'Subir alumnos en bloque',
};

export default function ImportPage() {
  return <ImportClient />;
}
