'use client';

import React, { useState } from 'react';
import { 
  UserPlus, Shield, ShieldCheck, Lock, Edit3, Trash2, CheckCircle2, XCircle, 
  UserCheck, UserX, KeyRound, AlertTriangle, Search, Check, RefreshCw
} from 'lucide-react';
import { 
  createAdminUserAction, updateAdminUserAction, toggleAdminUserStatusAction, deleteAdminUserAction 
} from '@/app/actions';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';
import { useRouter } from 'next/navigation';

export interface AdminUserItem {
  id: string;
  nombre: string;
  email: string;
  role: string;
  activo: boolean;
  permissions: string[];
  created_at: string;
}

const AVAILABLE_PERMISSIONS = [
  { key: 'attendance_view', label: 'Ver Control de Asistencia', desc: 'Permite consultar escaneos, listas de asistencia e historiales' },
  { key: 'attendance_edit', label: 'Editar Excusas y Asistencia', desc: 'Permite registrar excusas médicas, novedades y asistencias manuales' },
  { key: 'students_manage', label: 'Matrícula y Alumnos (RFID)', desc: 'Permite matricular estudiantes, gestionar grupos y vincular tarjetas RFID' },
  { key: 'documents_manage', label: 'Certificados y Código QR', desc: 'Permite expedir certificados de estudio, verificar y anular folios' },
  { key: 'cms_manage', label: 'Gestión Web (CMS y Blog)', desc: 'Permite crear/editar publicaciones del blog, faqs e imágenes de inicio' },
  { key: 'users_manage', label: 'Administrar Usuarios y Permisos', desc: 'Acceso total para crear nuevos usuarios y definir sus privilegios' }
];

const PRESET_ROLES = [
  { 
    id: 'admin', 
    name: '👑 Administrador Total', 
    permissions: AVAILABLE_PERMISSIONS.map(p => p.key) 
  },
  { 
    id: 'academic', 
    name: '📋 Secretaría / Asistencia', 
    permissions: ['attendance_view', 'attendance_edit', 'students_manage'] 
  },
  { 
    id: 'coordinator', 
    name: '🎓 Coordinación Académica', 
    permissions: ['attendance_view', 'attendance_edit', 'documents_manage'] 
  },
  { 
    id: 'custom', 
    name: '⚙️ Personalizado', 
    permissions: [] 
  }
];

