/**
 * @file AreaDashboard.tsx
 * @description Panel de gestión de PQRS asignadas a una dependencia/área institucional.
 *              Permite al funcionario de área ver, filtrar y responder las PQRS que le
 *              han sido asignadas, así como actualizar su estado.
 * @author Sistema PQRS Institucional
 * @date 2026-03-04
 */
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Building2, FileText, Clock, CheckCircle2, AlertCircle, X, User, Calendar, ArrowLeft, Loader2, LayoutDashboard, Search } from "lucide-react";
import {
  apiListPQRS, apiRespondPQRS, apiUpdateEstado, apiListAllAssignments, apiGetPQRS,
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
          </div>
        </div>

        {/* ====================================================
            TARJETAS DE ESTADÍSTICAS: resumen numérico del área
            Renderiza 4 tarjetas: total, radicadas, en proceso
            y cerradas/resueltas.
        ==================================================== */}
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            CUERPO PRINCIPAL: lista de PQRS + panel de detalle
            Layout de dos columnas en escritorio (lg+);
            en móvil se alterna entre lista y detalle.
        ==================================================== */}
        <div className="flex flex-col lg:flex-row gap-6">
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
