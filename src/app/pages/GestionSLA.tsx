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
import { TrendingUp, Plus, Edit, Trash2, X, Loader2, Search } from "lucide-react";
import {
  apiListSLA, apiCreateSLA, apiUpdateSLA, apiDeleteSLA,
  formatApiError,
  PQRS_TYPE_LABEL, PQRS_PRIORITY_LABEL,
  type SLAPolicy, type SLAPayload, type PqrsType, type PqrsPriority,
} from "../lib/api";

interface SLAForm extends SLAPayload {}

const PRIORITY_ORDER: PqrsPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];
const TYPE_ORDER: PqrsType[]         = ["P", "Q", "R", "S", "F"];

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700",
  HIGH:   "bg-orange-100 text-orange-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW:    "bg-green-100 text-green-700",
};

export function GestionSLA({ onClose }: { onClose?: () => void } = {}) {
  const navigate = useNavigate();

  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SLAPolicy | null>(null);

  // search & filter
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>("todos");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SLAForm>({
    defaultValues: {
      name: "",
      pqrs_type: "P",
      priority: "MEDIUM",
      business_days: 15,
      description: "",
    },
  });

  // ── data loading ──────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiListSLA();
      setPolicies(Array.isArray(res) ? res : (res as any).results ?? []);
    } catch (e) {
      toast.error("Error al cargar políticas SLA", { description: formatApiError(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── form handlers ─────────────────────────────────────────────────────────
  const handleEdit = (p: SLAPolicy) => {
    setEditingPolicy(p);
    reset({
      name: p.name,
      pqrs_type: p.pqrs_type,
      priority: p.priority,
      business_days: p.business_days,
      description: p.description ?? "",
    });
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingPolicy(null);
    reset();
  };

  const onSubmit = async (data: SLAForm) => {
    setSubmitting(true);
    try {
      if (editingPolicy) {
        await apiUpdateSLA(editingPolicy.id, data);
        toast.success("Política SLA actualizada correctamente");
      } else {
        await apiCreateSLA(data);
        toast.success("Política SLA creada correctamente");
      }
      await cargarDatos();
      handleCancelForm();
    } catch (e) {
      toast.error("Error al guardar política SLA", { description: formatApiError(e) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (p: SLAPolicy) => {
    if (!confirm(`¿Eliminar la política SLA "${p.name}"?`)) return;
    try {
      await apiDeleteSLA(p.id);
      toast.success("Política SLA eliminada");
      await cargarDatos();
    } catch (e) {
      toast.error("Error al eliminar política", { description: formatApiError(e) });
    }
  };

  // ── derived (search & filter) ────────────────────────────────────────────
  const tieneResultados = TYPE_ORDER.some(t =>
    (filtroTipo === "todos" || filtroTipo === t) &&
    policies.some(p =>
      p.pqrs_type === t &&
      (filtroPrioridad === "todos" || p.priority === filtroPrioridad) &&
      (busqueda === "" || p.name.toLowerCase().includes(busqueda.toLowerCase()))
    )
  );

  // ── render ─────────────────────────────────────────────────────────────────────────────────────────────────
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
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Políticas SLA</h1>
          </div>
          <p className="text-gray-600">
            Define los días hábiles máximos para responder según tipo y prioridad de PQRS.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onClose ? onClose() : navigate("/admin")}>
            {onClose ? "Cerrar" : "Volver al Panel"}
          </Button>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nueva Política
            </Button>
          )}
        </div>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingPolicy ? "Editar Política SLA" : "Nueva Política SLA"}</CardTitle>
              <Button variant="ghost" size="icon" onClick={handleCancelForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Define cuántos días hábiles tiene el equipo para resolver una PQRS de este tipo y prioridad.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Name */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="sla-name">Nombre *</Label>
                  <Input
                    id="sla-name"
                    placeholder="Ej: SLA Queja Alta Prioridad"
                    {...register("name", {
                      required: "El nombre es obligatorio",
                      minLength: { value: 3, message: "Mínimo 3 caracteres" },
                    })}
                  />
                  {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                </div>

                {/* PQRS Type */}
                <div className="space-y-2">
                  <Label htmlFor="sla-type">Tipo de PQRS *</Label>
                  <select
                    id="sla-type"
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                    {...register("pqrs_type", { required: true })}
                  >
                    {TYPE_ORDER.map(t => (
                      <option key={t} value={t}>{PQRS_TYPE_LABEL[t]} ({t})</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label htmlFor="sla-priority">Prioridad *</Label>
                  <select
                    id="sla-priority"
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                    {...register("priority", { required: true })}
                  >
                    {PRIORITY_ORDER.map(p => (
                      <option key={p} value={p}>{PQRS_PRIORITY_LABEL[p]} ({p})</option>
                    ))}
                  </select>
                </div>

                {/* Business days */}
                <div className="space-y-2">
                  <Label htmlFor="sla-days">Días hábiles *</Label>
                  <Input
                    id="sla-days"
                    type="number"
                    min={1}
                    max={365}
                    placeholder="Ej: 15"
                    {...register("business_days", {
                      required: "Los días son obligatorios",
                      min: { value: 1, message: "Mínimo 1 día" },
                      max: { value: 365, message: "Máximo 365 días" },
                      valueAsNumber: true,
                    })}
                  />
                  {errors.business_days && <p className="text-sm text-red-600">{errors.business_days.message}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="sla-desc">Descripción (opcional)</Label>
                  <Textarea
                    id="sla-desc"
                    placeholder="Notas adicionales sobre esta política..."
                    rows={2}
                    {...register("description")}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
                    : editingPolicy ? "Actualizar Política" : "Crear Política"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelForm} disabled={submitting}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      {policies.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="pl-8 h-9 text-sm"
              placeholder="Buscar por nombre..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <select
            className="border rounded-md px-3 py-1.5 text-sm bg-white h-9"
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
          >
            <option value="todos">Todos los tipos</option>
            {TYPE_ORDER.map(t => (
              <option key={t} value={t}>{PQRS_TYPE_LABEL[t]}</option>
            ))}
          </select>
          <select
            className="border rounded-md px-3 py-1.5 text-sm bg-white h-9"
            value={filtroPrioridad}
            onChange={e => setFiltroPrioridad(e.target.value)}
          >
            <option value="todos">Todas las prioridades</option>
            {PRIORITY_ORDER.map(p => (
              <option key={p} value={p}>{PQRS_PRIORITY_LABEL[p]}</option>
            ))}
          </select>
          {(busqueda || filtroTipo !== "todos" || filtroPrioridad !== "todos") && (
            <Button variant="ghost" size="sm" className="text-gray-500"
              onClick={() => { setBusqueda(""); setFiltroTipo("todos"); setFiltroPrioridad("todos"); }}>
              Limpiar
            </Button>
          )}
        </div>
      )}

      {/* Policies grid grouped by Type */}
      {policies.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="font-medium">No hay políticas SLA configuradas</p>
          <p className="text-sm mt-1">Cree la primera política usando el botón superior</p>
        </div>
      ) : (
        <div className="space-y-8">
          {!tieneResultados && policies.length > 0 && (
            <div className="py-12 text-center text-gray-500">
              <Search className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <p className="font-medium">Sin resultados</p>
              <p className="text-sm mt-1">Intente con otro término o cambie los filtros</p>
            </div>
          )}
          {TYPE_ORDER
            .filter(t =>
              (filtroTipo === "todos" || filtroTipo === t) &&
              policies.some(p =>
                p.pqrs_type === t &&
                (filtroPrioridad === "todos" || p.priority === filtroPrioridad) &&
                (busqueda === "" || p.name.toLowerCase().includes(busqueda.toLowerCase()))
              )
            )
            .map(type => (
            <div key={type}>
              <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                {PQRS_TYPE_LABEL[type]} ({type})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {PRIORITY_ORDER
                  .filter(pr =>
                    (filtroPrioridad === "todos" || filtroPrioridad === pr) &&
                    policies.some(p =>
                      p.pqrs_type === type && p.priority === pr &&
                      (busqueda === "" || p.name.toLowerCase().includes(busqueda.toLowerCase()))
                    )
                  )
                  .map(priority => {
                    const p = policies.find(pl => pl.pqrs_type === type && pl.priority === priority)!;
                    return (
                      <Card key={p.id} className="border">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <Badge className={`text-xs mb-1 ${PRIORITY_COLOR[priority] ?? ""}`}>
                                {PQRS_PRIORITY_LABEL[priority]}
                              </Badge>
                              <CardTitle className="text-sm leading-tight">{p.name}</CardTitle>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <div className="text-center py-2 bg-blue-50 rounded-lg">
                            <p className="text-3xl font-bold text-blue-700">{p.business_days}</p>
                            <p className="text-xs text-blue-500">días hábiles</p>
                          </div>
                          {p.description && (
                            <p className="text-xs text-gray-500">{p.description}</p>
                          )}
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleEdit(p)}
                            >
                              <Edit className="h-3 w-3 mr-1" /> Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(p)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                }
              </div>
            </div>
          ))}

          {/* Flat list of any uncategorized policies */}
          {policies.some(p => !TYPE_ORDER.includes(p.pqrs_type)) && (
            <div>
              <h2 className="text-base font-semibold text-gray-700 mb-3">Otras políticas</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {policies.filter(p => !TYPE_ORDER.includes(p.pqrs_type)).map(p => (
                  <Card key={p.id} className="border">
                    <CardContent className="p-4">
                      <p className="font-medium text-gray-800">{p.name}</p>
                      <p className="text-sm text-gray-500">
                        {p.pqrs_type} · {PQRS_PRIORITY_LABEL[p.priority]}
                      </p>
                      <p className="text-2xl font-bold text-blue-700 mt-1">{p.business_days} días</p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(p)}>
                          <Edit className="h-3 w-3 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDelete(p)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
