import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { User, FileText, Clock, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import {
  apiListPQRS,
  PQRS_STATUS_LABEL,
  PQRS_TYPE_LABEL,
  type PqrsAPI,
} from "../lib/api";
import { formatDateTime } from "../lib/utils";

export function UserDashboard() {
  const { usuario } = useAuth();
  const [misPQRS, setMisPQRS] = useState<PqrsAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiListPQRS({ page_size: 200 })
      .then((res) => {
        const items: PqrsAPI[] = Array.isArray(res)
          ? (res as unknown as PqrsAPI[])
          : (res as any).results ?? [];
        setMisPQRS(
          [...items].sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          ),
        );
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const getEstadoBadge = (status: string) => {
    const map: Record<string, React.ReactNode> = {
      RAD: <Badge variant="warning">Radicado</Badge>,
      PRO: <Badge>En Proceso</Badge>,
      RES: <Badge variant="success">Resuelto</Badge>,
      CER: <Badge variant="secondary">Cerrado</Badge>,
    };
    return map[status] || <Badge>{status}</Badge>;
  };

  const estadisticas = {
    total: misPQRS.length,
    radicadas: misPQRS.filter((p) => p.status === "RAD").length,
    enProceso: misPQRS.filter((p) => p.status === "PRO").length,
    resueltas: misPQRS.filter((p) => p.status === "RES" || p.status === "CER").length,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2">Panel de Usuario</h1>
          <p className="text-gray-600">
            Bienvenido, {usuario?.nombre} {usuario?.apellido}
          </p>
        </div>
        <Link to="/crear-pqrs">
          <Button className="bg-[#ff9800] hover:bg-[#f57c00] text-white font-bold">
            <Plus className="h-4 w-4 mr-1" />
            Nueva PQRS
          </Button>
        </Link>
      </div>

      {/* Estadísticas */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
            <FileText className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticas.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Radicadas</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{estadisticas.radicadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">En Proceso</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{estadisticas.enProceso}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Resueltas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{estadisticas.resueltas}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Solicitudes</CardTitle>
          <CardDescription>Historial de todas las PQRS que ha radicado</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-gray-500">Cargando solicitudes…</div>
          ) : misPQRS.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No hay solicitudes registradas</h3>
              <p className="text-sm text-gray-600 mb-6">Comience radicando su primera PQRS</p>
              <Link to="/crear-pqrs">
                <Button>
                  <Plus className="h-4 w-4 mr-1" />
                  Radicar PQRS
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {misPQRS.map((pqrs) => (
                <div
                  key={pqrs.id}
                  className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{pqrs.subject}</h3>
                        {getEstadoBadge(pqrs.status)}
                      </div>
                      <p className="text-sm text-gray-500 font-mono">{pqrs.numero_radicado ?? pqrs.radicado}</p>
                    </div>
                    <Badge variant="outline">
                      {pqrs.pqrs_type ? (PQRS_TYPE_LABEL[pqrs.pqrs_type] ?? pqrs.pqrs_type) : 'N/A'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{pqrs.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Radicado: {formatDateTime(pqrs.created_at)}</span>
                    <span>Actualizado: {formatDateTime(pqrs.updated_at)}</span>
                    {pqrs.dependency && (
                      <span className="text-blue-600">Área: {pqrs.dependency.name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
