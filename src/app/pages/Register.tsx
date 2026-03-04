import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import { apiRegister, formatApiError, type RegisterPayload, type DocumentType } from "../lib/api";

// RegisterPayload already includes password2; this alias avoids re-declaration
type RegisterForm = RegisterPayload;

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: "CC", label: "Cédula de Ciudadanía" },
  { value: "CE", label: "Cédula de Extranjería" },
  { value: "TI", label: "Tarjeta de Identidad" },
  { value: "PA", label: "Pasaporte" },
  { value: "NIT", label: "NIT" },
  { value: "PPT", label: "Permiso de Protección Temporal" },
  { value: "RC", label: "Registro Civil" },
];

export function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch("password");

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      await apiRegister({
        email: data.email,
        username: data.username,
        password: data.password,
        password2: data.password2,
        nombre: data.nombre,
        apellido: data.apellido,
        tipo_documento: data.tipo_documento,
        cedula: data.cedula,
        telefono: data.telefono,
        ciudad: data.ciudad,
      });
      toast.success("¡Registro exitoso!", {
        description: "Su cuenta ha sido creada. Inicie sesión para continuar.",
      });
      navigate("/login");
    } catch (err) {
      toast.error("Error en el registro", { description: formatApiError(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-center">Crear Cuenta</CardTitle>
          <CardDescription className="text-center">
            Complete el formulario para registrarse en el sistema PQRSF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* ── Datos de acceso ── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Datos de Acceso
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de usuario *</Label>
                  <Input
                    id="username"
                    placeholder="juan.perez"
                    autoComplete="username"
                    {...register("username", {
                      required: "El nombre de usuario es requerido",
                      minLength: { value: 4, message: "Mínimo 4 caracteres" },
                      pattern: {
                        value: /^[a-zA-Z0-9._-]+$/,
                        message: "Solo letras, números, punto, guión y underscore",
                      },
                    })}
                  />
                  {errors.username && <p className="text-sm text-red-600">{errors.username.message}</p>}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@universidad.edu.co"
                    autoComplete="email"
                    {...register("email", {
                      required: "El correo es requerido",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Correo electrónico inválido",
                      },
                    })}
                  />
                  {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="pr-10"
                      {...register("password", {
                        required: "La contraseña es requerida",
                        minLength: { value: 8, message: "Mínimo 8 caracteres" },
                        pattern: {
                          value: /^(?=.*[A-Z])(?=.*\d).+$/,
                          message: "Debe incluir al menos una mayúscula y un número",
                        },
                      })}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="password2">Confirmar Contraseña *</Label>
                  <Input
                    id="password2"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register("password2", {
                      required: "Debe confirmar la contraseña",
                      validate: (v) => v === password || "Las contraseñas no coinciden",
                    })}
                  />
                  {errors.password2 && <p className="text-sm text-red-600">{errors.password2.message}</p>}
                </div>
              </div>
            </div>

            {/* ── Datos personales ── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Datos Personales
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Nombre */}
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre(s) *</Label>
                  <Input
                    id="nombre"
                    placeholder="Juan Carlos"
                    {...register("nombre", {
                      required: "El nombre es requerido",
                      minLength: { value: 2, message: "Mínimo 2 caracteres" },
                    })}
                  />
                  {errors.nombre && <p className="text-sm text-red-600">{errors.nombre.message}</p>}
                </div>

                {/* Apellido */}
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido(s)</Label>
                  <Input
                    id="apellido"
                    placeholder="Pérez Gómez"
                    {...register("apellido")}
                  />
                </div>

                {/* Tipo documento */}
                <div className="space-y-2">
                  <Label htmlFor="tipo_documento">Tipo de Documento *</Label>
                  <select
                    id="tipo_documento"
                    className={inputCls}
                    {...register("tipo_documento", { required: "Seleccione el tipo de documento" })}
                  >
                    <option value="">Seleccione…</option>
                    {DOC_TYPES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                  {errors.tipo_documento && <p className="text-sm text-red-600">{errors.tipo_documento.message}</p>}
                </div>

                {/* Cédula */}
                <div className="space-y-2">
                  <Label htmlFor="cedula">Número de Documento *</Label>
                  <Input
                    id="cedula"
                    placeholder="1234567890"
                    {...register("cedula", {
                      required: "El número de documento es requerido",
                      pattern: {
                        value: /^[0-9A-Za-z-]{4,20}$/,
                        message: "Ingrese un número de documento válido",
                      },
                    })}
                  />
                  {errors.cedula && <p className="text-sm text-red-600">{errors.cedula.message}</p>}
                </div>

                {/* Teléfono */}
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    placeholder="3001234567"
                    {...register("telefono", {
                      pattern: {
                        value: /^[0-9+\s()-]{7,15}$/,
                        message: "Número de teléfono inválido",
                      },
                    })}
                  />
                  {errors.telefono && <p className="text-sm text-red-600">{errors.telefono.message}</p>}
                </div>

                {/* Ciudad */}
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input
                    id="ciudad"
                    placeholder="Bogotá"
                    {...register("ciudad")}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#ff9800] hover:bg-[#f57c00] text-white font-bold"
              disabled={isLoading}
            >
              {isLoading ? "Registrando..." : "Crear Cuenta"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              ¿Ya tiene cuenta?{" "}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                Inicie sesión aquí
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

