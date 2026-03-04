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
  apiListPQRS, apiRespondPQRS, apiUpdateEstado,
  PqrsAPI, PQRS_STATUS_LABEL, PQRS_TYPE_LABEL, PQRS_PRIORITY_LABEL,
  formatApiError
} from "../lib/api";
import { formatDateTime } from "../lib/utils";

interface RespondForm {
  response_text: string;
  response_type: "CITIZEN" | "FINAL" | "INTERNAL";
  new_status: string;
}

export function AreaDashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [pqrsList, setPqrsList] = useState<PqrsAPI[]>([]);
  const [selected, setSelected] = useState<PqrsAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RespondForm>({
    defaultValues: { response_type: "CITIZEN", new_status: "" },
  });

  const cargarPQRS = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiListPQRS({ page_size: 200 });
      const items: PqrsAPI[] = Array.isArray(res) ? res : (res as any).results ?? [];
      setPqrsList(items.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (e) {
      toast.error("Error al cargar PQRS", { description: formatApiError(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarPQRS(); }, [cargarPQRS]);

  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile && selected) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selected]);

  const pqrsFiltradas = pqrsList.filter(p =>
    filtroEstado === "todos" || p.status === filtroEstado
  );

  const onResponder = async (data: RespondForm) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await apiRespondPQRS({ pqrs: selected.id, content: data.response_text, response_type: data.response_type });
      if (data.new_status && data.new_status !== selected.status) {
        await apiUpdateEstado(selected.id, data.new_status as any);
      }
      toast.success("Respuesta registrada correctamente");
      reset({ response_type: "CITIZEN", new_status: "" });
      await cargarPQRS();
      setSelected(null);
    } catch (e) {
      toast.error("Error al guardar respuesta", { description: formatApiError(e) });
    } finally {
      setSubmitting(false);
    }
  };

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

  const contactName = (p: PqrsAPI) => {
    if (p.user) return `${p.user.nombre} ${p.user.apellido}`.trim();
    if (p.anonymous_submitter?.nombre) return p.anonymous_submitter.nombre;
    const sub = (p as any).submitter as string | undefined;
    return sub || "Anónimo";
  };

  const total = pqrsList.length;
  const rad = pqrsList.filter(p => p.status === "RAD").length;
  const pro = pqrsList.filter(p => p.status === "PRO").length;
  const res = pqrsList.filter(p => p.status === "RES" || p.status === "CER").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
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

        <div className="flex flex-col lg:flex-row gap-6">
          {/* List */}
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
