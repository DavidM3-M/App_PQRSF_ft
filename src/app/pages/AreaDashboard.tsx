/**
 * @file AreaDashboard.tsx
 * @description Panel de gestión de PQRS asignadas a una dependencia/área institucional.
 *              Permite al funcionario de área ver, filtrar y responder las PQRS que le
 *              han sido asignadas, así como actualizar su estado.
 * @author Sistema PQRS Institucional
 * @date 2026-03-04
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Building2, FileText, Clock, CheckCircle2, AlertCircle, X, User, Calendar, ArrowLeft, Loader2, LayoutDashboard, Search, FileDown, FileSpreadsheet, ChevronDown, BarChart2, Target, RefreshCw } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend, Sector,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import {
  apiListPQRS, apiRespondPQRS, apiUpdateEstado, apiListAllAssignments, apiGetPQRS,
  apiExportCSVArea, apiExportExcelArea, ExportFilters,
  PqrsAPI, AssignmentAPI, PQRS_STATUS_LABEL, PQRS_TYPE_LABEL, PQRS_PRIORITY_LABEL,
  formatApiError
} from "../lib/api";
import { formatDateTime } from "../lib/utils";

/**
 * Estructura del formulario de respuesta a una PQRS.
 *
 * @property response_text  - Contenido textual de la respuesta o nota interna.
 * @property response_type  - Tipo de respuesta:
 *   - `CITIZEN`  → Respuesta dirigida al ciudadano.
 *   - `FINAL`    → Respuesta final/cierre del caso.
 *   - `INTERNAL` → Nota interna (no visible para el ciudadano).
 * @property new_status - Nuevo estado al que se desea mover la PQRS (vacío = sin cambio).
 */
interface RespondForm {
  response_text: string;
  response_type: "CITIZEN" | "FINAL" | "INTERNAL";
  new_status: string;
}

/**
 * Componente principal del Panel de Área.
 *
 * Muestra las PQRS asignadas a la dependencia del usuario autenticado,
 * ofrece filtrado por estado y un panel lateral para gestionar (responder /
 * cambiar estado) cada PQRS seleccionada.
 *
 * Estrategia de carga de datos:
 * 1. Se consultan las PQRS cuya `dependency` coincida con la del usuario.
 * 2. En paralelo, se obtiene la lista de asignaciones activas para capturar
 *    PQRS que pueden no aparecer en el endpoint principal.
 * 3. Las PQRS faltantes se recuperan individualmente y se fusionan,
 *    eliminando duplicados.
 *
 * @returns JSX del panel de área responsivo (lista + panel de detalle/respuesta).
 */
