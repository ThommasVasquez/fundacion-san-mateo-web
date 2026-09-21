/**
 * Sistema Unificado de Roles y Permisos de la Fundación San Mateo
 * 
 * Permisos disponibles:
 * - attendance_view: Consultar escaneos, planillas, alertas e historiales de asistencia.
 * - attendance_edit: Modificar asistencias, registrar excusas, cambios masivos y sincronizar sesiones.
 * - students_manage: Matricular alumnos, editar fichas, vincular tarjetas RFID, importar y promover semestres.
 * - documents_manage: Expedir certificados oficiales, verificar folios, anular y generar PDFs estampados con QR.
 * - cms_manage: Modificar el contenido de la web pública (home, blog, faqs, sedes, etc.).
 * - users_manage: Crear, editar, activar/desactivar usuarios administrativos y asignar sus permisos.
 * - mobile_attendance: Acceso a la App Móvil institucional (BLE/NFC) para docentes.
 */

export const AVAILABLE_PERMISSIONS = [
  { key: 'attendance_view', label: 'Ver Control de Asistencia', desc: 'Permite consultar escaneos, listas de asistencia e historiales' },
  { key: 'attendance_edit', label: 'Editar Excusas y Asistencia', desc: 'Permite registrar excusas médicas, novedades y asistencias manuales' },
  { key: 'students_manage', label: 'Matrícula y Alumnos (RFID)', desc: 'Permite matricular estudiantes, gestionar grupos, vincular tarjetas RFID y promover semestre' },
  { key: 'documents_manage', label: 'Certificados y Código QR', desc: 'Permite expedir certificados de estudio, verificar y anular folios' },
  { key: 'cms_manage', label: 'Gestión Web (CMS y Blog)', desc: 'Permite crear/editar publicaciones del blog, faqs e imágenes de inicio' },
  { key: 'users_manage', label: 'Administrar Usuarios y Permisos', desc: 'Acceso total para crear nuevos usuarios y definir sus privilegios' },
  { key: 'mobile_attendance', label: '📱 Asistencia Móvil / App Profesor', desc: 'Permite registrar entradas, salidas y escaneo desde la App Móvil' },
  { key: 'attendance_edit_total_classes', label: 'Configurar Total de Clases/Fechas', desc: 'Permite modificar la cantidad de fechas o clases totales en grupos y ofertas educativas para el cálculo del porcentaje en planillas' },
] as const;

export type PermissionKey = typeof AVAILABLE_PERMISSIONS[number]['key'];

export const SUPER_ADMIN_EMAILS = [
  'admin@fundacionsanmateo.edu.co',
  'admin@fundacionsanmateosoacha.edu.co'
];

/**
 * Determina si un correo pertenece a un SuperAdmin con acceso irrestricto y logs.
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return SUPER_ADMIN_EMAILS.includes(clean);
}

/**
 * Devuelve la lista efectiva de permisos según el rol y los permisos guardados.
 */
export function getEffectivePermissions(role?: string | null, rawPermissions?: any): string[] {
  const cleanRole = (role || 'custom').toLowerCase().trim();
  
  // Rol admin o superadmin: todos los permisos
  if (cleanRole === 'admin') {
    return AVAILABLE_PERMISSIONS.map(p => p.key);
  }

  let permissionsList: string[] = [];

  if (Array.isArray(rawPermissions)) {
    permissionsList = rawPermissions.map(p => String(p).trim());
  } else if (typeof rawPermissions === 'string') {
    try {
      const parsed = JSON.parse(rawPermissions);
      if (Array.isArray(parsed)) {
        permissionsList = parsed.map(p => String(p).trim());
      }
    } catch {
      permissionsList = [];
    }
  }

  // Fallbacks por rol si no se especificaron permisos en BD
  if (permissionsList.length === 0) {
    if (cleanRole === 'academic') {
      permissionsList = ['attendance_view', 'attendance_edit', 'students_manage'];
    } else if (cleanRole === 'coordinator') {
      permissionsList = ['attendance_view', 'attendance_edit', 'documents_manage'];
    } else if (cleanRole === 'teacher') {
      permissionsList = ['mobile_attendance', 'attendance_view', 'attendance_edit'];
    }
  }

  return permissionsList;
}

/**
 * Valida si un usuario posee un permiso determinado.
 */
