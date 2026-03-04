import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  LayoutDashboard, FileText, Clock, CheckCircle2,
  AlertCircle, X, Building2, Search, Filter, ArrowLeft,
  User, Calendar, Loader2,
  ArrowUpCircle, Activity, MessageSquare,
} from "lucide-react";
import {
  apiListPQRS, apiListDependencies, apiListUsers, apiListAllAssignments,
  apiAssignPQRS, apiPatchPQRS, apiRespondPQRS, apiUpdateEstado, apiEscalatePQRS,
  apiGetActivities, apiGetResponses, apiGetEscalations, apiGetAssignments, apiGetPQRS,
  PqrsAPI, Dependency, UsuarioAPI, PqrsResponseAPI, PQRSActivity, PQRSEscalation, AssignmentAPI,
  PQRS_STATUS_LABEL, PQRS_TYPE_LABEL, PQRS_PRIORITY_LABEL,
  formatApiError,
} from "../lib/api";
import { formatDateTime } from "../lib/utils";
import { useAuth } from "../context/AuthContext";

interface RespondForm {
  content: string;
  response_type: "CITIZEN" | "FINAL" | "INTERNAL";
  new_status: string;
}
interface AssignForm {
  responsible_user: string;
  dependency: string;
  notes: string;
}
interface EscalateForm {
  to_dependency: string;
  to_user: string;
  /** Código de motivo (choices del backend). */
  reason: "SLA" | "COMPLEXITY" | "COMPETENCE" | "OTHER";
  /** Texto libre complementario. */
  notes: string;
}

type DetailTab = "respond" | "assign" | "escalate" | "history";