export function AreaDashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  /** Lista completa de PQRS asignadas a la dependencia del usuario. */
  const [pqrsList, setPqrsList] = useState<PqrsAPI[]>([]);

  /** PQRS actualmente seleccionada para ver detalle / responder. */
  const [selected, setSelected] = useState<PqrsAPI | null>(null);

  /** Indica si la carga inicial (o recarga) de PQRS está en curso. */
  const [loading, setLoading] = useState(true);

  /** Indica si el envío del formulario de respuesta está en curso. */
  const [submitting, setSubmitting] = useState(false);

  /** Valor del filtro de estado activo (`"todos"` muestra todas). */
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // ── Modo de vista: lista de PQRS o gráficas de analytics ─────────────────
  const [viewMode, setViewMode]     = useState<"list" | "analytics">("list");
  /** Días del período para filtrar las gráficas (0 = todo el histórico). */
  const [periodDays, setPeriodDays] = useState(30);
  /** Índice del sector activo en la dona de estado. */
  const [activeEstadoIndex, setActiveEstadoIndex] = useState<number | undefined>(undefined);

  // ── Exportación de reportes por área ─────────────────────────────────────
  /** Controla la visibilidad del panel de exportación. */
  const [showExport, setShowExport] = useState(false);
  /** Formato que se está descargando actualmente, o null si no hay descarga en curso. */
  const [exporting, setExporting] = useState<"csv" | "excel" | null>(null);
  /** Filtros opcionales aplicados al exportar. */
  const [exportFilters, setExportFilters] = useState<ExportFilters>({});

  /** Fuerza la descarga de un Blob como archivo. */
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Dispara la exportación del reporte de área en CSV o Excel.
   * Llama a los endpoints `/api/pqrs/exportar_csv_area/` o
   * `/api/pqrs/exportar_excel_area/` con los filtros activos.
   */
  const handleExport = async (format: "csv" | "excel") => {
    setExporting(format);
    try {
      const result = format === "csv"
        ? await apiExportCSVArea(exportFilters)
        : await apiExportExcelArea(exportFilters);
      triggerDownload(result.blob, result.filename);
      toast.success(`Reporte ${format.toUpperCase()} descargado correctamente`);
    } catch (e) {
      toast.error(`Error al exportar ${format.toUpperCase()}`, { description: formatApiError(e) });
    } finally {
      setExporting(null);
    }
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RespondForm>({
    defaultValues: { response_type: "CITIZEN", new_status: "" },
  });

  /**
   * Carga (o recarga) todas las PQRS asignadas al área del usuario.
   *
   * Utiliza `Promise.allSettled` para ejecutar en paralelo dos consultas:
   *   - **Primaria**: PQRS filtradas por `dependency` del usuario.
   *   - **Secundaria**: Asignaciones activas (puede fallar silenciosamente).
   *
   * Las PQRS referenciadas en asignaciones pero ausentes de la consulta
   * primaria se recuperan de forma individual y se incorporan al listado.
   * El resultado final se desduplicha por `id` y se ordena de más reciente
   * a más antiguo.
   *
   * Memorizado con `useCallback` para evitar re-creaciones innecesarias;
   * solo cambia si `dependencyId` o `id` del usuario cambian.
   */
  const cargarPQRS = useCallback(async () => {
    setLoading(true);
    try {
      const depId = usuario?.dependencyId;
      const userId = usuario?.id;

      // Consulta primaria: PQRS cuya dependencia coincide con la del usuario.
      // Consulta secundaria: asignaciones activas (fallará silenciosamente si
      // el endpoint no está disponible gracias a allSettled).
      const [pqrsResult, assignResult] = await Promise.allSettled([
        apiListPQRS({ page_size: 200, ...(depId ? { dependency: depId } : {}) }),
        apiListAllAssignments({ is_active: true, page_size: 500, ...(depId ? { dependency: depId } : {}), ...(userId ? { responsible_user: userId } : {}) }),
      ]);

      // Normaliza la respuesta paginada o de array directo.
      const basePqrs: PqrsAPI[] = pqrsResult.status === "fulfilled"
        ? (Array.isArray(pqrsResult.value) ? pqrsResult.value : (pqrsResult.value as any).results ?? [])
        : [];

      // Extrae IDs de PQRS referenciadas en asignaciones que no están en basePqrs.
      const assignmentsList: AssignmentAPI[] = assignResult.status === "fulfilled"
        ? ((assignResult.value as any).results ?? (Array.isArray(assignResult.value) ? assignResult.value : []))
        : [];
      const baseIds = new Set(basePqrs.map(p => p.id));
      const missingIds = [...new Set(assignmentsList.map(a => a.pqrs).filter(Boolean))]
        .filter(id => !baseIds.has(id));

      // Recupera individualmente las PQRS faltantes (peticiones en paralelo).
      const extraPqrs: PqrsAPI[] = missingIds.length
        ? (await Promise.allSettled(missingIds.map(id => apiGetPQRS(id))))
            .filter((r): r is PromiseFulfilledResult<PqrsAPI> => r.status === "fulfilled")
            .map(r => r.value)
        : [];

      const all = [...basePqrs, ...extraPqrs];

      // Elimina duplicados por id (puede ocurrir si ambas fuentes devuelven el mismo registro).
      const seen = new Set<string>();
      const items = all.filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      // Traza de depuración para verificar la composición final del listado.
      // eslint-disable-next-line no-console
      console.debug("[AreaDashboard] depId:", depId, "| base:", basePqrs.length, "| assignments:", assignmentsList.length, "| extra:", extraPqrs.length, "| final:", items.length);

      // Ordena de más reciente a más antigua antes de guardar en el estado.
      setPqrsList(items.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (e) {
      toast.error("Error al cargar PQRS", { description: formatApiError(e) });
    } finally {
      setLoading(false);
    }
  }, [usuario?.dependencyId, usuario?.id]);

  // Dispara la carga de PQRS al montar el componente y cada vez que cambie
  // la referencia estable de `cargarPQRS` (dependencias del usuario).
  useEffect(() => { cargarPQRS(); }, [cargarPQRS]);

  /**
   * Bloquea el scroll del body en dispositivos móviles (<1024 px) cuando
   * hay una PQRS seleccionada y el panel de detalle ocupa toda la pantalla.
   * El cleanup restaura siempre el scroll al desmontar o al cerrar el panel.
   */
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile && selected) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selected]);

  /**
   * Subconjunto de `pqrsList` que pasa el filtro de estado activo.
   * Cuando `filtroEstado` es `"todos"` no se aplica ningún filtro.
   */
  const pqrsFiltradas = pqrsList.filter(p =>
    filtroEstado === "todos" || p.status === filtroEstado
  );

  /**
   * Manejador del formulario de respuesta.
   *
   * Pasos que realiza:
   * 1. Registra la respuesta/nota interna llamando a `apiRespondPQRS`.
   * 2. Si se indicó un nuevo estado diferente al actual, llama a `apiUpdateEstado`.
   * 3. Notifica éxito, limpia el formulario, recarga la lista y cierra el panel.
   *
   * En caso de error muestra una notificación `toast` con el detalle del fallo.
   *
   * @param data - Datos validados del formulario `RespondForm`.
   */
  const onResponder = async (data: RespondForm) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      // Paso 1: enviar la respuesta o nota interna.
      await apiRespondPQRS({ pqrs: selected.id, content: data.response_text, response_type: data.response_type });

      // Paso 2: cambiar estado solo si se seleccionó uno distinto al actual.
      if (data.new_status && data.new_status !== selected.status) {
        await apiUpdateEstado(selected.id, data.new_status as any);
      }

      toast.success("Respuesta registrada correctamente");
      reset({ response_type: "CITIZEN", new_status: "" });
      await cargarPQRS(); // Recarga el listado para reflejar cambios.
      setSelected(null);  // Cierra el panel de detalle.
    } catch (e) {
      toast.error("Error al guardar respuesta", { description: formatApiError(e) });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Genera una etiqueta (badge) visual coloreada según el estado de la PQRS.
   *
   * Mapa de colores por código de estado:
   * - `RAD` (Radicado)  → Azul
   * - `PRO` (En Proceso) → Amarillo
   * - `RES` (Resuelto)  → Verde
   * - `CER` (Cerrado)   → Gris
   * - Cualquier otro    → Gris neutro (fallback)
   *
   * @param status - Código de estado interno (p.ej. `"RAD"`, `"PRO"`).
   * @returns Elemento `<span>` con estilos Tailwind y la etiqueta legible.
   */
  const getStatusBadge = (status: string) => {
    const cfg: Record<string, string> = {
      RAD: "bg-blue-100 text-blue-800",
      PRO: "bg-yellow-100 text-yellow-800",
      RES: "bg-green-100 text-green-800",
      CER: "bg-gray-100 text-gray-800",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg[status] ?? "bg-gray-100 text-gray-700"}`}>
        {PQRS_STATUS_LABEL[status as keyof typeof PQRS_STATUS_LABEL] ?? status}
      </span>
    );
  };

  /**
   * Resuelve el nombre del remitente/ciudadano de una PQRS con la siguiente
   * jerarquía de fallback:
   * 1. Usuario registrado → `nombre + apellido`.
   * 2. Remitente anónimo con nombre → `anonymous_submitter.nombre`.
   * 3. Campo genérico `submitter` (cadena plana).
   * 4. Valor por defecto → `"Anónimo"`.
   *
   * @param p - Objeto PQRS obtenido de la API.
   * @returns Nombre legible del remitente.
   */
  const contactName = (p: PqrsAPI) => {
    if (p.user) return `${p.user.nombre} ${p.user.apellido}`.trim();
    if (p.anonymous_submitter?.nombre) return p.anonymous_submitter.nombre;
    const sub = (p as any).submitter as string | undefined;
    return sub || "Anónimo";
  };

  // ── Contadores para las tarjetas de estadísticas ─────────────────────────
  const total = pqrsList.length;                                              // Total de PQRS asignadas al área.
  const rad   = pqrsList.filter(p => p.status === "RAD").length;             // En estado Radicado.
  const pro   = pqrsList.filter(p => p.status === "PRO").length;             // En estado En Proceso.
  const res   = pqrsList.filter(p => p.status === "RES" || p.status === "CER").length; // Resueltas o Cerradas.

  // ── Datos computados para las gráficas de analytics ──────────────────────
  const analyticsData = useMemo(() => {
    const cutoff = periodDays > 0
      ? new Date(Date.now() - periodDays * 86_400_000)
      : null;
    const filtered = cutoff
      ? pqrsList.filter(p => new Date(p.created_at) >= cutoff)
      : pqrsList;

    // Por estado
    const estadoMap: Record<string, number> = {};
    for (const p of filtered) estadoMap[p.status] = (estadoMap[p.status] ?? 0) + 1;
    const porEstado = Object.entries(estadoMap).map(([key, value]) => ({
      name: PQRS_STATUS_LABEL[key as keyof typeof PQRS_STATUS_LABEL] ?? key,
      value, key,
    }));

    // Por tipo
    const tipoMap: Record<string, number> = {};
    for (const p of filtered) {
      const t = p.type ?? p.pqrs_type ?? "?";
      tipoMap[t] = (tipoMap[t] ?? 0) + 1;
    }
    const porTipo = Object.entries(tipoMap).map(([key, value]) => ({
      name: PQRS_TYPE_LABEL[key as keyof typeof PQRS_TYPE_LABEL] ?? key,
      value,
    }));

    // Por prioridad
    const prioMap: Record<string, number> = {};
    for (const p of filtered) {
      const pr = p.priority ?? "?";
      prioMap[pr] = (prioMap[pr] ?? 0) + 1;
    }
    const porPrioridad = Object.entries(prioMap).map(([key, value]) => ({
      name: PQRS_PRIORITY_LABEL[key as keyof typeof PQRS_PRIORITY_LABEL] ?? key,
      value,
    }));

    // Tendencia diaria
    const days = periodDays > 0 ? periodDays : 90;
    const cutoffTend = new Date(Date.now() - days * 86_400_000);
    const tendenciaMap: Record<string, { fecha: string; total: number; resueltas: number }> = {};
    for (const p of pqrsList) {
      const d = new Date(p.created_at);
      if (d < cutoffTend) continue;
      const key = d.toISOString().slice(0, 10);
      if (!tendenciaMap[key]) tendenciaMap[key] = { fecha: key, total: 0, resueltas: 0 };
      tendenciaMap[key].total++;
      if (p.status === "RES" || p.status === "CER") tendenciaMap[key].resueltas++;
    }
    const tendencia = Object.values(tendenciaMap).sort((a, b) => a.fecha.localeCompare(b.fecha));

    // KPIs
    const totalKPI     = filtered.length;
    const resueltas    = filtered.filter(p => p.status === "RES" || p.status === "CER").length;
    const enProceso    = filtered.filter(p => p.status === "PRO").length;
    const tasaResolucion = totalKPI > 0 ? Math.round((resueltas / totalKPI) * 100) : 0;

    return { porEstado, porTipo, porPrioridad, tendencia, totalKPI, resueltas, enProceso, tasaResolucion };
  }, [pqrsList, periodDays]);

  const COLORS_ESTADO    = ["#3b82f6", "#f59e0b", "#22c55e", "#6b7280"];
  const COLORS_TIPO      = ["#6366f1", "#ec4899", "#f97316", "#14b8a6", "#a855f7"];
  const COLORS_PRIORIDAD = ["#22c55e", "#f59e0b", "#ef4444"];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
        {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color ?? p.fill }} />
            <span className="text-gray-600">{p.name}:</span>
            <span className="font-bold text-gray-900">{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ====================================================
            CABECERA: identidad del área y navegación rápida
        ==================================================== */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel de Área</h1>
              <p className="text-sm text-gray-500">
                {usuario?.dependencyName ?? "Sin dependencia asignada"} — {usuario?.nombre}
              </p>
            </div>
          </div>
          {/* Botones de navegación rápida hacia otras secciones del sistema */}
          {/* Quick-nav */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline"
              className="text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100"
              onClick={() => navigate("/area")}>
              <Building2 className="w-4 h-4 mr-1.5" /> PQRS Asignadas
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/consulta")}>
              <Search className="w-4 h-4 mr-1.5" /> Consultar Radicado
            </Button>
            {usuario?.is_staff && (
              <Button size="sm" variant="outline"
                className="text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100"
                onClick={() => navigate("/admin")}>
                <LayoutDashboard className="w-4 h-4 mr-1.5" /> Panel Administración
              </Button>
            )}
            {/* Botón de analytics */}
            <button
              onClick={() => setViewMode(v => v === "list" ? "analytics" : "list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "analytics"
                  ? "bg-blue-600 text-white shadow"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {viewMode === "analytics"
                ? <><Building2 className="w-4 h-4" /> Ver PQRS</>
                : <><BarChart2 className="w-4 h-4" /> Ver Gráficas</>}
            </button>

            {/* Botón de exportación de reportes del área */}
            <button
              onClick={() => setShowExport(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showExport
                  ? "bg-emerald-600 text-white shadow"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FileDown className="w-4 h-4" />
              Exportar
              <ChevronDown className={`w-3 h-3 transition-transform ${showExport ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* ── Panel de exportación de reportes del área ───────────────── */}
          {showExport && (
            <div className="animate-slide-down-fade mt-3 bg-white border border-emerald-200 rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-gray-800">Exportar Reporte del Área</span>
                <span className="ml-auto text-xs text-gray-400">Filtros opcionales</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                {/* Estado */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Estado</label>
                  <select
                    value={exportFilters.status ?? ""}
                    onChange={e => setExportFilters(f => ({ ...f, status: e.target.value || undefined }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="">Todos</option>
                    <option value="RAD">Radicado</option>
                    <option value="PRO">En Proceso</option>
                    <option value="RES">Resuelto</option>
                    <option value="CER">Cerrado</option>
                  </select>
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                  <select
                    value={exportFilters.type ?? ""}
                    onChange={e => setExportFilters(f => ({ ...f, type: e.target.value || undefined }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="">Todos</option>
                    <option value="P">Petición</option>
                    <option value="Q">Queja</option>
                    <option value="R">Reclamo</option>
                    <option value="S">Sugerencia</option>
                    <option value="F">Felicitación</option>
                  </select>
                </div>

                {/* Prioridad */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Prioridad</label>
                  <select
                    value={exportFilters.priority ?? ""}
                    onChange={e => setExportFilters(f => ({ ...f, priority: e.target.value || undefined }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="">Todas</option>
                    <option value="LOW">Baja</option>
                    <option value="MED">Media</option>
                    <option value="HIGH">Alta</option>
                  </select>
                </div>

                {/* Desde */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Desde</label>
                  <input
                    type="date"
                    value={exportFilters.date_from ?? ""}
                    onChange={e => setExportFilters(f => ({ ...f, date_from: e.target.value || undefined }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                {/* Hasta */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={exportFilters.date_to ?? ""}
                    onChange={e => setExportFilters(f => ({ ...f, date_to: e.target.value || undefined }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleExport("csv")}
                  disabled={exporting !== null}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                >
                  {exporting === "csv" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  Descargar CSV
                </button>

                <button
                  onClick={() => handleExport("excel")}
                  disabled={exporting !== null}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {exporting === "excel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                  Descargar Excel
                </button>

                <button
                  onClick={() => setExportFilters({})}
                  className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Limpiar filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ====================================================
            TARJETAS DE ESTADÍSTICAS: resumen numérico del área
            Renderiza 4 tarjetas: total, radicadas, en proceso
            y cerradas/resueltas.
        ==================================================== */}
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" onClick={() => viewMode === "analytics" && setViewMode("list")}>
          {[
            { icon: FileText, label: "Total asignadas", value: total, color: "text-blue-600" },
            { icon: AlertCircle, label: "Radicadas", value: rad, color: "text-blue-500" },
            { icon: Clock, label: "En Proceso", value: pro, color: "text-yellow-600" },
            { icon: CheckCircle2, label: "Cerradas", value: res, color: "text-green-600" },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`w-8 h-8 ${color}`} />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ====================================================
            VISTA ANALYTICS: gráficas del área
        ==================================================== */}
        {viewMode === "analytics" && (
          <div className="animate-fade-slide-up mb-8 space-y-6">

            {/* Filtro de período */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Período:</span>
              {[
                { label: "7 días",  days: 7  },
                { label: "30 días", days: 30 },
                { label: "90 días", days: 90 },
                { label: "Todo",    days: 0  },
              ].map(opt => (
                <button
                  key={opt.days}
                  onClick={() => setPeriodDays(opt.days)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    periodDays === opt.days
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={cargarPQRS}
                disabled={loading}
                className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
              </button>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total en período",     value: analyticsData.totalKPI,           icon: FileText,    color: "text-blue-600",   bg: "bg-blue-50"   },
                { label: "Resueltas / Cerradas",  value: analyticsData.resueltas,          icon: CheckCircle2,color: "text-green-600",  bg: "bg-green-50"  },
                { label: "En Proceso",            value: analyticsData.enProceso,          icon: Clock,       color: "text-yellow-600", bg: "bg-yellow-50" },
                { label: "Tasa de Resolución",    value: `${analyticsData.tasaResolucion}%`, icon: Target,    color: "text-purple-600", bg: "bg-purple-50" },
              ].map(({ label, value, icon: Icon, color, bg }, idx) => (
                <div
                  key={label}
                  className="animate-fade-slide-up bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3"
                  style={{ animationDelay: `${idx * 55}ms` }}
                >
                  <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Fila 1: Estado + Tipo */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Dona interactiva: por estado */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-700">Distribución por Estado</p>
                  <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                    {analyticsData.totalKPI} PQRS
                  </span>
                </div>

                {analyticsData.porEstado.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">Sin datos</p>
                ) : (() => {
                  const totalEstado = analyticsData.porEstado.reduce((s, d) => s + d.value, 0);
                  const active = activeEstadoIndex !== undefined ? analyticsData.porEstado[activeEstadoIndex] : null;

                  const renderActiveShape = (props: any) => {
                    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                    return (
                      <g>
                        <Sector cx={cx} cy={cy} innerRadius={innerRadius - 4} outerRadius={outerRadius + 10}
                          startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={1}
                          style={{ filter: `drop-shadow(0 0 6px ${fill}99)` }}
                        />
                        <Sector cx={cx} cy={cy} innerRadius={outerRadius + 14} outerRadius={outerRadius + 17}
                          startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.5}
                        />
                      </g>
                    );
                  };

                  return (
                    <div className="flex flex-col gap-4">
                      <div className="relative">
                        <ResponsiveContainer width="100%" height={210}>
                          <PieChart>
                            <Pie
                              data={analyticsData.porEstado}
                              cx="50%" cy="50%"
                              innerRadius={60} outerRadius={88}
                              paddingAngle={3}
                              dataKey="value"
                              activeIndex={activeEstadoIndex}
                              activeShape={renderActiveShape}
                              onMouseEnter={(_, index) => setActiveEstadoIndex(index)}
                              onMouseLeave={() => setActiveEstadoIndex(undefined)}
                              animationBegin={0} animationDuration={700}
                            >
                              {analyticsData.porEstado.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={COLORS_ESTADO[i % COLORS_ESTADO.length]}
                                  opacity={activeEstadoIndex === undefined || activeEstadoIndex === i ? 1 : 0.4}
                                  style={{ cursor: "pointer", transition: "opacity .2s" }}
                                />
                              ))}
                            </Pie>
                            <RTooltip
                              content={({ active: a, payload }) => {
                                if (!a || !payload?.length) return null;
                                const d = payload[0];
                                const pct = totalEstado > 0 ? ((d.value as number) / totalEstado * 100).toFixed(1) : "0";
                                return (
                                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color as string }} />
                                      <span className="font-semibold text-gray-800">{d.name}</span>
                                    </div>
                                    <div className="flex gap-3 pl-4 text-gray-600">
                                      <span><span className="font-bold text-gray-900">{d.value}</span> PQRS</span>
                                      <span className="text-gray-400">·</span>
                                      <span className="font-bold" style={{ color: d.color as string }}>{pct}%</span>
                                    </div>
                                  </div>
                                );
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          {active ? (
                            <>
                              <span className="text-2xl font-extrabold leading-none"
                                style={{ color: COLORS_ESTADO[activeEstadoIndex! % COLORS_ESTADO.length] }}>
                                {active.value}
                              </span>
                              <span className="text-xs text-gray-500 mt-0.5 font-medium">{active.name}</span>
                              <span className="text-[11px] text-gray-400">
                                {totalEstado > 0 ? ((active.value / totalEstado) * 100).toFixed(1) : 0}%
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-2xl font-extrabold text-gray-800 leading-none">{totalEstado}</span>
                              <span className="text-xs text-gray-400 mt-0.5">Total PQRS</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-1">
                        {analyticsData.porEstado.map((d, i) => {
                          const color = COLORS_ESTADO[i % COLORS_ESTADO.length];
                          const pct = totalEstado > 0 ? (d.value / totalEstado) * 100 : 0;
                          const isHovered = activeEstadoIndex === i;
                          return (
                            <button
                              key={d.key ?? d.name}
                              onMouseEnter={() => setActiveEstadoIndex(i)}
                              onMouseLeave={() => setActiveEstadoIndex(undefined)}
                              className={`text-left rounded-lg px-2 py-1.5 transition-all ${
                                isHovered ? "bg-gray-50 scale-[1.02]" : "hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                                  <span className={`text-xs font-medium ${isHovered ? "text-gray-900" : "text-gray-600"}`}>
                                    {d.name}
                                  </span>
                                </div>
                                <span className="text-xs font-bold" style={{ color }}>{d.value}</span>
                              </div>
                              <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, background: color }} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Barras: por tipo */}
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <p className="text-sm font-semibold text-gray-700 mb-4">Solicitudes por Tipo</p>
                {analyticsData.porTipo.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={analyticsData.porTipo} barSize={32} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <RTooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Cantidad" radius={[4, 4, 0, 0]}>
                        {analyticsData.porTipo.map((_, i) => (
                          <Cell key={i} fill={COLORS_TIPO[i % COLORS_TIPO.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Fila 2: Tendencia diaria */}
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <p className="text-sm font-semibold text-gray-700 mb-4">
                Tendencia de Radicación
                <span className="font-normal text-gray-400 ml-2">
                  (últimos {periodDays > 0 ? periodDays : 90} días)
                </span>
              </p>
              {analyticsData.tendencia.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Sin datos en el período seleccionado</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={analyticsData.tendencia} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGradTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="areaGradRes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <RTooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="total"     name="Radicadas" stroke="#3b82f6" strokeWidth={2} fill="url(#areaGradTotal)" dot={false} />
                    <Area type="monotone" dataKey="resueltas" name="Resueltas"  stroke="#22c55e" strokeWidth={2} fill="url(#areaGradRes)"   dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Fila 3: Prioridad */}
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <p className="text-sm font-semibold text-gray-700 mb-4">Distribución por Prioridad</p>
              {analyticsData.porPrioridad.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={analyticsData.porPrioridad}
                      cx="50%" cy="50%"
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {analyticsData.porPrioridad.map((_, i) => (
                        <Cell key={i} fill={COLORS_PRIORIDAD[i % COLORS_PRIORIDAD.length]} />
                      ))}
                    </Pie>
                    <RTooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

          </div>
        )}

        {/* ====================================================
            CUERPO PRINCIPAL: lista de PQRS + panel de detalle
            Layout de dos columnas en escritorio (lg+);
            en móvil se alterna entre lista y detalle.
        ==================================================== */}
        <div key={viewMode === "list" ? "list" : "list-hidden"} className={`flex flex-col lg:flex-row gap-6 ${viewMode === "analytics" ? "hidden" : "animate-fade-slide-up"}`}>
          {/* ---- LISTA DE PQRS con filtro por estado ---- */}
          <div className={`flex-1 ${selected ? "hidden lg:block" : "block"}`}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">PQRS Asignadas</CardTitle>
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
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : pqrsFiltradas.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No hay PQRS asignadas a esta área</p>
                  </div>
                ) : (
                  <div className="divide-y max-h-[60vh] overflow-y-auto">
                    {pqrsFiltradas.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelected(p); reset({ response_type: "CITIZEN", new_status: "" }); }}
                        className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors ${selected?.id === p.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono text-blue-600 mb-0.5">{p.numero_radicado ?? p.radicado}</p>
                            <p className="text-sm font-medium text-gray-900 truncate">{p.subject}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{contactName(p)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {getStatusBadge(p.status)}
                            <span className="text-xs text-gray-400">
                              {PQRS_TYPE_LABEL[(p.type ?? p.pqrs_type) as keyof typeof PQRS_TYPE_LABEL]}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ---- PANEL DE DETALLE Y RESPUESTA ----
               Solo se muestra cuando hay una PQRS seleccionada.
               En móvil ocupa toda la pantalla; en escritorio
               se ubica como columna derecha fija de 440 px.
          */}
          {/* Detail / Respond panel */}
          {selected && (
            <div className="w-full lg:w-[440px] shrink-0">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <button
                      className="lg:hidden flex items-center gap-1 text-sm text-blue-600"
                      onClick={() => setSelected(null)}
                    >
                      <ArrowLeft className="w-4 h-4" /> Volver
                    </button>
                    <CardTitle className="text-base">Gestionar PQRS</CardTitle>
                    <button onClick={() => setSelected(null)} className="hidden lg:block text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
                  {/* Info summary */}
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
                      {getStatusBadge(selected.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ciudadano</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{contactName(selected)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fecha</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateTime(selected.created_at)}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">{selected.subject}</p>
                    <p className="text-sm text-gray-600">{selected.description}</p>
                  </div>

                  {/* Response form */}
                  <form onSubmit={handleSubmit(onResponder)} className="space-y-3">
                    <div>
                      <Label className="text-sm">Tipo de respuesta</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-white"
                        {...register("response_type")}
                      >
                        <option value="CITIZEN">Respuesta al ciudadano</option>
                        <option value="FINAL">Respuesta final</option>
                        <option value="INTERNAL">Nota interna</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm">Cambiar estado (opcional)</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-white"
                        {...register("new_status")}
                      >
                        <option value="">— Sin cambiar —</option>
                        <option value="PRO">En Proceso</option>
                        <option value="RES">Resuelto</option>
                        <option value="CER">Cerrado</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm">Respuesta / Nota *</Label>
                      <Textarea
                        className="mt-1 text-sm"
                        rows={4}
                        placeholder="Escriba su respuesta o nota interna..."
                        {...register("response_text", { required: "La respuesta es obligatoria" })}
                      />
                      {errors.response_text && (
                        <p className="text-red-500 text-xs mt-1">{errors.response_text.message}</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : "Guardar Respuesta"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
