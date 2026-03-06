import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Search, FileText, Calendar, Clock, MessageSquare, User, Mail, LogIn } from "lucide-react";
import {
  apiConsultarRadicado,
  apiListPQRS,
  apiGetPQRS,
  apiGetResponses,
  formatApiError,
  PQRS_STATUS_LABEL,
  PQRS_TYPE_LABEL,
  type PqrsAPI,
  type PqrsResponseAPI,
} from "../lib/api";
import { formatDateTime } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface ConsultaForm {
  radicado: string;
}

interface EmailVerifForm {
  email: string;
}

/** Detecta si el error del backend indica que se requiere email para consultar. */
function isEmailRequiredError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return msg.includes("correo") || msg.includes("email");
}

export function ConsultaRadicado() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [pqrs, setPqrs] = useState<PqrsAPI | null>(null);
  const [responses, setResponses] = useState<PqrsResponseAPI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Estado para el flujo de verificación por email
  const [requiresEmail, setRequiresEmail] = useState(false);
  const [pendingRadicado, setPendingRadicado] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConsultaForm>();

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
    setError: setEmailError,
  } = useForm<EmailVerifForm>();

  const onSubmit = async (data: ConsultaForm) => {
    setIsLoading(true);
    setPqrs(null);
    setResponses([]);
    setRequiresEmail(false);

    try {
      let result: PqrsAPI;

      if (usuario) {
        // Usuario autenticado: consultar a través del endpoint autenticado
        const radicadoTrimmed = data.radicado.trim();
        const lista = await apiListPQRS({ search: radicadoTrimmed, page_size: 50 });
        const encontrada = lista.results.find(
          (p) =>
            (p.numero_radicado ?? p.radicado ?? "").toLowerCase() ===
            radicadoTrimmed.toLowerCase(),
        );
        if (!encontrada) {
          toast.error("Radicado no encontrado", {
            description: "No se encontró ninguna PQRS con ese número de radicado en su cuenta.",
          });
          return;
        }
        result = await apiGetPQRS(encontrada.id);
      } else {
        result = await apiConsultarRadicado(data.radicado.trim());
      }

      await loadResult(result);
    } catch (err) {
      if (!usuario && isEmailRequiredError(err)) {
        // El backend indica que esta PQRS fue radicada con correo electrónico
        setPendingRadicado(data.radicado.trim());
        setRequiresEmail(true);
      } else {
        toast.error("Radicado no encontrado", { description: formatApiError(err) });
      }
    } finally {
      setIsLoading(false);
    }
  };

  /** Reintenta la consulta proporcionando el email de verificación. */
  const onEmailSubmit = async (data: EmailVerifForm) => {
    setIsVerifying(true);
    try {
      const result = await apiConsultarRadicado(pendingRadicado, data.email.trim());
      setRequiresEmail(false);
      await loadResult(result);
    } catch (err) {
      setEmailError("email", { message: "El correo no coincide con el registrado en esta PQRS." });
    } finally {
      setIsVerifying(false);
    }
  };

  /** Carga el resultado de una consulta exitosa y sus respuestas. */
  const loadResult = async (result: PqrsAPI) => {
    setPqrs(result);
    try {
      const resp = await apiGetResponses(result.id);
      setResponses(resp.results.filter(r => r.response_type !== "INTERNAL"));
    } catch {
      // las respuestas pueden no ser accesibles públicamente
    }
    toast.success("Radicado encontrado", {
      description: "Se encontró la información de su solicitud",
    });
  };

  const getEstadoBadge = (status: string) => {
    if (!status) return null;
    const map: Record<string, React.ReactNode> = {
      RAD: <Badge variant="warning">Radicado</Badge>,
      PRO: <Badge>En Proceso</Badge>,
      RES: <Badge variant="success">Resuelto</Badge>,
      CER: <Badge variant="secondary">Cerrado</Badge>,
    };
    return map[status] || <Badge>{status}</Badge>;
  };

  const contactInfo = pqrs
    ? pqrs.anonymous_submitter
      ? {
          nombre: pqrs.anonymous_submitter.nombre,
          email: pqrs.anonymous_submitter.email,
          telefono: pqrs.anonymous_submitter.telefono,
        }
      : pqrs.user
      ? {
          nombre: `${pqrs.user.nombre} ${pqrs.user.apellido}`.trim(),
          email: pqrs.user.email,
          telefono: pqrs.user.telefono,
        }
      : null
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Búsqueda */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Consultar Radicado</CardTitle>
              <CardDescription>
                Ingrese el número de radicado para consultar el estado de su PQRS
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="radicado">Número de Radicado</Label>
              <div className="flex gap-2">
                <Input
                  id="radicado"
                  placeholder="Ej: PQRS-2026-0001"
                  className="flex-1"
                  {...register("radicado", {
                    required: "El número de radicado es requerido",
                    minLength: { value: 4, message: "Ingrese un radicado válido" },
                  })}
                />
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#ff9800] hover:bg-[#f57c00] text-white font-bold"
                >
                  <Search className="h-4 w-4 mr-1" />
                  {isLoading ? "Buscando..." : "Buscar"}
                </Button>
              </div>
              {errors.radicado && (
                <p className="text-sm text-red-600">{errors.radicado.message}</p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Verificación de email requerida */}
      <AnimatePresence>
        {requiresEmail && !pqrs && (
          <motion.div
            key="email-required"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                    <Mail className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-amber-900 text-base">
                      Esta PQRS tiene un correo registrado
                    </CardTitle>
                    <CardDescription className="text-amber-700">
                      Para consultarla, verifique su identidad ingresando el correo con el que fue radicada o inicie sesión.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Opción 1: verificar con correo */}
                <form onSubmit={handleSubmitEmail(onEmailSubmit)} className="space-y-3">
                  <Label htmlFor="email-verif" className="text-amber-900 font-medium">
                    Ingresar correo electrónico
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="email-verif"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      className="flex-1 bg-white border-amber-300 focus-visible:ring-amber-400"
                      {...registerEmail("email", {
                        required: "El correo es requerido",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Correo inválido",
                        },
                      })}
                    />
                    <Button
                      type="submit"
                      disabled={isVerifying}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                    >
                      {isVerifying ? "Verificando..." : "Verificar"}
                    </Button>
                  </div>
                  {emailErrors.email && (
                    <p className="text-sm text-red-600">{emailErrors.email.message}</p>
                  )}
                </form>

                {/* Divisor */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-amber-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-amber-50 px-2 text-amber-600">o también</span>
                  </div>
                </div>

                {/* Opción 2: iniciar sesión */}
                <div className="rounded-lg bg-white border border-amber-200 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Iniciar sesión</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Acceda con su cuenta para consultar todas sus PQRS sin necesidad de correo.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 gap-2 border-amber-400 text-amber-800 hover:bg-amber-50"
                    onClick={() => navigate(`/login?redirect=/consulta`)}
                  >
                    <LogIn className="h-4 w-4" />
                    Ingresar
                  </Button>
                </div>

                <button
                  type="button"
                  className="text-xs text-amber-700 underline underline-offset-2 hover:text-amber-900"
                  onClick={() => setRequiresEmail(false)}
                >
                  Cancelar y buscar otro radicado
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resultado */}
      <AnimatePresence>
        {pqrs && (
          <motion.div
            key="pqrs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <CardTitle>{pqrs.subject || (pqrs.numero_radicado ?? pqrs.radicado)}</CardTitle>
                    </div>
                    <CardDescription className="font-mono">{pqrs.numero_radicado ?? pqrs.radicado}</CardDescription>
                  </div>
                  {getEstadoBadge(pqrs.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Info general */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">Tipo de Solicitud</p>
                    <p className="font-medium">
                      {(pqrs.type_display ?? PQRS_TYPE_LABEL[pqrs.type ?? pqrs.pqrs_type!] ?? pqrs.type ?? pqrs.pqrs_type) || <span className="text-gray-400">—</span>}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">Estado</p>
                    <p className="font-medium">
                      {(pqrs.status_display ?? PQRS_STATUS_LABEL[pqrs.status] ?? pqrs.status) || <span className="text-gray-400">—</span>}
                    </p>
                  </div>
                  {pqrs.dependency && (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Área asignada</p>
                      <p className="font-medium">{pqrs.dependency.name}</p>
                    </div>
                  )}
                  {pqrs.due_date && (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Fecha límite (SLA)</p>
                      <p className="font-medium">{formatDateTime(pqrs.due_date)}</p>
                    </div>
                  )}
                </div>

                {/* Solicitante */}
                {contactInfo && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Solicitante</p>
                    <div className="rounded-lg bg-gray-50 p-3 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-medium">{contactInfo.nombre || "Anónimo"}</span>
                      </div>
                      {contactInfo.email && <p className="text-gray-600 pl-5">{contactInfo.email}</p>}
                      {contactInfo.telefono && <p className="text-gray-600 pl-5">{contactInfo.telefono}</p>}
                    </div>
                  </div>
                )}

                {/* Descripción */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Descripción</p>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm">{pqrs.description}</p>
                  </div>
                </div>

                {/* Fechas */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
                    <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Fecha de Radicación</p>
                      <p className="text-sm font-medium">{formatDateTime(pqrs.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
                    <Clock className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Última Actualización</p>
                      <p className="text-sm font-medium">{formatDateTime(pqrs.updated_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Respuestas */}
                {responses.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                      <p className="text-sm font-medium text-gray-900">
                        Respuestas ({responses.length})
                      </p>
                    </div>
                    {responses.map((r) => (
                      <div key={r.id} className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                        <div className="flex justify-between text-xs text-blue-700 mb-2">
                          <span>{typeof r.responded_by === 'object' ? `${r.responded_by?.nombre} ${r.responded_by?.apellido}` : r.responded_by}</span>
                          <span>{formatDateTime(r.created_at)}</span>
                        </div>
                        <p className="text-sm text-blue-900">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {responses.length === 0 && pqrs.status === "RAD" && (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                    <p className="text-sm text-yellow-900">
                      Su solicitud ha sido radicada y está siendo procesada. Recibirá una notificación
                      cuando haya una respuesta disponible.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
