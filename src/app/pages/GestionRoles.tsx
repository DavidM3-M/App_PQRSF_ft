import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Shield, Plus, X, Loader2, Users, Search,
  ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import {
  apiListRoles, apiCreateRole, apiListUsers,
  apiGetUserRoles, apiAssignRole, apiRemoveRole,
  formatApiError,
  type Role, type UsuarioAPI, type UserRole, type RolePayload,
} from "../lib/api";

interface RoleForm extends RolePayload {}

// ─── component ──────────────────────────────────────────────────────────────
export function GestionRoles({ onClose }: { onClose?: () => void } = {}) {
  const navigate = useNavigate();

  const [roles, setRoles] = useState<Role[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // create-role form
  const [showForm, setShowForm] = useState(false);

  // user-role expand + assignment
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<Record<string, UserRole[]>>({});
  const [loadingUserRoles, setLoadingUserRoles] = useState(false);
  const [assigningRoleId, setAssigningRoleId] = useState<string>("");

  // search
  const [busqueda, setBusqueda] = useState("");
  const [busquedaRol, setBusquedaRol] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RoleForm>({
    defaultValues: { name: "", code: "", description: "", active: true },
  });

  // ── data loading ──────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        apiListRoles(),
        apiListUsers({ page_size: 200 }),
      ]);
      setRoles(Array.isArray(rolesRes) ? rolesRes : (rolesRes as any).results ?? []);
      setUsuarios(Array.isArray(usersRes) ? usersRes : (usersRes as any).results ?? []);
    } catch (e) {
      toast.error("Error al cargar datos", { description: formatApiError(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── create role ───────────────────────────────────────────────────────────
  const onSubmitRole = async (data: RoleForm) => {
    setSubmitting(true);
    try {
      await apiCreateRole({ ...data, code: data.code.toUpperCase() });
      toast.success(`Rol "${data.name}" creado correctamente`);
      reset();
      setShowForm(false);
      await cargarDatos();
    } catch (e) {
      toast.error("Error al crear rol", { description: formatApiError(e) });
    } finally {
      setSubmitting(false);
    }
  };

  // ── user roles expand ─────────────────────────────────────────────────────
  const toggleUser = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    if (!userRoles[userId]) {
      setLoadingUserRoles(true);
      try {
        const res = await apiGetUserRoles(userId);
        setUserRoles(prev => ({
          ...prev,
          [userId]: Array.isArray(res) ? res : (res as any).results ?? [],
        }));
      } catch (e) {
        toast.error("Error al cargar roles del usuario", { description: formatApiError(e) });
      } finally {
        setLoadingUserRoles(false);
      }
    }
  };

  const handleAssignRole = async (userId: string) => {
    if (!assigningRoleId) return;
    setSubmitting(true);
    try {
      await apiAssignRole(userId, assigningRoleId);
      toast.success("Rol asignado correctamente");
      setAssigningRoleId("");
      // refresh this user's roles
      const res = await apiGetUserRoles(userId);
      setUserRoles(prev => ({
        ...prev,
        [userId]: Array.isArray(res) ? res : (res as any).results ?? [],
      }));
    } catch (e) {
      toast.error("Error al asignar rol", { description: formatApiError(e) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveRole = async (userId: string, userRoleId: string, roleName: string) => {
    if (!confirm(`¿Quitar el rol "${roleName}" a este usuario?`)) return;
    try {
      await apiRemoveRole(userRoleId);
      toast.success("Rol removido correctamente");
      const res = await apiGetUserRoles(userId);
      setUserRoles(prev => ({
        ...prev,
        [userId]: Array.isArray(res) ? res : (res as any).results ?? [],
      }));
    } catch (e) {
      toast.error("Error al remover rol", { description: formatApiError(e) });
    }
  };

  // ── derived ───────────────────────────────────────────────────────────────
  /** Resuelve el objeto Role de un UserRole independientemente de si el backend
   * devolvió el objeto anidado completo o solo el UUID del rol. */
  const resolveRole = useCallback((ur: UserRole): Role | undefined => {
    if (typeof ur.role === "object" && ur.role !== null) return ur.role as Role;
    return roles.find(r => r.id === ur.role);
  }, [roles]);

  const usuariosFiltrados = usuarios.filter(u => {
    const q = busqueda.toLowerCase();
    return q === "" ||
      u.nombre.toLowerCase().includes(q) ||
      u.apellido.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
  });

  const rolesFiltrados = roles.filter(r => {
    const q = busquedaRol.toLowerCase();
    return q === "" ||
      r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q);
  });

  // ── render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Roles y Usuarios</h1>
          </div>
          <p className="text-gray-600">Gestione el catálogo de roles y asígnelos a usuarios</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onClose ? onClose() : navigate("/admin")}>
            {onClose ? "Cerrar" : "Volver al Panel"}
          </Button>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Rol
            </Button>
          )}
        </div>
      </div>

      {/* Create-role form */}
      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Crear Nuevo Rol</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); reset(); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmitRole)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del rol *</Label>
                  <Input
                    id="name"
                    placeholder="Ej: Gestor de PQRS"
                    {...register("name", { required: "El nombre es obligatorio", minLength: { value: 3, message: "Mínimo 3 caracteres" } })}
                  />
                  {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Código único *</Label>
                  <Input
                    id="code"
                    placeholder="Ej: GESTOR (se guardará en MAYÚSCULAS)"
                    {...register("code", {
                      required: "El código es obligatorio",
                      pattern: { value: /^[A-Za-z0-9_]+$/, message: "Solo letras, números y guion bajo" },
                    })}
                  />
                  {errors.code && <p className="text-sm text-red-600">{errors.code.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Describe las responsabilidades de este rol..."
                  rows={2}
                  {...register("description")}
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : "Crear Rol"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); reset(); }}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">

        {/* ── Roles catalog ─────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-700 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" /> Catálogo de Roles ({rolesFiltrados.length})
            </h2>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="pl-8 h-9 text-sm"
              placeholder="Buscar rol..."
              value={busquedaRol}
              onChange={e => setBusquedaRol(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            {roles.length === 0
              ? <p className="text-sm text-gray-400 italic">No hay roles creados.</p>
              : rolesFiltrados.length === 0
              ? <p className="text-sm text-gray-400 italic">Sin resultados.</p>
              : rolesFiltrados.map(r => (
                  <Card key={r.id} className={`border ${r.active ? "" : "opacity-60"}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{r.name}</p>
                          <p className="text-xs font-mono text-blue-600 mt-0.5">{r.code}</p>
                        </div>
                        <Badge variant={r.active ? "success" : "secondary"}>
                          {r.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      {r.description && (
                        <p className="text-sm text-gray-500 mt-2">{r.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))
            }
          </div>
        </div>

        {/* ── Users + role assignment ────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-700 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" /> Usuarios ({usuariosFiltrados.length})
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                className="pl-8 h-9 text-sm"
                placeholder="Buscar usuario..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            {usuariosFiltrados.map(u => {
              const isExpanded = expandedUserId === u.id;
              const uRoles = userRoles[u.id] ?? [];

              return (
                <Card key={u.id} className="border">
                  <button
                    className="w-full text-left"
                    onClick={() => toggleUser(u.id)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {u.nombre} {u.apellido}
                          {u.is_staff && (
                            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Admin</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                        {isExpanded && uRoles.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {uRoles.map(ur => (
                              <Badge key={ur.id} variant="outline" className="text-xs">
                                {resolveRole(ur)?.name ?? ur.id}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                    </CardContent>
                  </button>

                  {isExpanded && (
                    <div className="border-t px-4 pb-4 pt-3 space-y-3">
                      {loadingUserRoles && !userRoles[u.id] ? (
                        <div className="flex justify-center py-2">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        </div>
                      ) : (
                        <>
                          {/* Current roles */}
                          {uRoles.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Sin roles asignados.</p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Roles actuales</p>
                              {uRoles.map(ur => (
                                <div key={ur.id} className="flex items-center justify-between bg-blue-50 rounded-md px-3 py-2">
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">{resolveRole(ur)?.name ?? "—"}</p>
                                    <p className="text-xs font-mono text-blue-600">{resolveRole(ur)?.code ?? ""}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                                    onClick={() => handleRemoveRole(u.id, ur.id, resolveRole(ur)?.name ?? "este rol")}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Assign role */}
                          <div className="flex gap-2 pt-1">
                            <select
                              className="flex-1 border rounded-md px-3 py-1.5 text-sm bg-white"
                              value={expandedUserId === u.id ? assigningRoleId : ""}
                              onChange={e => setAssigningRoleId(e.target.value)}
                            >
                              <option value="">Seleccionar rol a asignar...</option>
                              {roles
                                .filter(r => r.active && !uRoles.some(ur => {
                                  const resolved = resolveRole(ur);
                                  return resolved?.id === r.id;
                                }))
                                .map(r => (
                                  <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                                ))
                              }
                            </select>
                            <Button
                              size="sm"
                              disabled={!assigningRoleId || submitting}
                              onClick={() => handleAssignRole(u.id)}
                            >
                              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Asignar"}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
