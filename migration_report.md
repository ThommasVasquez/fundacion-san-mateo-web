# Informe de Migración de Asistencia (ETL)

**Fecha de Ejecución:** 26/8/2026, 3:53:14 p. m.  
**Archivo Fuente:** `ASISTENCIA___2026-2.xlsx`

---

## 📊 Métricas Generales de Migración

- **Total Estudiantes Únicos Normalizados:** 454
- **Total Grupos Registrados:** 18
- **Total Sesiones de Clase Creadas:** 2366
- **Total Registros de Asistencia Insertados:** 58557
- **Hojas Vacías de Instructores Omitidas:** 5 (`ANDREA MARTINEZ`, `YESICA LOPEZ`, `CAMILA BARRETO`, `MARIBEL GONZALEZ `, `JULIAN SACRISTAN`)

---

## 🔀 Estudiantes Detectados en Múltiples Grupos (Multimatrícula / Transferencias: 7)

- **OSMA MORENO DEYSY JASBLEIDY**: Matriculado en `II AIPI`, `II NOCHE A`
- **NIÑO LOPEZ LEIDY CAROLINA**: Matriculado en `III DIURNO A`, `III NOCHE A`
- **VARGAS GARAY LAURA XIMENA**: Matriculado en `III DIURNO A`, `I SABADO CB`, `I DIURNO A CB`, `I DIURNO B CB`
- **QUILINDO QUILINDO ANYELA TATIANA**: Matriculado en `III NOCHE A`, `III SABADO B`
- **SIERRA HOLGUIN ELIANA SOFIA**: Matriculado en `III NOCHE A`, `II SABADO A`
- **CONTRERAS MORALES LEYDI TATIANA**: Matriculado en `III SABADO B`, `II SABADO A`
- **ESTACIO FLOREZ LEGUIS MICHAEL**: Matriculado en `III SABADO B`, `II SABADO A`

---

## ⚠️ Discrepancias Encontradas entre Día de la Semana y Fecha (220)

- **Hoja I AIPI** (Fila 37, Fecha `2026-08-05`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 44, Fecha `2026-08-12`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 51, Fecha `2026-08-19`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 58, Fecha `2026-08-26`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 65, Fecha `2026-09-02`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 72, Fecha `2026-09-09`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 79, Fecha `2026-09-16`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 86, Fecha `2026-09-23`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 93, Fecha `2026-09-30`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 100, Fecha `2026-10-07`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 107, Fecha `2026-10-14`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 114, Fecha `2026-10-21`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 121, Fecha `2026-10-28`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 128, Fecha `2026-11-04`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 135, Fecha `2026-11-11`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 142, Fecha `2026-11-18`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 149, Fecha `2026-11-25`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 156, Fecha `2026-12-02`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I AIPI** (Fila 163, Fecha `2026-12-09`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 37, Fecha `2026-08-05`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 44, Fecha `2026-08-12`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 51, Fecha `2026-08-19`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 58, Fecha `2026-08-26`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 65, Fecha `2026-09-02`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 72, Fecha `2026-09-09`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 79, Fecha `2026-09-16`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 86, Fecha `2026-09-23`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 93, Fecha `2026-09-30`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 100, Fecha `2026-10-07`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 107, Fecha `2026-10-14`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 114, Fecha `2026-10-21`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 121, Fecha `2026-10-28`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 128, Fecha `2026-11-04`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 135, Fecha `2026-11-11`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 142, Fecha `2026-11-18`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 149, Fecha `2026-11-25`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 156, Fecha `2026-12-02`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja II AIPI** (Fila 163, Fecha `2026-12-09`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I DIURNO A** (Fila 37, Fecha `2026-08-05`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I DIURNO A** (Fila 44, Fecha `2026-08-12`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I DIURNO A** (Fila 51, Fecha `2026-08-19`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I DIURNO A** (Fila 58, Fecha `2026-08-26`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I DIURNO A** (Fila 65, Fecha `2026-09-02`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I DIURNO A** (Fila 72, Fecha `2026-09-09`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I DIURNO A** (Fila 79, Fecha `2026-09-16`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I DIURNO A** (Fila 86, Fecha `2026-09-23`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I DIURNO A** (Fila 93, Fecha `2026-09-30`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I DIURNO A** (Fila 100, Fecha `2026-10-07`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I DIURNO A** (Fila 107, Fecha `2026-10-14`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**
- **Hoja I DIURNO A** (Fila 114, Fecha `2026-10-21`): Texto en Excel = **MIÉRCOLES** vs Día Calculado = **MIERCOLES**

*... y 170 discrepancias adicionales.*

---

## 💬 Anotaciones de Texto Libre Mapeadas como Observaciones (2)

- **TORRES GUARNIZO LEIDY ESMERALDA** (`I AIPI` - 2026-08-12): ","
- **GONZALEZ CASALLAS KAROL STEFHANY** (`I NOCHE A` - 2026-07-14): "INGRESO EL 15/07/2026"