export default function UserManagerClient({ users = [], currentUserId }: { users: AdminUserItem[]; currentUserId: string }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  // Modal Create
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('admin');
  const [newPermissions, setNewPermissions] = useState<string[]>(AVAILABLE_PERMISSIONS.map(p => p.key));

  // Modal Edit
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('admin');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editActivo, setEditActivo] = useState(true);

  const filteredUsers = users.filter(u => 
    (u.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectRolePreset = (roleId: string, isEditing: boolean) => {
    const preset = PRESET_ROLES.find(r => r.id === roleId);
    if (isEditing) {
      setEditRole(roleId);
      if (preset && roleId !== 'custom') {
        setEditPermissions(preset.permissions);
      }
    } else {
      setNewRole(roleId);
      if (preset && roleId !== 'custom') {
        setNewPermissions(preset.permissions);
      }
    }
  };

  const togglePermission = (key: string, isEditing: boolean) => {
    if (isEditing) {
      setEditPermissions(prev => 
        prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
      );
      setEditRole('custom');
    } else {
      setNewPermissions(prev => 
        prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
      );
      setNewRole('custom');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg({ text: '', type: '' });

    const fd = new FormData();
    fd.append('nombre', newNombre);
    fd.append('email', newEmail);
    fd.append('password', newPassword);
    fd.append('role', newRole);
    fd.append('permissions', JSON.stringify(newPermissions));

    const res = await createAdminUserAction(fd);
    setLoading(false);

    if (res.error) {
      setStatusMsg({ text: res.error, type: 'error' });
    } else {
      setStatusMsg({ text: '✅ Usuario creado exitosamente', type: 'success' });
      setCreateModalOpen(false);
      setNewNombre('');
      setNewEmail('');
      setNewPassword('');
      router.refresh();
    }
  };

  const openEditModal = (user: AdminUserItem) => {
    setEditingUser(user);
    setEditNombre(user.nombre || '');
    setEditEmail(user.email || '');
    setEditPassword('');
    setEditRole(user.role || 'admin');
    setEditPermissions(user.permissions || []);
    setEditActivo(user.activo);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    setStatusMsg({ text: '', type: '' });

    const fd = new FormData();
    fd.append('userId', editingUser.id);
    fd.append('nombre', editNombre);
    fd.append('email', editEmail);
    if (editPassword) fd.append('password', editPassword);
    fd.append('role', editRole);
    fd.append('permissions', JSON.stringify(editPermissions));
    fd.append('activo', String(editActivo));

    const res = await updateAdminUserAction(fd);
    setLoading(false);

    if (res.error) {
      setStatusMsg({ text: res.error, type: 'error' });
    } else {
      setStatusMsg({ text: '✅ Permisos y datos actualizados correctamente', type: 'success' });
      setEditingUser(null);
      router.refresh();
    }
  };

  const handleToggleStatus = async (user: AdminUserItem) => {
    if (!confirm(`¿Está seguro de ${user.activo ? 'desactivar' : 'activar'} el acceso a ${user.nombre || user.email}?`)) return;
    setLoading(true);
    const res = await toggleAdminUserStatusAction(user.id, !user.activo);
    setLoading(false);
    if (res.error) {
      setStatusMsg({ text: res.error, type: 'error' });
    } else {
      setStatusMsg({ text: `Estado actualizado a ${!user.activo ? 'Activo' : 'Inactivo'}`, type: 'success' });
      router.refresh();
    }
  };

  const handleDeleteUser = async (user: AdminUserItem) => {
    if (user.id === currentUserId) {
      alert('No puedes eliminar tu propia cuenta de usuario en uso.');
      return;
    }
    if (!confirm(`⚠️ ALERTA: ¿Está seguro de eliminar definitivamente a ${user.nombre || user.email}? Esta acción no se puede deshacer.`)) return;

    setLoading(true);
    const res = await deleteAdminUserAction(user.id);
    setLoading(false);
    if (res.error) {
      setStatusMsg({ text: res.error, type: 'error' });
    } else {
      setStatusMsg({ text: 'Usuario eliminado correctamente', type: 'success' });
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <span className="text-[10px] font-black tracking-widest text-fsm-red uppercase bg-red-50 px-3 py-1 rounded-full border border-red-100">
            Seguridad & Accesos
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-fsm-blue uppercase tracking-tight mt-2 flex items-center gap-2">
            <ShieldCheck size={28} className="text-fsm-blue" />
            Gestión de Usuarios y Permisos
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Administra las cuentas de acceso al panel administrativo y asigna privilegios por módulos institucionales.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="bg-fsm-blue text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-fsm-red transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 shrink-0 justify-center"
        >
          <UserPlus size={18} />
          Nuevo Usuario
        </button>
      </div>

      {/* Notifications */}
      {statusMsg.text && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-in fade-in ${
          statusMsg.type === 'error' ? 'bg-red-50 text-fsm-red border-red-200' : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg({ text: '', type: '' })} className="hover:opacity-70">✕</button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
        <Search size={18} className="text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar por nombre, correo o rol..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full text-xs font-bold text-gray-800 outline-none bg-transparent"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-xs text-gray-400 hover:text-gray-600">Limpiar</button>
        )}
      </div>

      {/* User Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                <th className="py-4 px-6">Usuario & Identificación</th>
                <th className="py-4 px-6">Rol del Sistema</th>
                <th className="py-4 px-6">Privilegios Activos</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6">Fecha Registro</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                    No se encontraron usuarios registrados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const isCurrent = user.id === currentUserId;
                  const perms = Array.isArray(user.permissions) ? user.permissions : [];

                  return (
                    <tr key={user.id} className={`hover:bg-gray-50/50 transition-colors ${!user.activo ? 'bg-red-50/20' : ''}`}>
                      <td className="py-4 px-6">
                        <div className="font-black text-fsm-blue uppercase flex items-center gap-2">
                          <span>{user.nombre || 'Sin nombre asignado'}</span>
                          {isCurrent && (
                            <span className="text-[8px] bg-blue-100 text-fsm-blue px-2 py-0.5 rounded-full font-black uppercase tracking-wider">TÚ</span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-gray-400">{user.email}</div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-fsm-blue/5 text-fsm-blue border border-fsm-blue/10">
                          <Shield size={12} />
                          {user.role === 'admin' ? 'Administrador Total' : user.role === 'academic' ? 'Secretaría Académica' : user.role}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {perms.map(pKey => {
                            const pObj = AVAILABLE_PERMISSIONS.find(ap => ap.key === pKey);
                            return (
                              <span key={pKey} className="text-[8px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                                {pObj ? pObj.label : pKey}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {user.activo ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                            <CheckCircle2 size={12} /> ACTIVO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-fsm-red bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                            <XCircle size={12} /> INACTIVO
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-gray-400 font-medium">
                        {formatDateDDMMYYYY(user.created_at)}
                      </td>

                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="px-3 py-1.5 bg-gray-50 text-fsm-blue border border-gray-200 hover:bg-fsm-blue hover:text-white transition-all text-xs font-bold rounded-lg"
                        >
                          Editar Permisos
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            user.activo ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-500 hover:text-white' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-600 hover:text-white'
                          }`}
                          title={user.activo ? 'Desactivar Usuario' : 'Activar Usuario'}
                        >
                          {user.activo ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                        {!isCurrent && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-1.5 bg-red-50 text-fsm-red border border-red-200 hover:bg-fsm-red hover:text-white transition-all text-xs font-bold rounded-lg"
                            title="Eliminar Usuario"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create User */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-xl max-h-[90vh] flex flex-col relative animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center bg-fsm-blue text-white px-8 py-5">
              <div>
                <span className="text-[9px] font-black tracking-widest uppercase">Creación de Usuario</span>
                <h3 className="text-xl font-black uppercase mt-0.5 flex items-center gap-2">
                  <UserPlus size={20} /> Registrar Nuevo Usuario
                </h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-white/70 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-8 overflow-y-auto space-y-6 flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Nombre Completo:*</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej: Lic. Laura Pérez"
                    value={newNombre} 
                    onChange={e => setNewNombre(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-fsm-blue"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Correo Electrónico (Login):*</label>
                    <input 
                      type="email" 
                      required 
                      placeholder="usuario@fundacionsanmateo.edu.co"
                      value={newEmail} 
                      onChange={e => setNewEmail(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-fsm-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Contraseña de Acceso:*</label>
                    <input 
                      type="password" 
                      required 
                      placeholder="••••••••"
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-fsm-blue"
                    />
                  </div>
                </div>

                {/* Preset Role Selector */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1.5">Perfil de Rol Predefinido:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_ROLES.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelectRolePreset(r.id, false)}
                        className={`px-3 py-2 rounded-xl text-left border font-bold text-xs transition-all ${
                          newRole === r.id ? 'bg-blue-50 border-fsm-blue text-fsm-blue shadow-sm font-black' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Granular Permissions Checkboxes */}
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Privilegios y Permisos de Módulo:</label>
                  <div className="space-y-2">
                    {AVAILABLE_PERMISSIONS.map(p => {
                      const checked = newPermissions.includes(p.key);
                      return (
                        <label key={p.key} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          checked ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50/50 border-gray-100 hover:bg-gray-50'
                        }`}>
                          <input 
                            type="checkbox" 
                            checked={checked}
                            onChange={() => togglePermission(p.key, false)}
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-fsm-blue focus:ring-fsm-blue"
                          />
                          <div>
                            <span className="block font-bold text-xs text-gray-800">{p.label}</span>
                            <span className="block text-[10px] text-gray-500 font-medium">{p.desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 justify-end">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-fsm-blue text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-fsm-red transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <RefreshCw className="animate-spin" size={16} /> : <UserPlus size={16} />}
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editingUser && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-xl max-h-[90vh] flex flex-col relative animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center bg-fsm-blue text-white px-8 py-5">
              <div>
                <span className="text-[9px] font-black tracking-widest uppercase">Edición de Permisos</span>
                <h3 className="text-xl font-black uppercase mt-0.5 flex items-center gap-2">
                  <Edit3 size={20} /> Modificar: {editingUser.nombre || editingUser.email}
                </h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-white/70 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-8 overflow-y-auto space-y-6 flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Nombre Completo:*</label>
                  <input 
                    type="text" 
                    required 
                    value={editNombre} 
                    onChange={e => setEditNombre(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-fsm-blue"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Correo Electrónico:*</label>
                    <input 
                      type="email" 
                      required 
                      value={editEmail} 
                      onChange={e => setEditEmail(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-fsm-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Cambiar Contraseña (Opcional):</label>
                    <input 
                      type="password" 
                      placeholder="Dejar en blanco para mantener"
                      value={editPassword} 
                      onChange={e => setEditPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-fsm-blue"
                    />
                  </div>
                </div>

                {/* Preset Role Selector */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1.5">Perfil de Rol Predefinido:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_ROLES.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelectRolePreset(r.id, true)}
                        className={`px-3 py-2 rounded-xl text-left border font-bold text-xs transition-all ${
                          editRole === r.id ? 'bg-blue-50 border-fsm-blue text-fsm-blue shadow-sm font-black' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Toggle */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Estado de la Cuenta:</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 font-bold text-xs cursor-pointer">
                      <input 
                        type="radio" 
                        name="editActivo" 
                        checked={editActivo === true}
                        onChange={() => setEditActivo(true)}
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span className="text-green-700">Activo (Puede ingresar)</span>
                    </label>
                    <label className="flex items-center gap-2 font-bold text-xs cursor-pointer">
                      <input 
                        type="radio" 
                        name="editActivo" 
                        checked={editActivo === false}
                        onChange={() => setEditActivo(false)}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span className="text-fsm-red">Inactivo (Acceso bloqueado)</span>
                    </label>
                  </div>
                </div>

                {/* Granular Permissions Checkboxes */}
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Privilegios y Permisos de Módulo:</label>
                  <div className="space-y-2">
                    {AVAILABLE_PERMISSIONS.map(p => {
                      const checked = editPermissions.includes(p.key);
                      return (
                        <label key={p.key} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          checked ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50/50 border-gray-100 hover:bg-gray-50'
                        }`}>
                          <input 
                            type="checkbox" 
                            checked={checked}
                            onChange={() => togglePermission(p.key, true)}
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-fsm-blue focus:ring-fsm-blue"
                          />
                          <div>
                            <span className="block font-bold text-xs text-gray-800">{p.label}</span>
                            <span className="block text-[10px] text-gray-500 font-medium">{p.desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-fsm-blue text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-fsm-red transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                  Actualizar Permisos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
