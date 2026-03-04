import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { FileText, CheckCircle2 } from "lucide-react";
import {
  apiCreatePQRS,
  formatApiError,
  type PqrsType,
  type PqrsPriority,
} from "../lib/api";

interface PQRSForm {
  pqrs_type: PqrsType;
  subject: string;
  description: string;
  priority: PqrsPriority;
  // Anonymous-only fields — all optional per backend spec
  anon_nombre?: string;
  anon_apellido?: string;
  anon_tipo_documento?: "CC" | "CE" | "TI" | "PA" | "PPT" | "RC";
  anon_documento?: string;
  anon_email?: string;
  anon_telefono?: string;
  anon_ciudad?: string;
}

const TYPES: { value: PqrsType; label: string }[] = [
  { value: "P", label: "Petición" },
  { value: "Q", label: "Queja" },
  { value: "R", label: "Reclamo" },
  { value: "S", label: "Sugerencia" },
  { value: "F", label: "Felicitación" },
];

const PRIORITIES: { value: PqrsPriority; label: string }[] = [
  { value: "LOW", label: "Baja" },
  { value: "MEDIUM", label: "Media" },
  { value: "HIGH", label: "Alta" },
  { value: "URGENT", label: "Urgente" },
];

export function CrearPQRS() {
  const { usuario, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [radicadoGenerado, setRadicadoGenerado] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PQRSForm>({
    defaultValues: { priority: "MEDIUM", anon_tipo_documento: "CC" },
  });

  const onSubmit = async (data: PQRSForm) => {
    setIsLoading(true);
    try {
      const result = await apiCreatePQRS(
        {
          type: data.pqrs_type,
          subject: data.subject,
          description: data.description,
          priority: data.priority,
          // Campos anónimos: texto → blank=True/default='' → enviar '' si vacío;
          // tipo_documento → choices con default='CC' → nunca enviar '' (siempre tiene valor válido).
          anon_name: !isAuthenticated ? (data.anon_nombre ?? "") : undefined,
          anon_last_name: !isAuthenticated ? (data.anon_apellido ?? "") : undefined,
          anon_tipo_documento: !isAuthenticated
            ? (data.anon_tipo_documento || "CC")  // never let '' reach a choices field
            : undefined,
          anon_document_number: !isAuthenticated ? (data.anon_documento ?? "") : undefined,
          anon_email: !isAuthenticated ? (data.anon_email ?? "") : undefined,
          anon_phone: !isAuthenticated ? (data.anon_telefono ?? "") : undefined,
          anon_city: !isAuthenticated ? (data.anon_ciudad ?? "") : undefined,
        },
        isAuthenticated,
      );
      const numeroRadicado = result.numero_radicado ?? result.radicado ?? "";
      setRadicadoGenerado(numeroRadicado);
      toast.success("¡PQRS radicada exitosamente!", {
        description: `Número de radicado: ${numeroRadicado}`,
      });
    } catch (err) {
      toast.error("Error al radicar PQRS", { description: formatApiError(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const selectCls =
    "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

  if (radicadoGenerado) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-green-900">¡PQRS Radicada Exitosamente!</CardTitle>
            <CardDescription className="text-green-700">
              Su solicitud ha sido recibida y será procesada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-white p-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Número de Radicado</p>
              <p className="text-2xl font-bold text-blue-600">{radicadoGenerado}</p>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <strong>Importante:</strong> Guarde este número para consultar el estado de su solicitud.
              </p>
              <p>Recibirá notificaciones al correo proporcionado sobre el avance de su PQRS.</p>
              <p>El tiempo de respuesta puede ser de hasta <strong>15 días hábiles</strong> según la Ley 1755 de 2015.</p>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <Button onClick={() => navigate("/consulta")} className="w-full bg-[#ff9800] hover:bg-[#f57c00] text-white font-bold">
                Consultar Estado
              </Button>
              <Button variant="outline" onClick={() => { setRadicadoGenerado(null); reset(); }} className="w-full">
                Radicar Otra PQRS
              </Button>
              <Button variant="ghost" onClick={() => navigate("/")} className="w-full">
                Volver al Inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Radicar PQRS</CardTitle>
              <CardDescription>Complete el formulario para presentar su solicitud</CardDescription>
            </div>
          </div>
          {isAuthenticated && usuario && (
            <div className="mt-2 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800">
              Radicando como: <strong>{usuario.nombre} {usuario.apellido}</strong> · {usuario.email}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Tipo y Prioridad */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pqrs_type">Tipo de Solicitud *</Label>
                <select
                  id="pqrs_type"
                  className={selectCls}
                  {...register("pqrs_type", { required: "Debe seleccionar un tipo" })}
                >
                  <option value="">Seleccione una opción</option>
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {errors.pqrs_type && <p className="text-sm text-red-600">{errors.pqrs_type.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad *</Label>
                <select
                  id="priority"
                  className={selectCls}
                  {...register("priority", { required: "Seleccione la prioridad" })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                {errors.priority && <p className="text-sm text-red-600">{errors.priority.message}</p>}
              </div>
            </div>

            {/* Asunto */}
            <div className="space-y-2">
              <Label htmlFor="subject">Asunto *</Label>
              <Input
                id="subject"
                placeholder="Resuma brevemente su solicitud (10–200 caracteres)"
                {...register("subject", {
                  required: "El asunto es requerido",
                  minLength: { value: 10, message: "Mínimo 10 caracteres" },
                  maxLength: { value: 200, message: "Máximo 200 caracteres" },
                })}
              />
              {errors.subject && <p className="text-sm text-red-600">{errors.subject.message}</p>}
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                placeholder="Describa detalladamente su solicitud (mínimo 20 caracteres)"
                rows={6}
                {...register("description", {
                  required: "La descripción es requerida",
                  minLength: { value: 20, message: "Mínimo 20 caracteres" },
                  maxLength: { value: 2000, message: "Máximo 2000 caracteres" },
                })}
              />
              {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
            </div>

            {/* Datos de contacto – solo para usuarios no autenticados */}
            {!isAuthenticated && (
              <div className="border-t pt-6">
                <h3 className="font-medium mb-1">Datos de Contacto</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Todos los campos son opcionales. Si proporciona su correo electrónico, recibirá notificaciones sobre su solicitud y será requerido al consultar el radicado.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="anon_nombre">Nombre <span className="text-gray-400 text-xs">(opcional)</span></Label>
                    <Input
                      id="anon_nombre"
                      placeholder="Su nombre"
                      {...register("anon_nombre", {
                        minLength: { value: 2, message: "Mínimo 2 caracteres" },
                      })}
                    />
                    {errors.anon_nombre && <p className="text-sm text-red-600">{errors.anon_nombre.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="anon_apellido">Apellido <span className="text-gray-400 text-xs">(opcional)</span></Label>
                    <Input
                      id="anon_apellido"
                      placeholder="Su apellido"
                      {...register("anon_apellido", {
                        minLength: { value: 2, message: "Mínimo 2 caracteres" },
                      })}
                    />
                    {errors.anon_apellido && <p className="text-sm text-red-600">{errors.anon_apellido.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="anon_tipo_documento">Tipo de Documento <span className="text-gray-400 text-xs">(por defecto CC)</span></Label>
                    <select
                      id="anon_tipo_documento"
                      className={selectCls}
                      {...register("anon_tipo_documento")}
                    >
                      <option value="CC">Cédula de Ciudadanía (CC)</option>
                      <option value="CE">Cédula de Extranjería (CE)</option>
                      <option value="TI">Tarjeta de Identidad (TI)</option>
                      <option value="PA">Pasaporte (PA)</option>
                      <option value="PPT">Permiso por Protección Temporal (PPT)</option>
                      <option value="RC">Registro Civil (RC)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="anon_documento">Número de Documento <span className="text-gray-400 text-xs">(opcional)</span></Label>
                    <Input
                      id="anon_documento"
                      placeholder="Ej: 1234567890"
                      {...register("anon_documento", {
                        minLength: { value: 5, message: "Mínimo 5 caracteres" },
                      })}
                    />
                    {errors.anon_documento && <p className="text-sm text-red-600">{errors.anon_documento.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="anon_email">Correo Electrónico <span className="text-gray-400 text-xs">(opcional)</span></Label>
                    <Input
                      id="anon_email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      {...register("anon_email", {
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Correo inválido",
                        },
                      })}
                    />
                    {errors.anon_email && <p className="text-sm text-red-600">{errors.anon_email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="anon_telefono">Teléfono <span className="text-gray-400 text-xs">(opcional)</span></Label>
                    <Input
                      id="anon_telefono"
                      type="tel"
                      placeholder="3001234567"
                      {...register("anon_telefono", {
                        pattern: {
                          value: /^[0-9+\s()-]{7,15}$/,
                          message: "Número inválido",
                        },
                      })}
                    />
                    {errors.anon_telefono && <p className="text-sm text-red-600">{errors.anon_telefono.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="anon_ciudad">Ciudad <span className="text-gray-400 text-xs">(opcional)</span></Label>
                    <Input
                      id="anon_ciudad"
                      placeholder="Su ciudad"
                      {...register("anon_ciudad")}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-[#ff9800] hover:bg-[#f57c00] text-white font-bold"
                disabled={isLoading}
              >
                {isLoading ? "Radicando..." : "Radicar PQRS"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/")}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