export function userHasPermission(
  requiredPerm: PermissionKey | string,
  role?: string | null,
  rawPermissions?: any,
  email?: string | null
): boolean {
  if (isSuperAdminEmail(email)) return true;
  const cleanRole = (role || 'custom').toLowerCase().trim();
  if (cleanRole === 'admin') return true;

  const permissions = getEffectivePermissions(cleanRole, rawPermissions);
  return permissions.includes(requiredPerm);
}

/**
 * Devuelve la ruta de inicio más adecuada según los permisos del usuario.
 */
export function getUserDefaultRoute(role?: string | null, rawPermissions?: any, email?: string | null): string {
  if (isSuperAdminEmail(email)) return '/admin';
  const cleanRole = (role || 'custom').toLowerCase().trim();
  if (cleanRole === 'admin') return '/admin';

  const permissions = getEffectivePermissions(cleanRole, rawPermissions);

  if (cleanRole === 'teacher' || (!permissions.includes('attendance_view') && permissions.includes('mobile_attendance'))) {
    return '/teacher/attendance';
  }

  if (permissions.includes('attendance_view') || permissions.includes('attendance_edit')) {
    return '/admin/attendance';
  }

  if (permissions.includes('documents_manage')) {
    return '/admin/documents';
  }

  if (permissions.includes('students_manage')) {
    return '/admin/attendance/enrollment';
  }

  if (permissions.includes('cms_manage')) {
    return '/admin';
  }

  if (permissions.includes('users_manage')) {
    return '/admin/users';
  }

  return '/admin/attendance';
}

/**
 * Verifica si una ruta está autorizada para un usuario.
 * Retorna { allowed: boolean, redirectUrl?: string }
 */
export function checkRoutePermission(
  pathname: string,
  role?: string | null,
  rawPermissions?: any,
  email?: string | null
): { allowed: boolean; redirectUrl: string } {
  const defaultRoute = getUserDefaultRoute(role, rawPermissions, email);

  if (isSuperAdminEmail(email)) {
    return { allowed: true, redirectUrl: defaultRoute };
  }

  const cleanRole = (role || 'custom').toLowerCase().trim();
  if (cleanRole === 'admin') {
    return { allowed: true, redirectUrl: defaultRoute };
  }

  const permissions = getEffectivePermissions(cleanRole, rawPermissions);

  // 1. Logs & Auditoría -> Solo SuperAdmin
  if (pathname === '/admin/logs' || pathname.startsWith('/admin/logs/')) {
    return { allowed: false, redirectUrl: defaultRoute };
  }

  // 2. Usuarios y Permisos -> Requiere users_manage
  if (pathname === '/admin/users' || pathname.startsWith('/admin/users/')) {
    const allowed = permissions.includes('users_manage');
    return { allowed, redirectUrl: defaultRoute };
  }

  // 3. Documentos y QR -> Requiere documents_manage
  if (pathname === '/admin/documents' || pathname.startsWith('/admin/documents/')) {
    const allowed = permissions.includes('documents_manage');
    return { allowed, redirectUrl: defaultRoute };
  }

  // 4. Matrícula, Importación y Promoción -> Requiere students_manage
  if (
    pathname === '/admin/attendance/enrollment' || pathname.startsWith('/admin/attendance/enrollment/') ||
    pathname === '/admin/attendance/import' || pathname.startsWith('/admin/attendance/import/') ||
    pathname === '/admin/attendance/promotion' || pathname.startsWith('/admin/attendance/promotion/')
  ) {
    const allowed = permissions.includes('students_manage');
    return { allowed, redirectUrl: permissions.includes('attendance_view') ? '/admin/attendance' : defaultRoute };
  }

  // 5. Asistencia (general, planillas, alertas, grupos, historiales) -> Requiere attendance_view o attendance_edit
  if (pathname === '/admin/attendance' || pathname.startsWith('/admin/attendance/')) {
    const allowed = permissions.includes('attendance_view') || permissions.includes('attendance_edit');
    return { allowed, redirectUrl: defaultRoute };
  }

  // 6. CMS (Home dashboard, páginas, blog, faqs) -> Requiere cms_manage
  if (
    pathname === '/admin' ||
    pathname === '/admin/pages' || pathname.startsWith('/admin/pages/') ||
    pathname === '/admin/blog' || pathname.startsWith('/admin/blog/') ||
    pathname === '/admin/faqs' || pathname.startsWith('/admin/faqs/')
  ) {
    const allowed = permissions.includes('cms_manage');
    return { allowed, redirectUrl: defaultRoute };
  }

  return { allowed: true, redirectUrl: defaultRoute };
}
