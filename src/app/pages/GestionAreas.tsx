import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Building2, Plus, Edit, Trash2, Users, X, Loader2, Search } from "lucide-react";
import {
  apiListDependencies,
  apiCreateDependency,
  apiUpdateDependency,
  apiDeleteDependency,
  apiListUsers,
  apiUpdateUser,
  apiListManagers,
  apiAssignManager,
  apiRemoveManager,
  resolveDepId,
  formatApiError,
  type Dependency,
  type UsuarioAPI,
  type DependencyPayload,
  type DependencyManager,
} from "../lib/api";

interface DependencyForm extends DependencyPayload {}

// Deterministic color for an area/dependency based on its id
const COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500",
  "bg-orange-500", "bg-red-500", "bg-yellow-500",
  "bg-pink-500", "bg-indigo-500",
];
function colorForId(id: string) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return COLORS[sum % COLORS.length];
}

export function GestionAreas({ onClose }: { onClose?: () => void } = {}) {
  const navigate = useNavigate();
  const [areas, setAreas] = useState<Dependency[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingArea, setEditingArea] = useState<Dependency | null>(null);
  const [showUsuariosModal, setShowUsuariosModal] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [showEncargadosModal, setShowEncargadosModal] = useState(false);
  const [encargadosAreaId, setEncargadosAreaId] = useState<string | null>(null);
  const [managers, setManagers] = useState<DependencyManager[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);

  // search & filter (lista principal)
  const [busqueda, setBusqueda] = useState("");
  // search dentro de modales
  const [busquedaUsuarios, setBusquedaUsuarios] = useState("");
  const [busquedaEncargados, setBusquedaEncargados] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "activas" | "inactivas">("todos");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DependencyForm>();

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [areasRes, usersRes] = await Promise.all([
        apiListDependencies(true),
        apiListUsers({ page_size: 200 }),
      ]);
      setAreas(Array.isArray(areasRes) ? areasRes : (areasRes as any).results ?? []);
      setUsuarios(Array.isArray(usersRes) ? usersRes : (usersRes as any).results ?? []);
    } catch (e) {
      toast.error("Error al cargar datos", { description: formatApiError(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const onSubmit = async (data: DependencyForm) => {
    setSubmitting(true);
    try {
      if (editingArea) {
        await apiUpdateDependency(editingArea.id, data);
        toast.success("Area actualizada correctamente");
      } else {
        await apiCreateDependency({ ...data, active: true });
        toast.success("Area creada correctamente");
      }
      await cargarDatos();
      handleCancelForm();
    } catch (e) {
      toast.error("Error al guardar area", { description: formatApiError(e) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (area: Dependency) => {
    setEditingArea(area);
    reset({
      name: area.name,
      code: area.code,
      email: area.email,
      description: area.description,
      active: area.active,
    });
    setShowForm(true);
  };

  const handleDelete = async (area: Dependency) => {
    if (!confirm(`Esta seguro de eliminar el area "${area.name}"?`)) return;
    try {
      await apiDeleteDependency(area.id);
      toast.success("Area eliminada");
      await cargarDatos();
    } catch (e) {
      toast.error("Error al eliminar area", { description: formatApiError(e) });
    }
  };

  const handleToggleActive = async (area: Dependency) => {
    try {
      await apiUpdateDependency(area.id, { active: !area.active });
      toast.success(area.active ? "Area desactivada" : "Area activada");
      await cargarDatos();
    } catch (e) {
      toast.error("Error al actualizar area", { description: formatApiError(e) });
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingArea(null);
    reset();
  };

  const handleAsignarUsuario = async (usuarioId: string, areaId: string | null) => {
    try {
      // The backend expects the dependency UUID (or null to remove), not the full object.
      await apiUpdateUser(usuarioId, { dependency: areaId });
      toast.success("Usuario actualizado");
      await cargarDatos();
    } catch (e) {
      toast.error("Error al actualizar usuario", { description: formatApiError(e) });
    }
  };

  const handleOpenEncargados = async (areaId: string) => {
    setEncargadosAreaId(areaId);
    setShowEncargadosModal(true);
    setLoadingManagers(true);
    try {
      const res = await apiListManagers(areaId);
      setManagers(Array.isArray(res) ? res : (res as any).results ?? []);
    } catch (e) {
      toast.error("Error al cargar encargados", { description: formatApiError(e) });
    } finally {
      setLoadingManagers(false);
    }
  };

  const handleAssignEncargado = async (userId: string) => {
    if (!encargadosAreaId) return;
    try {
      await apiAssignManager(encargadosAreaId, userId);
      toast.success("Encargado asignado correctamente");
      await handleOpenEncargados(encargadosAreaId);
    } catch (e) {
      toast.error("Error al asignar encargado", { description: formatApiError(e) });
    }
  };

  const handleRemoveEncargado = async (managerId: string) => {
    if (!encargadosAreaId) return;
    if (!confirm("¿Desactivar este encargado del área?")) return;
    try {
      await apiRemoveManager(encargadosAreaId, managerId);
      toast.success("Encargado desactivado");
      await handleOpenEncargados(encargadosAreaId);
    } catch (e) {
      toast.error("Error al desactivar encargado", { description: formatApiError(e) });
    }
  };

  const getUsuariosByArea = (areaId: string) =>
    usuarios.filter(u => resolveDepId(u.dependency) === areaId);

  /** Resuelve el UsuarioAPI de un DependencyManager cuyo campo `user` puede
   * ser un objeto completo o solo un UUID string. */
  const resolveManagerUser = (m: DependencyManager): UsuarioAPI | undefined => {
    if (typeof m.user === "object" && m.user !== null) return m.user as UsuarioAPI;
    return usuarios.find(u => u.id === m.user);
  };

  /** Devuelve el id del usuario de un manager independientemente de si user es
   * objeto o string UUID. */
  const managerUserId = (m: DependencyManager): string =>
    typeof m.user === "object" && m.user !== null ? (m.user as UsuarioAPI).id : (m.user as string);

  const areasFiltradas = areas.filter(a => {
    const q = busqueda.toLowerCase();
    const matchQ = q === "" ||
      a.name.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q);
    const matchActivo =
      filtroActivo === "todos" ||
      (filtroActivo === "activas" && a.active) ||
      (filtroActivo === "inactivas" && !a.active);
    return matchQ && matchActivo;
  });

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
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1>Gestion de Areas</h1>
          </div>
          <p className="text-gray-600">Administre las dependencias y asigne usuarios</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onClose ? onClose() : navigate("/admin")}>
            {onClose ? "Cerrar" : "Volver al Panel"}
          </Button>
          <Button onClick={() => { setEditingArea(null); reset(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Nueva Area
          </Button>
        </div>
      </div>

      {/* Modal de creacion/edicion de area */}
      {showForm && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <Card className="w-full max-w-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingArea ? "Editar Area" : "Nueva Area"}</CardTitle>
                <Button variant="ghost" size="icon" onClick={handleCancelForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Nombre */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Area *</Label>
                    <Input
                      id="name"
                      placeholder="Ej: Atencion al Cliente"
                      {...register("name", {
                        required: "El nombre es requerido",
                        minLength: { value: 3, message: "Minimo 3 caracteres" },
                      })}
                    />
                    {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                  </div>

                  {/* Codigo */}
                  <div className="space-y-2">
                    <Label htmlFor="code">Codigo *</Label>
                    <Input
                      id="code"
                      placeholder="Ej: ATC-01"
                      {...register("code", {
                        required: "El codigo es requerido",
                        minLength: { value: 2, message: "Minimo 2 caracteres" },
                        maxLength: { value: 20, message: "Maximo 20 caracteres" },
                        pattern: {
                          value: /^[A-Za-z0-9_-]+$/,
                          message: "Solo letras, numeros, guion y underscore",
                        },
                      })}
                    />
                    {errors.code && <p className="text-sm text-red-600">{errors.code.message}</p>}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo del Area *</Label>
                    <Input
                      id="email"
                      type="text"
                      inputMode="email"
                      placeholder="area@institucion.edu.co"
                      {...register("email", {
                        required: "El correo es requerido",
                        pattern: {
                          // type="text" evita que el navegador convierta dominios con
                          // tildes/ñ a Punycode (xn--...). La validación se hace aquí.
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "Correo electronico invalido",
                        },
                      })}
                    />
                    {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
                  </div>
                </div>

                {/* Descripcion */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descripcion *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe las funciones de esta area"
                    rows={3}
                    {...register("description", {
                      required: "La descripcion es requerida",
                      minLength: { value: 10, message: "Minimo 10 caracteres" },
                    })}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
                      : editingArea ? "Actualizar Area" : "Crear Area"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelForm} disabled={submitting}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>,
        document.body
      )}

      {/* Barra de búsqueda y filtros */}
      {areas.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="pl-8 h-9 text-sm"
              placeholder="Buscar por nombre, código o correo..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <select
            className="border rounded-md px-3 py-1.5 text-sm bg-white h-9"
            value={filtroActivo}
            onChange={e => setFiltroActivo(e.target.value as typeof filtroActivo)}
          >
            <option value="todos">Todas las áreas</option>
            <option value="activas">Solo activas</option>
            <option value="inactivas">Solo inactivas</option>
          </select>
          {(busqueda || filtroActivo !== "todos") && (
            <Button variant="ghost" size="sm" className="text-gray-500"
              onClick={() => { setBusqueda(""); setFiltroActivo("todos"); }}>
              Limpiar
            </Button>
          )}
        </div>
      )}

      {/* Lista de areas */}
      {areas.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="font-medium">No hay areas registradas</p>
          <p className="text-sm mt-1">Cree la primera area usando el boton superior</p>
        </div>
      ) : areasFiltradas.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          <Search className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="font-medium">Sin resultados</p>
          <p className="text-sm mt-1">Intente con otro término o cambie el filtro</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {areasFiltradas.map((area) => {
            const usuariosArea = getUsuariosByArea(area.id);
            const color = colorForId(area.id);

            return (
              <Card key={area.id} className={!area.active ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-12 w-12 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg leading-tight">{area.name}</CardTitle>
                        <p className="text-xs font-mono text-gray-400 mt-0.5">{area.code}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant={area.active ? "success" : "secondary"}>
                            {area.active ? "Activa" : "Inactiva"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">{area.description}</p>
                  <p className="text-xs text-gray-400">{area.email}</p>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{usuariosArea.length} usuario(s) asignado(s)</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(area)}>
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedAreaId(area.id);
                        setShowUsuariosModal(true);
                      }}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Usuarios
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-700 border-blue-200"
                      onClick={() => handleOpenEncargados(area.id)}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Encargados
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleToggleActive(area)}>
                      {area.active ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(area)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de asignacion de usuarios */}
      {showUsuariosModal && selectedAreaId && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestionar Usuarios</CardTitle>
                  <CardDescription>
                    {areas.find(a => a.id === selectedAreaId)?.name}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowUsuariosModal(false);
                    setSelectedAreaId(null);
                    setBusquedaUsuarios("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Buscador */}
              <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-8 h-9 text-sm"
                  placeholder="Buscar por nombre o correo..."
                  value={busquedaUsuarios}
                  onChange={e => setBusquedaUsuarios(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                {usuarios.filter(u => !u.is_staff).length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No hay usuarios disponibles</p>
                ) : (() => {
                  const q = busquedaUsuarios.toLowerCase();
                  const filtrados = usuarios
                    .filter(u => !u.is_staff)
                    .filter(u =>
                      q === "" ||
                      `${u.nombre} ${u.apellido}`.toLowerCase().includes(q) ||
                      u.email.toLowerCase().includes(q)
                    );
                  if (filtrados.length === 0)
                    return <p className="text-sm text-gray-400 text-center py-4 italic">Sin coincidencias</p>;
                  return filtrados.map(usuario => {
                      const uDepId = resolveDepId(usuario.dependency);
                      const estaAsignado = uDepId === selectedAreaId;
                      const areaAsignada = uDepId ? areas.find(a => a.id === uDepId) : null;

                      return (
                        <div
                          key={usuario.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div>
                            <p className="font-medium">
                              {usuario.nombre} {usuario.apellido}
                            </p>
                            <p className="text-sm text-gray-600">{usuario.email}</p>
                            {areaAsignada && !estaAsignado && (
                              <Badge variant="outline" className="mt-1">
                                {areaAsignada.name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {estaAsignado ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAsignarUsuario(usuario.id, null)}
                              >
                                Desasignar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleAsignarUsuario(usuario.id, selectedAreaId)}
                              >
                                Asignar
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
              </div>
            </CardContent>
          </Card>
        </div>,
        document.body
      )}
      {/* Modal de encargados (DependencyManager) */}
      {showEncargadosModal && encargadosAreaId && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Encargados del Área</CardTitle>
                  <CardDescription>
                    {areas.find(a => a.id === encargadosAreaId)?.name} — Gestione quién puede administrar PQRS de esta área
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setShowEncargadosModal(false); setEncargadosAreaId(null); setBusquedaEncargados(""); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingManagers ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Active managers */}
                  {managers.filter(m => m.is_active).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Encargados activos</h4>
                      {managers.filter(m => m.is_active).map(m => {
                        const mu = resolveManagerUser(m);
                        return (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border bg-blue-50 mb-2">
                          <div>
                            <p className="font-medium">{mu ? `${mu.nombre} ${mu.apellido}` : managerUserId(m)}</p>
                            <p className="text-sm text-gray-600">{mu?.email ?? ""}</p>
                            {m.notes && <p className="text-xs text-gray-400 mt-0.5">{m.notes}</p>}
                          </div>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleRemoveEncargado(m.id)}>
                            Desactivar
                          </Button>
                        </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Inactive managers */}
                  {managers.filter(m => !m.is_active).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">Encargados inactivos</h4>
                      {managers.filter(m => !m.is_active).map(m => {
                        const mu = resolveManagerUser(m);
                        return (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border opacity-50 mb-2">
                          <div>
                            <p className="font-medium">{mu ? `${mu.nombre} ${mu.apellido}` : managerUserId(m)}</p>
                            <p className="text-sm text-gray-600">{mu?.email ?? ""}</p>
                          </div>
                          <Badge variant="secondary">Inactivo</Badge>
                        </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Assign new manager */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Asignar nuevo encargado</h4>
                    {/* Buscador */}
                    <div className="relative mb-3">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        className="pl-8 h-9 text-sm"
                        placeholder="Buscar por nombre o correo..."
                        value={busquedaEncargados}
                        onChange={e => setBusquedaEncargados(e.target.value)}
                      />
                    </div>
                    {(() => {
                      const q = busquedaEncargados.toLowerCase();
                      const disponibles = usuarios
                        .filter(u => !u.is_staff && !managers.some(m => m.is_active && managerUserId(m) === u.id))
                        .filter(u =>
                          q === "" ||
                          `${u.nombre} ${u.apellido}`.toLowerCase().includes(q) ||
                          u.email.toLowerCase().includes(q)
                        );
                      if (usuarios.filter(u => !u.is_staff && !managers.some(m => m.is_active && managerUserId(m) === u.id)).length === 0)
                        return <p className="text-sm text-gray-400 italic">No hay usuarios disponibles para asignar.</p>;
                      if (disponibles.length === 0)
                        return <p className="text-sm text-gray-400 italic">Sin coincidencias</p>;
                      return disponibles.map(u => (
                          <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border mb-2">
                            <div>
                              <p className="font-medium">{u.nombre} {u.apellido}</p>
                              <p className="text-sm text-gray-600">{u.email}</p>
                            </div>
                            <Button size="sm" onClick={() => handleAssignEncargado(u.id)}>Asignar</Button>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>,
        document.body
      )}
    </div>
  );
}