const BADGE_CFG: Record<string, string> = {
  RAD: "bg-blue-100 text-blue-800",
  PRO: "bg-yellow-100 text-yellow-800",
  RES: "bg-green-100 text-green-800",
  CER: "bg-gray-100 text-gray-800",
};
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      BADGE_CFG[status] ?? "bg-gray-100 text-gray-700"
    }`}>
      {PQRS_STATUS_LABEL[status as keyof typeof PQRS_STATUS_LABEL] ?? status}
    </span>
  );
}

export function AdminDashboard() {
  const { usuario } = useAuth();

  // master data
  const [pqrsList, setPqrsList] = useState<PqrsAPI[]>([]);
  const [sinAsignarIds, setSinAsignarIds] = useState<Set<string>>(new Set());
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [allUsers, setAllUsers] = useState<UsuarioAPI[]>([]);

  // UI state
  const [selected, setSelected] = useState<PqrsAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [showFiltros, setShowFiltros] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("respond");

  // assign-tab: driven by the form's own dependency field
  // workload: userId -> active assignment count
  const [userWorkloadMap, setUserWorkloadMap] = useState<Map<string, number>>(new Map());

  // history (lazy loaded per-PQRS)
  const [historyLoading, setHistoryLoading] = useState(false);
  const [responses, setResponses] = useState<PqrsResponseAPI[]>([]);
  const [activities, setActivities] = useState<PQRSActivity[]>([]);
  const [escalations, setEscalations] = useState<PQRSEscalation[]>([]);
  // active assignment for the selected PQRS
  const [activeAssignment, setActiveAssignment] = useState<AssignmentAPI | null>(null);
  const [allAssignments, setAllAssignments] = useState<AssignmentAPI[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState(false);

  const respondForm  = useForm<RespondForm>({ defaultValues: { response_type: "CITIZEN", new_status: "", content: "" } });
  const assignForm   = useForm<AssignForm>({ defaultValues: { responsible_user: "", dependency: "", notes: "" } });
  const escalateForm = useForm<EscalateForm>({ defaultValues: { to_dependency: "", to_user: "", reason: "OTHER", notes: "" } });

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    // Use allSettled so a single failing endpoint doesn't blank out everything else.
    const [pqrsResult, sinAsignarResult, depsResult, usersResult, workloadResult] = await Promise.allSettled([
      apiListPQRS({ page_size: 200 }),
      apiListPQRS({ sin_asignar: true, page_size: 200 }),
      apiListDependencies(true),
      apiListUsers({ page_size: 200 }),
      apiListAllAssignments({ is_active: true, page_size: 500 }),
    ]);

    if (pqrsResult.status === "fulfilled") {
      const items = Array.isArray(pqrsResult.value) ? pqrsResult.value : (pqrsResult.value as any).results ?? [];
      setPqrsList(items.sort((a: PqrsAPI, b: PqrsAPI) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } else {
      toast.error("Error al cargar PQRS", { description: formatApiError(pqrsResult.reason) });
    }

    if (sinAsignarResult.status === "fulfilled") {
      const sinAsignarItems: PqrsAPI[] = Array.isArray(sinAsignarResult.value)
        ? sinAsignarResult.value
        : (sinAsignarResult.value as any).results ?? [];
      setSinAsignarIds(new Set(sinAsignarItems.map((p: PqrsAPI) => p.id)));
    }
    // sinAsignar failing is non-critical — leave existing set as fallback.

    if (depsResult.status === "fulfilled") {
      setDependencies(Array.isArray(depsResult.value) ? depsResult.value : (depsResult.value as any).results ?? []);
    } else {
      toast.error("Error al cargar dependencias", { description: formatApiError(depsResult.reason) });
    }

    if (usersResult.status === "fulfilled") {
      setAllUsers(Array.isArray(usersResult.value) ? usersResult.value : (usersResult.value as any).results ?? []);
    } else {
      toast.error("Error al cargar usuarios", { description: formatApiError(usersResult.reason) });
    }

    if (workloadResult.status === "fulfilled") {
      const assignments: AssignmentAPI[] = Array.isArray(workloadResult.value)
        ? workloadResult.value
        : (workloadResult.value as any).results ?? [];
      const map = new Map<string, number>();
      for (const a of assignments) {
        const uid = typeof a.responsible_user === "string" ? a.responsible_user : a.responsible_user?.id;
        if (uid) map.set(uid, (map.get(uid) ?? 0) + 1);
      }
      setUserWorkloadMap(map);
    }
    // workload load failure is non-critical — no toast needed

    setLoading(false);
  }, []);

  const loadHistory = useCallback(async (pqrsId: string) => {
    setHistoryLoading(true);
    try {
      const [resRes, actRes, escRes, assRes] = await Promise.all([
        apiGetResponses(pqrsId),
        apiGetActivities(pqrsId),
        apiGetEscalations(pqrsId),
        apiGetAssignments(pqrsId),
      ]);
      setResponses(((resRes as any).results ?? []).slice().sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setActivities(((actRes as any).results ?? []).slice().sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setEscalations(((escRes as any).results ?? []).slice().sort((a: any, b: any) => new Date(b.escalated_at ?? b.created_at).getTime() - new Date(a.escalated_at ?? a.created_at).getTime()));
      const list: AssignmentAPI[] = (Array.isArray(assRes) ? assRes : (assRes as any).results ?? [])
        .slice().sort((a: AssignmentAPI, b: AssignmentAPI) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllAssignments(list);
      const active = list.find(a => a.is_active) ?? list[0] ?? null;
      setActiveAssignment(active);
    } catch (e) {
      toast.error("Error al cargar historial", { description: formatApiError(e) });
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadAssignment = (p: PqrsAPI) => {
    setActiveAssignment(null);
    setAssignmentError(false);
    setAssignmentLoading(true);
    apiGetAssignments(p.id)
      .then(res => {
        const list: AssignmentAPI[] = (Array.isArray(res) ? res : (res as any).results ?? [])
          .slice().sort((a: AssignmentAPI, b: AssignmentAPI) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        // eslint-disable-next-line no-console
        console.debug("[AdminDashboard] assignments raw:", list);
        const active = list.find(a => a.is_active) ?? list[0] ?? null;
        setAllAssignments(list);
        setActiveAssignment(active);
        // If assignments endpoint returned nothing but PQRS object has dependency, refresh via detail
        if (!active && !p.dependency) {
          apiGetPQRS(p.id)
            .then(fresh => {
              if (fresh.dependency) {
                setSelected(prev => prev && prev.id === fresh.id ? { ...prev, dependency: fresh.dependency } : prev);
              }
            })
            .catch(() => { /* best-effort */ });
        }
      })
      .catch(err => {
        // eslint-disable-next-line no-console
        console.error("[AdminDashboard] error loading assignment:", err);
        setAssignmentError(true);
        // Still try from PQRS detail as fallback
        apiGetPQRS(p.id)
          .then(fresh => {
            if (fresh.dependency) {
              setSelected(prev => prev && prev.id === fresh.id ? { ...prev, dependency: fresh.dependency } : prev);
            }
          })
          .catch(() => { /* best-effort */ });
      })
      .finally(() => setAssignmentLoading(false));
  };

  const openDetail = (p: PqrsAPI) => {
    setSelected(p);
    setActiveTab("respond");
    respondForm.reset({ response_type: "CITIZEN", new_status: "" });
    assignForm.reset();
    escalateForm.reset();
    setResponses([]);
    setActivities([]);
    setEscalations([]);
    setActiveAssignment(null);
    setAllAssignments([]);
    loadAssignment(p);
  };

  const switchTab = (tab: DetailTab) => {
    setActiveTab(tab);
    if (tab === "history" && selected && responses.length === 0 && activities.length === 0) {
      loadHistory(selected.id);
    }
  };

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile && selected) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selected]);

  const pqrsFiltradas = pqrsList.filter(p => {
    const matchEstado =
      filtroEstado === "todos"       ? true :
      // sin_asignar usa IDs obtenidos del servidor (óptimo: nunca depende de p.dependency)
      filtroEstado === "SIN_ASIGNAR" ? sinAsignarIds.has(p.id) :
      filtroEstado === "RES_CER"     ? (p.status === "RES" || p.status === "CER") :
      p.status === filtroEstado;
    const matchTipo = filtroTipo === "todos" || (p.type ?? p.pqrs_type) === filtroTipo;
    const q = busqueda.toLowerCase();
    const matchBusqueda = q === "" ||
      (p.numero_radicado ?? p.radicado ?? "").toLowerCase().includes(q) ||
      (p.subject ?? "").toLowerCase().includes(q) ||
      (p.user?.nombre ?? p.anonymous_submitter?.nombre ?? "").toLowerCase().includes(q);
    return matchEstado && matchTipo && matchBusqueda;
  });

  const onResponder = async (data: RespondForm) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await apiRespondPQRS({
        pqrs: selected.id,
        content: data.content,
        response_type: data.response_type,
        is_final: data.response_type === "FINAL",
      });
      if (data.new_status && data.new_status !== selected.status) {
        await apiUpdateEstado(selected.id, data.new_status as any);
      }
      toast.success("Respuesta registrada correctamente");
      respondForm.reset({ response_type: "CITIZEN", new_status: "", content: "" });
      await cargarDatos();
      setSelected(null);
    } catch (e) {
      toast.error("Error al guardar respuesta", { description: formatApiError(e) });
    } finally {
      setSubmitting(false);
    }
  };

  const onAsignar = async (data: AssignForm) => {
    if (!selected || !data.responsible_user) return;
    setSubmitting(true);
    const pqrsId = selected.id;
    let newStatus = selected.status;
    try {
      // Resolve the effective dependency: explicit form value takes priority,
      // otherwise fall back to the responsible user's own dependency.
      const responsibleUser = allUsers.find(u => u.id === data.responsible_user) ?? null;
      const userDepId = responsibleUser
        ? (typeof responsibleUser.dependency === "object"
            ? responsibleUser.dependency?.id
            : responsibleUser.dependency as string | undefined)
        : undefined;
      const effectiveDepId = data.dependency || userDepId || undefined;

      const assignPayload: Parameters<typeof apiAssignPQRS>[0] = {
        pqrs: pqrsId,
        responsible_user: data.responsible_user,
        dependency: effectiveDepId,
      };
      if (data.notes.trim()) assignPayload.notes = data.notes.trim();

      // POST /api/pqrs/assign/ → guarda la asignación en la BD
      await apiAssignPQRS(assignPayload);

      // Siempre sincronizar pqrs.dependency para que el filtro ?dependency=
      // en AreaDashboard devuelva las PQRS correctas.
      if (effectiveDepId) {
        try {
          await apiPatchPQRS(pqrsId, { dependency: effectiveDepId });
        } catch (patchErr) {
          // best-effort: el assignment ya fue creado; solo el campo denormalizado falló
          console.warn("[AdminDashboard] no se pudo sincronizar pqrs.dependency:", patchErr);
        }
      }

      // Cambiar estado a "En Proceso" si estaba en "Radicado"
      if (selected.status === "RAD") {
        try {
          const updated = await apiUpdateEstado(pqrsId, "PRO");
          newStatus = updated.status;
        } catch (stateErr) {
          toast.warning("PQRS asignada, pero no se pudo actualizar el estado", {
            description: formatApiError(stateErr),
          });
        }
      }

      const depObj = dependencies.find(d => d.id === effectiveDepId) ?? null;
      const patched: PqrsAPI = {
        ...selected,
        dependency: depObj,
        status: newStatus as PqrsAPI["status"],
      };
      setSelected(patched);
      setPqrsList(prev => prev.map(p => p.id === pqrsId ? patched : p));
      // Update active assignment info locally so Área row and history reflect immediately
      const newAssignment: AssignmentAPI = {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        pqrs: pqrsId,
        responsible_user: responsibleUser ?? data.responsible_user,
        dependency: depObj,
        assigned_by_user: "",
        is_active: true,
        created_at: new Date().toISOString(),
        notes: data.notes ?? "",
      };
      setActiveAssignment(newAssignment);
      // mark previous assignments as inactive and prepend the new one
      setAllAssignments(prev => [
        newAssignment,
        ...prev.map(a => ({ ...a, is_active: false })),
      ]);
      setAssignmentError(false);

      toast.success(`PQRS asignada correctamente${
        depObj ? ` a ${depObj.name}` : ""
      }${
        responsibleUser ? ` → ${responsibleUser.nombre} ${responsibleUser.apellido}` : ""
      }`);
      assignForm.reset();

      // Refrescar en segundo plano para actualizar contadores sin_asignar
      cargarDatos();
    } catch (e) {
      toast.error("Error al asignar PQRS", { description: formatApiError(e) });
    } finally {
      setSubmitting(false);
    }
  };

  const onEscalar = async (data: EscalateForm) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const payload: any = { pqrs: selected.id, reason: data.reason };
      if (data.notes.trim()) payload.notes = data.notes.trim();
      if (data.to_dependency) payload.to_dependency = data.to_dependency;
      if (data.to_user) payload.to_user = data.to_user;
      await apiEscalatePQRS(payload);
      toast.success("PQRS escalada. Se notificó al área/usuario destino.");
      escalateForm.reset();
      await cargarDatos();
      setSelected(null);
    } catch (e) {
      toast.error("Error al escalar PQRS", { description: formatApiError(e) });
    } finally {
      setSubmitting(false);
    }
  };

  const total         = pqrsList.length;
  const rad           = pqrsList.filter(p => p.status === "RAD").length;
  const pro           = pqrsList.filter(p => p.status === "PRO").length;
  const res           = pqrsList.filter(p => p.status === "RES" || p.status === "CER").length;
  // sinAsignar viene del servidor (filtro server-side), no de p.dependency
  const sinAsignar    = sinAsignarIds.size;
  const nonStaffUsers = allUsers.filter(u => !u.is_staff);

  /** Resolves dependency name using the loaded `dependencies` list as ground truth. */
  const depNameFor = (dep: Dependency | string | null | undefined): string | null => {
    if (!dep) return null;
    if (typeof dep !== "string") return dep.name;
    return dependencies.find(d => d.id === dep)?.name ?? null;
  };

  const selectedDepId = assignForm.watch("dependency");
  const filteredAssignUsers = allUsers.filter(u => {
    if (!selectedDepId) return true;
    const uid = typeof u.dependency === "string" ? u.dependency : u.dependency?.id ?? "";
    return uid === selectedDepId;
  });
  // El endpoint de lista devuelve `submitter` (string); el detalle puede devolver user/anonymous_submitter
  const contactName = (p: PqrsAPI) => {
    if (p.user) return `${p.user.nombre} ${p.user.apellido}`.trim();
    if (p.anonymous_submitter?.nombre) return p.anonymous_submitter.nombre;
    const sub = (p as any).submitter as string | undefined;
    return sub || "Anónimo";
  };

  const TABS: { id: DetailTab; label: string }[] = [
    { id: "respond",  label: "Responder"    },
    { id: "assign",   label: "Asignar Área" },
    { id: "escalate", label: "Escalar"      },
    { id: "history",  label: "Historial"    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header + admin quick-nav */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
              <p className="text-sm text-gray-500">Bienvenido, {usuario?.nombre}</p>
            </div>
          </div>

        </div>

        {/* Stats – clickable filters */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { icon: FileText,    label: "Total",       value: total,      color: "text-blue-600",  filterKey: "todos"        },
            { icon: AlertCircle, label: "Radicadas",   value: rad,        color: "text-blue-500",  filterKey: "RAD"          },
            { icon: Clock,       label: "En Proceso",  value: pro,        color: "text-yellow-600",filterKey: "PRO"          },
            { icon: CheckCircle2,label: "Resueltas",   value: res,        color: "text-green-600", filterKey: "RES_CER"      },
            { icon: Building2,   label: "Sin Asignar", value: sinAsignar, color: "text-red-500",   filterKey: "SIN_ASIGNAR" },
          ].map(({ icon: Icon, label, value, color, filterKey }) => {
            const isActive = filtroEstado === filterKey;
            return (
              <button
                key={label}
                onClick={() => setFiltroEstado(isActive ? "todos" : filterKey)}
                className={`text-left w-full rounded-xl border shadow-sm transition-all
                  ${ isActive
                    ? "border-blue-500 ring-2 ring-blue-300 bg-white"
                    : "border-transparent bg-white hover:shadow-md hover:border-gray-200"
                  }`}
              >
                <div className="p-4 flex items-center gap-3">
                  <Icon className={`w-8 h-8 ${color}`} />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className={`text-xs ${isActive ? "text-blue-600 font-semibold" : "text-gray-500"}`}>{label}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* List panel */}
          <div className={`flex-1 ${selected ? "hidden lg:block" : "block"}`}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">PQRS Registradas</CardTitle>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por radicado, asunto o nombre..."
                      className="pl-8 h-9 text-sm"
                      value={busqueda}
                      onChange={e => setBusqueda(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowFiltros(!showFiltros)}>
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
                {showFiltros && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <select
                      className="border rounded-md px-2 py-1.5 text-sm bg-white"
                      value={filtroEstado}
                      onChange={e => setFiltroEstado(e.target.value)}
                    >
                      <option value="todos">Todos los estados</option>
                      <option value="RAD">Radicado</option>
                      <option value="PRO">En Proceso</option>
                      <option value="RES">Resuelto</option>
                      <option value="CER">Cerrado</option>
                    </select>
                    <select
                      className="border rounded-md px-2 py-1.5 text-sm bg-white"
                      value={filtroTipo}
                      onChange={e => setFiltroTipo(e.target.value)}
                    >
                      <option value="todos">Todos los tipos</option>
                      <option value="PE">Petición</option>
                      <option value="Q">Queja</option>
                      <option value="R">Reclamo</option>
                      <option value="S">Sugerencia</option>
                      <option value="F">Felicitación</option>
                    </select>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : pqrsFiltradas.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No se encontraron PQRS</p>
                  </div>
                ) : (
                  <div className="divide-y max-h-[60vh] overflow-y-auto">
                    {pqrsFiltradas.map(p => (
                      <button
                        key={p.id}
                        onClick={() => openDetail(p)}
                        className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors ${selected?.id === p.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono text-blue-600 mb-0.5">{p.numero_radicado ?? p.radicado}</p>
                            <p className="text-sm font-medium text-gray-900 truncate">{p.subject}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{contactName(p)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <StatusBadge status={p.status} />
                            <span className="text-xs text-gray-400">{PQRS_TYPE_LABEL[(p.type ?? p.pqrs_type) as keyof typeof PQRS_TYPE_LABEL]}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-full lg:w-[500px] shrink-0">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <button
                      className="lg:hidden flex items-center gap-1 text-sm text-blue-600"
                      onClick={() => setSelected(null)}
                    >
                      <ArrowLeft className="w-4 h-4" /> Volver
                    </button>
                    <CardTitle className="text-base">Detalle PQRS</CardTitle>
                    <button onClick={() => setSelected(null)} className="hidden lg:block text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[75vh] overflow-y-auto">
                  {/* Info */}
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Radicado</span>
                      <span className="font-mono text-blue-600 font-medium">{selected.numero_radicado ?? selected.radicado}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tipo</span>
                      <span>{PQRS_TYPE_LABEL[(selected.type ?? selected.pqrs_type) as keyof typeof PQRS_TYPE_LABEL]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Prioridad</span>
                      <span>{PQRS_PRIORITY_LABEL[selected.priority as keyof typeof PQRS_PRIORITY_LABEL]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Estado</span>
                      <StatusBadge status={selected.status} />
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-gray-500">Área</span>
                      {assignmentLoading ? (
                        <span className="text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Cargando...</span>
                      ) : assignmentError && !selected.dependency ? (
                        <button
                          className="text-xs text-red-400 underline"
                          onClick={() => selected && loadAssignment(selected)}
                        >Error al cargar — reintentar</button>
                      ) : (() => {
                        // resolve area: prefer active assignment dependency, fall back to pqrs.dependency
                        const depFromAssignment = activeAssignment?.dependency;
                        const depName =
                          depFromAssignment && typeof depFromAssignment === "object"
                            ? (depFromAssignment as Dependency).name
                            : typeof depFromAssignment === "string"
                              ? (dependencies.find(d => d.id === depFromAssignment)?.name ?? depFromAssignment)
                              : selected.dependency?.name;
                        // resolve responsible user
                        const ru = activeAssignment?.responsible_user;
                        const ruName = ru
                          ? typeof ru === "object"
                            ? `${(ru as UsuarioAPI).nombre} ${(ru as UsuarioAPI).apellido}`.trim()
                            : (allUsers.find(u => u.id === ru)?.nombre ?? ru)
                          : null;
                        return depName || ruName ? (
                          <span className="text-right">
                            {depName && <span className="text-blue-700 font-medium">{depName}</span>}
                            {ruName && <span className="block text-xs text-gray-500">({ruName})</span>}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Sin asignar</span>
                        );
                      })()}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ciudadano</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{contactName(selected)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fecha</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateTime(selected.created_at)}</span>
                    </div>
                    {selected.due_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Vence</span>
                        <span className="text-orange-600 font-medium">{formatDateTime(selected.due_date)}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">{selected.subject}</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selected.description}</p>
                  </div>

                  {/* Tabs – 4 sections */}
                  <div className="grid grid-cols-4 border rounded-lg overflow-hidden text-xs">
                    {TABS.map(t => (
                      <button
                        key={t.id}
                        className={`py-2 font-medium transition-colors ${
                          activeTab === t.id ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                        onClick={() => switchTab(t.id)}
                      >{t.label}</button>
                    ))}
                  </div>

                  {/* ── Tab: Responder ── */}
                  {activeTab === "respond" && (
                    <form onSubmit={respondForm.handleSubmit(onResponder)} className="space-y-3">
                      <div>
                        <Label className="text-sm">Tipo de respuesta</Label>
                        <select className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-white" {...respondForm.register("response_type")}>
                          <option value="CITIZEN">Respuesta al ciudadano</option>
                          <option value="FINAL">Respuesta final (cierra)</option>
                          <option value="INTERNAL">Nota interna</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-sm">Cambiar estado (opcional)</Label>
                        <select className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-white" {...respondForm.register("new_status")}>
                          <option value="">— Sin cambiar —</option>
                          <option value="RAD">Radicado</option>
                          <option value="PRO">En Proceso</option>
                          <option value="RES">Resuelto</option>
                          <option value="CER">Cerrado</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-sm">Respuesta *</Label>
                        <Textarea className="mt-1 text-sm" rows={4} placeholder="Escriba la respuesta o nota..." {...respondForm.register("content", { required: "Campo obligatorio" })} />
                        {respondForm.formState.errors.content && <p className="text-red-500 text-xs mt-1">{respondForm.formState.errors.content.message}</p>}
                      </div>
                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : "Guardar Respuesta"}
                      </Button>
                    </form>
                  )}

                  {/* ── Tab: Asignar Área ── */}
                  {activeTab === "assign" && (
                    <form onSubmit={assignForm.handleSubmit(onAsignar)} className="space-y-3">
                      <div>
                        <Label className="text-sm">Área responsable (opcional)</Label>
                        <select
                          className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-white"
                          {...assignForm.register("dependency", {
                            onChange: () => assignForm.setValue("responsible_user", "")
                          })}
                        >
                          <option value="">Sin área específica...</option>
                          {dependencies.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                        </select>
                        {userWorkloadMap.size > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {selectedDepId
                              ? `${filteredAssignUsers.length} usuario${filteredAssignUsers.length !== 1 ? "s" : ""} en esta área — ordenados por carga`
                              : "Responsables ordenados por carga de asignaciones activas"}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm">Responsable *</Label>
                        <select className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-white" {...assignForm.register("responsible_user", { required: "Seleccione un responsable" })}>
                          <option value="">Seleccionar responsable...</option>
                          {[...filteredAssignUsers]
                            .sort((a, b) => (userWorkloadMap.get(a.id) ?? 0) - (userWorkloadMap.get(b.id) ?? 0))
                            .map(u => {
                              const load = userWorkloadMap.get(u.id) ?? 0;
                              const loadLabel = userWorkloadMap.size > 0
                                ? (load === 0 ? " — sin asignaciones" : ` — ${load} asignación${load !== 1 ? "es" : ""}`)
                                : "";
                              const area = !selectedDepId ? (depNameFor(u.dependency) ?? "Sin área") + " · " : "";
                              return (
                                <option key={u.id} value={u.id}>
                                  {u.nombre} {u.apellido} · {area}{u.email}{loadLabel}
                                </option>
                              );
                            })}
                        </select>
                        {assignForm.formState.errors.responsible_user && <p className="text-red-500 text-xs mt-1">{assignForm.formState.errors.responsible_user.message}</p>}
                        {filteredAssignUsers.length === 0 && selectedDepId && (
                          <p className="text-amber-600 text-xs mt-1">No hay usuarios en esta área.</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm">Notas de asignación (opcional)</Label>
                        <Textarea className="mt-1 text-sm" rows={3} placeholder="Instrucciones o contexto para el área..." {...assignForm.register("notes")} />
                      </div>
                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Asignando...</> : "Asignar a Área"}
                      </Button>
                    </form>
                  )}

                  {/* ── Tab: Escalar ── */}
                  {activeTab === "escalate" && (
                    <form onSubmit={escalateForm.handleSubmit(onEscalar)} className="space-y-3">
                      <p className="text-xs text-gray-500 bg-orange-50 border border-orange-100 rounded p-2">
                        Escala esta PQRS a otra área o usuario. El destino recibirá una notificación automática.
                      </p>
                      <div>
                        <Label className="text-sm">Área destino (opcional)</Label>
                        <select className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-white" {...escalateForm.register("to_dependency")}>
                          <option value="">— Sin cambio de área —</option>
                          {dependencies.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                        </select>
                      </div>
                      <div>
                        <Label className="text-sm">Usuario destino (opcional)</Label>
                        <select className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-white" {...escalateForm.register("to_user")}>
                          <option value="">— Sin usuario específico —</option>
                          {nonStaffUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.nombre} {u.apellido} — {u.email}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-sm">Motivo *</Label>
                        <select className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-white" {...escalateForm.register("reason", { required: "El motivo es obligatorio" })}>
                          <option value="SLA">Vencimiento SLA</option>
                          <option value="COMPLEXITY">Complejidad del caso</option>
                          <option value="COMPETENCE">Competencia de otra área</option>
                          <option value="OTHER">Otro</option>
                        </select>
                        {escalateForm.formState.errors.reason && <p className="text-red-500 text-xs mt-1">{escalateForm.formState.errors.reason.message}</p>}
                      </div>
                      <div>
                        <Label className="text-sm">Notas adicionales (opcional)</Label>
                        <Textarea className="mt-1 text-sm" rows={3} placeholder="Información adicional sobre la escalación..." {...escalateForm.register("notes")} />
                      </div>
                      <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={submitting}>
                        {submitting
                          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Escalando...</>
                          : <><ArrowUpCircle className="w-4 h-4 mr-2" />Escalar PQRS</>}
                      </Button>
                    </form>
                  )}

                  {/* ── Tab: Historial ── */}
                  {activeTab === "history" && (
                    <div className="space-y-4">
                      {historyLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
                          <span className="text-sm text-gray-500">Cargando historial...</span>
                        </div>
                      ) : (
                        <>
                          {/* Assignments */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-2">
                              <Building2 className="w-3 h-3" /> Asignaciones ({allAssignments.length})
                            </h4>
                            {allAssignments.length === 0
                              ? <p className="text-xs text-gray-400 italic">Sin asignaciones registradas.</p>
                              : allAssignments.map(a => {
                                  const depField = a.dependency;
                                  const depObj = depField && typeof depField === "object"
                                    ? depField as Dependency
                                    : dependencies.find(d => d.id === depField) ?? null;
                                  const ruField = a.responsible_user;
                                  const ruObj = ruField && typeof ruField === "object"
                                    ? ruField as UsuarioAPI
                                    : allUsers.find(u => u.id === ruField) ?? null;
                                  const assignedByField = a.assigned_by_user;
                                  const assignedByObj = assignedByField && typeof assignedByField === "object"
                                    ? assignedByField as UsuarioAPI
                                    : allUsers.find(u => u.id === assignedByField) ?? null;
                                  return (
                                    <div key={a.id} className={`border rounded-lg p-3 mb-2 text-xs ${
                                      a.is_active ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200 opacity-70"
                                    }`}>
                                      <div className="flex justify-between items-center mb-1">
                                        <span className={`font-medium px-1.5 py-0.5 rounded ${
                                          a.is_active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                                        }`}>{a.is_active ? "Activa" : "Histórica"}</span>
                                        <span className="text-gray-400">{formatDateTime(a.created_at)}</span>
                                      </div>
                                      {depObj && <p className="text-gray-700">Área: <span className="font-medium">{depObj.name}</span>{depObj.code ? ` (${depObj.code})` : ""}</p>}
                                      {ruObj && <p className="text-gray-700">Responsable: <span className="font-medium">{ruObj.nombre} {ruObj.apellido}</span></p>}
                                      {assignedByObj && <p className="text-gray-400 mt-0.5">Asignado por: {assignedByObj.nombre} {assignedByObj.apellido}</p>}
                                      {a.notes && <p className="text-gray-600 italic mt-1">"{a.notes}"</p>}
                                    </div>
                                  );
                                })
                            }
                          </div>

                          {/* Responses */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-2">
                              <MessageSquare className="w-3 h-3" /> Respuestas ({responses.length})
                            </h4>
                            {responses.length === 0
                              ? <p className="text-xs text-gray-400 italic">Sin respuestas registradas.</p>
                              : responses.map(r => (
                                  <div key={r.id} className="border rounded-lg p-3 mb-2 text-sm bg-white">
                                    <div className="flex justify-between mb-1">
                                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                        r.response_type === "FINAL"    ? "bg-green-100 text-green-700" :
                                        r.response_type === "INTERNAL" ? "bg-gray-100 text-gray-600"  :
                                                                          "bg-blue-100 text-blue-700"
                                      }`}>
                                        {r.response_type === "FINAL" ? "Respuesta Final" : r.response_type === "INTERNAL" ? "Nota Interna" : "Respuesta Ciudadano"}
                                      </span>
                                      <span className="text-xs text-gray-400">{formatDateTime(r.created_at)}</span>
                                    </div>
                                    <p className="text-gray-700 whitespace-pre-wrap text-xs">{r.content}</p>
                                    <p className="text-xs text-gray-400 mt-1">Por: {(() => {
                                      const raw = r.responded_by ?? r.user ?? r.created_by;
                                      if (!raw) return "—";
                                      if (typeof raw === "object") return `${(raw as UsuarioAPI).nombre ?? ""} ${(raw as UsuarioAPI).apellido ?? ""}`.trim() || (raw as UsuarioAPI).email || (raw as UsuarioAPI).username || "—";
                                      const found = allUsers.find(u => u.id === raw);
                                      return found ? `${found.nombre} ${found.apellido}`.trim() : raw;
                                    })()}</p>
                                  </div>
                                ))
                            }
                          </div>

                          {/* Escalations */}
                          {escalations.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-2">
                                <ArrowUpCircle className="w-3 h-3" /> Escalaciones ({escalations.length})
                              </h4>
                              {escalations.map(e => (
                                <div key={e.id} className="border border-orange-100 rounded-lg p-3 mb-2 text-sm bg-orange-50">
                                  <div className="flex justify-between mb-1">
                                    <span className="text-xs font-medium text-orange-700">{e.reason_display ?? e.reason}</span>
                                    <span className="text-xs text-gray-400">{formatDateTime(e.escalated_at)}</span>
                                  </div>
                                  {e.to_dependency && (() => {
                                    const depId = typeof e.to_dependency === "string" ? e.to_dependency : (e.to_dependency as any).id;
                                    const dep = dependencies.find(d => d.id === depId);
                                    return <p className="text-xs text-gray-600">→ Área: {dep ? `${dep.name} (${dep.code})` : depId}</p>;
                                  })()}
                                  {e.to_user && (() => {
                                    const userId = typeof e.to_user === "string" ? e.to_user : (e.to_user as any).id;
                                    const u = allUsers.find(u => u.id === userId);
                                    return <p className="text-xs text-gray-600">→ Usuario: {u ? `${u.nombre} ${u.apellido}` : userId}</p>;
                                  })()}
                                  {e.notes && <p className="text-gray-700 text-xs mt-1 italic">{e.notes}</p>}
                                  <p className="text-xs text-gray-400 mt-1">Por: {e.from_user?.nombre} {e.from_user?.apellido}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Activities */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-2">
                              <Activity className="w-3 h-3" /> Bitácora ({activities.length})
                            </h4>
                            {activities.length === 0
                              ? <p className="text-xs text-gray-400 italic">Sin actividades registradas.</p>
                              : activities.map(a => (
                                  <div key={a.id} className="flex gap-2 py-2 border-b last:border-0 text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-gray-700 text-xs">{a.description}</p>
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        {formatDateTime(a.created_at)}
                                        {a.created_by && ` · ${a.created_by.nombre} ${a.created_by.apellido}`}
                                      </p>
                                    </div>
                                  </div>
                                ))
                            }
                          </div>

                          <Button variant="outline" size="sm" className="w-full" onClick={() => loadHistory(selected!.id)}>
                            <Activity className="w-4 h-4 mr-1" /> Actualizar historial
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
