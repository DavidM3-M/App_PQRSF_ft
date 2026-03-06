import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";

interface LoginForm {
  email: string;
  password: string;
}

export function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? null;
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    // Bloqueo temporal por intentos fallidos
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const secs = Math.ceil((lockoutUntil - Date.now()) / 1000);
      toast.error("Demasiados intentos fallidos", {
        description: `Espere ${secs} segundo${secs !== 1 ? "s" : ""} antes de intentar de nuevo.`,
      });
      return;
    }
    setIsLoading(true);
    const result = await login(data.email, data.password);
    setIsLoading(false);

    if (result.ok) {
      setFailedAttempts(0);
      setLockoutUntil(null);
      toast.success("¡Bienvenido!", { description: "Sesión iniciada correctamente" });
      if (redirectTo) navigate(redirectTo);
      else if (result.rol === "admin") navigate("/admin");
      else if (result.rol === "area") navigate("/area");
      else navigate("/dashboard");
    } else {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      if (attempts >= 5) {
        const until = Date.now() + 30_000;
        setLockoutUntil(until);
        toast.error("Cuenta bloqueada temporalmente", {
          description: "Demasiados intentos fallidos. Intente de nuevo en 30 segundos.",
        });
      } else {
        toast.error("Error de autenticación", {
          description: result.error ?? "Correo o contraseña incorrectos",
        });
      }
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error("Error con Google", { description: "No se recibió el token de Google" });
      return;
    }
    setIsLoading(true);
    const result = await loginWithGoogle(credentialResponse.credential);
    setIsLoading(false);

    if (result.ok) {
      if (result.created) {
        toast.success("¡Cuenta creada!", { description: "Se registró una nueva cuenta con tu cuenta de Google" });
      } else {
        toast.success("¡Bienvenido!", { description: "Sesión iniciada con Google" });
      }
      if (redirectTo) navigate(redirectTo);
      else if (result.rol === "admin") navigate("/admin");
      else if (result.rol === "area") navigate("/area");
      else navigate("/dashboard");
    } else {
      toast.error("Error con Google", {
        description: result.error ?? "No se pudo iniciar sesión con Google",
      });
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <LogIn className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">
            Ingrese sus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                {...register("email", {
                  required: "El correo es requerido",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Correo electrónico inválido",
                  },
                })}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-10"
                  {...register("password", {
                    required: "La contraseña es requerida",
                    minLength: {
                      value: 8,
                      message: "La contraseña debe tener al menos 8 caracteres",
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
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-[#ff9800] hover:bg-[#f57c00] text-white font-bold" disabled={isLoading || (!!lockoutUntil && Date.now() < lockoutUntil)}>
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">o continua con</span>
            </div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                toast.error("Error con Google", { description: "No se pudo conectar con Google" });
              }}
              useOneTap
              locale="es"
              text="signin_with"
              shape="rectangular"
              theme="outline"
              width="368"
            />
          </div>
          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              ¿No tiene cuenta?{" "}
              <Link to="/registro" className="text-blue-600 hover:underline">
                Regístrese aquí
              </Link>
            </p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}