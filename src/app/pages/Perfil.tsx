import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { User, KeyRound, Loader2, Save } from "lucide-react";
import { apiUpdatePerfil, apiChangePassword, formatApiError } from "../lib/api";

interface ProfileForm {
  nombre: string;
  apellido: string;
  username: string;
  telefono: string;
  direccion: string;
  ciudad: string;
}

interface PasswordForm {
  password_actual: string;
  password_nuevo: string;
  password_nuevo2: string;
}

export function Perfil() {
  const { usuario, refreshPerfil } = useAuth();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const profileForm = useForm<ProfileForm>({
    defaultValues: {
      nombre:    usuario?.nombre    ?? "",
      apellido:  usuario?.apellido  ?? "",
      username:  usuario?.username  ?? "",
      telefono:  usuario?.telefono  ?? "",
      direccion: "",
      ciudad:    usuario?.ciudad    ?? "",
    },
  });

  const passwordForm = useForm<PasswordForm>();

  const onSaveProfile = async (data: ProfileForm) => {
    setSavingProfile(true);
    try {
      await apiUpdatePerfil({
        nombre:    data.nombre   || undefined,
        apellido:  data.apellido || undefined,
        username:  data.username || undefined,
        telefono:  data.telefono || undefined,
        direccion: data.direccion || undefined,
        ciudad:    data.ciudad   || undefined,
      });
      await refreshPerfil();
      toast.success("Perfil actualizado correctamente");
    } catch (err) {
      toast.error("Error al actualizar perfil", { description: formatApiError(err) });
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async (data: PasswordForm) => {
    if (data.password_nuevo !== data.password_nuevo2) {
      passwordForm.setError("password_nuevo2", { message: "Las contraseñas no coinciden" });
      return;
    }
    setSavingPassword(true);
    try {
      await apiChangePassword({
        password_actual: data.password_actual,
        password_nuevo:  data.password_nuevo,
        password_nuevo2: data.password_nuevo2,
      });
      toast.success("Contraseña actualizada correctamente");
      passwordForm.reset();
    } catch (err) {
      toast.error("Error al cambiar contraseña", { description: formatApiError(err) });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <User className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-sm text-gray-500">{usuario?.email}</p>
        </div>
      </div>

      <Tabs defaultValue="perfil">
        <TabsList className="mb-6 w-full">
          <TabsTrigger value="perfil" className="flex-1 gap-2">
            <User className="h-4 w-4" /> Datos personales
          </TabsTrigger>
          <TabsTrigger value="password" className="flex-1 gap-2">
            <KeyRound className="h-4 w-4" /> Cambiar contraseña
          </TabsTrigger>
        </TabsList>

        {/* ── Datos personales ─────────────────────────── */}
        <TabsContent value="perfil">
          <Card>
            <CardHeader>
              <CardTitle>Datos personales</CardTitle>
              <CardDescription>Actualiza tu nombre, teléfono y ciudad.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      {...profileForm.register("nombre", {
                        minLength: { value: 2, message: "Mínimo 2 caracteres" },
                      })}
                    />
                    {profileForm.formState.errors.nombre && (
                      <p className="text-sm text-red-600">{profileForm.formState.errors.nombre.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellido">Apellido</Label>
                    <Input
                      id="apellido"
                      {...profileForm.register("apellido", {
                        minLength: { value: 2, message: "Mínimo 2 caracteres" },
                      })}
                    />
                    {profileForm.formState.errors.apellido && (
                      <p className="text-sm text-red-600">{profileForm.formState.errors.apellido.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de usuario</Label>
                  <Input
                    id="username"
                    {...profileForm.register("username", {
                      required: "El nombre de usuario es requerido",
                      minLength: { value: 3, message: "Mínimo 3 caracteres" },
                    })}
                  />
                  {profileForm.formState.errors.username && (
                    <p className="text-sm text-red-600">{profileForm.formState.errors.username.message}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      type="tel"
                      placeholder="3001234567"
                      {...profileForm.register("telefono", {
                        pattern: {
                          value: /^[0-9+\s()-]{7,15}$/,
                          message: "Número inválido",
                        },
                      })}
                    />
                    {profileForm.formState.errors.telefono && (
                      <p className="text-sm text-red-600">{profileForm.formState.errors.telefono.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ciudad">Ciudad</Label>
                    <Input
                      id="ciudad"
                      placeholder="Bogotá D.C."
                      {...profileForm.register("ciudad")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    placeholder="Calle 123 #45-67"
                    {...profileForm.register("direccion")}
                  />
                </div>

                {/* Read-only info */}
                <div className="rounded-lg bg-gray-50 p-4 text-sm space-y-1.5 border">
                  <p className="text-gray-500 font-medium text-xs uppercase tracking-wide mb-2">Solo lectura</p>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Correo</span>
                    <span className="font-medium">{usuario?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rol</span>
                    <span className="font-medium capitalize">{usuario?.rol}</span>
                  </div>
                  {usuario?.dependencyName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Área</span>
                      <span className="font-medium">{usuario.dependencyName}</span>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={savingProfile}
                >
                  {savingProfile
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
                    : <><Save className="h-4 w-4 mr-2" />Guardar cambios</>
                  }
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Cambiar contraseña ────────────────────────── */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Cambiar contraseña</CardTitle>
              <CardDescription>
                La nueva contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password_actual">Contraseña actual *</Label>
                  <Input
                    id="password_actual"
                    type="password"
                    autoComplete="current-password"
                    {...passwordForm.register("password_actual", {
                      required: "Ingrese su contraseña actual",
                    })}
                  />
                  {passwordForm.formState.errors.password_actual && (
                    <p className="text-sm text-red-600">{passwordForm.formState.errors.password_actual.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password_nuevo">Nueva contraseña *</Label>
                  <Input
                    id="password_nuevo"
                    type="password"
                    autoComplete="new-password"
                    {...passwordForm.register("password_nuevo", {
                      required: "Ingrese la nueva contraseña",
                      minLength: { value: 8, message: "Mínimo 8 caracteres" },
                    })}
                  />
                  {passwordForm.formState.errors.password_nuevo && (
                    <p className="text-sm text-red-600">{passwordForm.formState.errors.password_nuevo.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password_nuevo2">Confirmar nueva contraseña *</Label>
                  <Input
                    id="password_nuevo2"
                    type="password"
                    autoComplete="new-password"
                    {...passwordForm.register("password_nuevo2", {
                      required: "Confirme la nueva contraseña",
                    })}
                  />
                  {passwordForm.formState.errors.password_nuevo2 && (
                    <p className="text-sm text-red-600">{passwordForm.formState.errors.password_nuevo2.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={savingPassword}
                >
                  {savingPassword
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Actualizando...</>
                    : <><KeyRound className="h-4 w-4 mr-2" />Cambiar contraseña</>
                  }
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
