export type TipoPQRS = "peticion" | "queja" | "reclamo" | "sugerencia";
export type EstadoPQRS = "pendiente" | "en_proceso" | "resuelto" | "cerrado";

export interface Area {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  activa: boolean;
}

export interface PQRS {
  id: string;
  radicado: string;
  tipo: TipoPQRS;
  asunto: string;
  descripcion: string;
  nombre: string;
  email: string;
  telefono?: string;
  estado: EstadoPQRS;
  fechaCreacion: string;
  fechaActualizacion: string;
  respuesta?: string;
  usuarioId?: string;
  areaId?: string;
  asignadoPor?: string;
  fechaAsignacion?: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol: "admin" | "usuario" | "area";
  areaId?: string;
}

// Áreas mock
export const areasMock: Area[] = [
  {
    id: "area-1",
    nombre: "Atención al Ciudadano",
    descripcion: "Área encargada de peticiones generales y consultas",
    color: "bg-blue-500",
    activa: true,
  },
  {
    id: "area-2",
    nombre: "Recursos Humanos",
    descripcion: "Gestión de quejas y reclamos laborales",
    color: "bg-purple-500",
    activa: true,
  },
  {
    id: "area-3",
    nombre: "Servicios Técnicos",
    descripcion: "Atención de reclamos técnicos y mantenimiento",
    color: "bg-green-500",
    activa: true,
  },
  {
    id: "area-4",
    nombre: "Calidad",
    descripcion: "Gestión de sugerencias y mejora continua",
    color: "bg-orange-500",
    activa: true,
  },
];

// Usuarios mock
// NOTA DE SEGURIDAD: No incluir contraseñas reales. La autenticación siempre
// debe realizarse a través de la API real (/api/login/). Estos datos son solo
// para referencia de estructura y pruebas de UI sin conexión al backend.
export const usuariosMock: Usuario[] = [
  {
    id: "1",
    nombre: "Administrador",
    email: "admin@pqrs.com",
    password: "",
    rol: "admin",
  },
  {
    id: "2",
    nombre: "Juan Pérez",
    email: "juan@correo.com",
    password: "",
    rol: "usuario",
  },
  {
    id: "3",
    nombre: "María Rodríguez",
    email: "maria.area@pqrs.com",
    password: "",
    rol: "area",
    areaId: "area-1",
  },
  {
    id: "4",
    nombre: "Carlos López",
    email: "carlos.area@pqrs.com",
    password: "",
    rol: "area",
    areaId: "area-2",
  },
];

// PQRS mock
export const pqrsMock: PQRS[] = [
  {
    id: "1",
    radicado: "PQRS-2026-0001",
    tipo: "peticion",
    asunto: "Solicitud de información sobre trámites",
    descripcion: "Requiero información detallada sobre los trámites disponibles para personas naturales.",
    nombre: "María González",
    email: "maria@correo.com",
    telefono: "3001234567",
    estado: "resuelto",
    fechaCreacion: "2026-01-15T10:30:00",
    fechaActualizacion: "2026-01-20T15:45:00",
    respuesta: "Buenos días María. Hemos enviado a su correo electrónico la guía completa de trámites disponibles.",
    areaId: "area-1",
    asignadoPor: "1",
    fechaAsignacion: "2026-01-15T11:00:00",
  },
  {
    id: "2",
    radicado: "PQRS-2026-0002",
    tipo: "queja",
    asunto: "Demora en atención presencial",
    descripcion: "El pasado lunes estuve más de 2 horas esperando para ser atendido en ventanilla.",
    nombre: "Carlos Rodríguez",
    email: "carlos@correo.com",
    estado: "en_proceso",
    fechaCreacion: "2026-02-10T09:15:00",
    fechaActualizacion: "2026-02-12T11:20:00",
    respuesta: "Estimado Carlos, lamentamos la situación. Estamos revisando el incidente y tomando medidas.",
    usuarioId: "2",
    areaId: "area-1",
    asignadoPor: "1",
    fechaAsignacion: "2026-02-10T10:00:00",
  },
  {
    id: "3",
    radicado: "PQRS-2026-0003",
    tipo: "reclamo",
    asunto: "Error en certificado expedido",
    descripcion: "El certificado que me entregaron contiene información incorrecta en el número de documento.",
    nombre: "Ana Martínez",
    email: "ana@correo.com",
    telefono: "3159876543",
    estado: "pendiente",
    fechaCreacion: "2026-02-20T14:00:00",
    fechaActualizacion: "2026-02-20T14:00:00",
  },
  {
    id: "4",
    radicado: "PQRS-2026-0004",
    tipo: "sugerencia",
    asunto: "Implementar sistema de citas en línea",
    descripcion: "Sería muy útil contar con un sistema de agendamiento de citas por internet para evitar filas.",
    nombre: "Luis Hernández",
    email: "luis@correo.com",
    estado: "en_proceso",
    fechaCreacion: "2026-02-22T16:30:00",
    fechaActualizacion: "2026-02-23T10:00:00",
    areaId: "area-4",
    asignadoPor: "1",
    fechaAsignacion: "2026-02-22T17:00:00",
  },
  {
    id: "5",
    radicado: "PQRS-2026-0005",
    tipo: "peticion",
    asunto: "Solicitud de copia de resolución",
    descripcion: "Necesito copia de la resolución número 0245 del año 2025.",
    nombre: "Patricia Sánchez",
    email: "patricia@correo.com",
    telefono: "3208765432",
    estado: "cerrado",
    fechaCreacion: "2026-01-05T11:00:00",
    fechaActualizacion: "2026-01-08T09:30:00",
    respuesta: "Su solicitud ha sido atendida. La copia fue entregada el 08/01/2026.",
    areaId: "area-1",
    asignadoPor: "1",
    fechaAsignacion: "2026-01-05T11:30:00",
  },
];

// Funciones helper
export function generarRadicado(): string {
  const año = new Date().getFullYear();
  const numero = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `PQRS-${año}-${numero}`;
}

export function getPQRSByRadicado(radicado: string): PQRS | undefined {
  try {
    const pqrs = localStorage.getItem("pqrs");
    if (pqrs) {
      const listaPQRS: PQRS[] = JSON.parse(pqrs);
      return listaPQRS.find(
        (p) => p.radicado.toLowerCase() === radicado.toLowerCase()
      );
    }
  } catch {
    localStorage.removeItem("pqrs");
  }
  return pqrsMock.find(
    (p) => p.radicado.toLowerCase() === radicado.toLowerCase()
  );
}

export function getPQRSByUsuario(usuarioId: string): PQRS[] {
  try {
    const pqrs = localStorage.getItem("pqrs");
    if (pqrs) {
      const listaPQRS: PQRS[] = JSON.parse(pqrs);
      return listaPQRS.filter((p) => p.usuarioId === usuarioId);
    }
  } catch {
    localStorage.removeItem("pqrs");
  }
  return pqrsMock.filter((p) => p.usuarioId === usuarioId);
}

export function getAllPQRS(): PQRS[] {
  try {
    const pqrs = localStorage.getItem("pqrs");
    if (pqrs) {
      return JSON.parse(pqrs);
    }
  } catch {
    localStorage.removeItem("pqrs");
  }
  // Inicializar localStorage con datos mock
  localStorage.setItem("pqrs", JSON.stringify(pqrsMock));
  return pqrsMock;
}

export function savePQRS(pqrs: PQRS): void {
  const listaPQRS = getAllPQRS();
  listaPQRS.push(pqrs);
  localStorage.setItem("pqrs", JSON.stringify(listaPQRS));
}

export function updatePQRS(id: string, updates: Partial<PQRS>): void {
  const listaPQRS = getAllPQRS();
  const index = listaPQRS.findIndex((p) => p.id === id);
  if (index !== -1) {
    listaPQRS[index] = { ...listaPQRS[index], ...updates, fechaActualizacion: new Date().toISOString() };
    localStorage.setItem("pqrs", JSON.stringify(listaPQRS));
  }
}

// Funciones para Áreas
export function getAllAreas(): Area[] {
  try {
    const areas = localStorage.getItem("areas");
    if (areas) {
      return JSON.parse(areas);
    }
  } catch {
    localStorage.removeItem("areas");
  }
  localStorage.setItem("areas", JSON.stringify(areasMock));
  return areasMock;
}

export function saveArea(area: Area): void {
  const areas = getAllAreas();
  areas.push(area);
  localStorage.setItem("areas", JSON.stringify(areas));
}

export function updateArea(id: string, updates: Partial<Area>): void {
  const areas = getAllAreas();
  const index = areas.findIndex((a) => a.id === id);
  if (index !== -1) {
    areas[index] = { ...areas[index], ...updates };
    localStorage.setItem("areas", JSON.stringify(areas));
  }
}

export function deleteArea(id: string): void {
  const areas = getAllAreas();
  const filteredAreas = areas.filter((a) => a.id !== id);
  localStorage.setItem("areas", JSON.stringify(filteredAreas));
}

export function getAreaById(id: string): Area | undefined {
  const areas = getAllAreas();
  return areas.find((a) => a.id === id);
}

// Funciones para usuarios
export function getAllUsuarios(): Usuario[] {
  try {
    const usuarios = localStorage.getItem("usuarios");
    if (usuarios) {
      return [...usuariosMock, ...JSON.parse(usuarios)];
    }
  } catch {
    localStorage.removeItem("usuarios");
  }
  return usuariosMock;
}

export function updateUsuario(id: string, updates: Partial<Usuario>): void {
  // Para usuarios mock
  const usuarioMock = usuariosMock.find(u => u.id === id);
  if (usuarioMock) {
    Object.assign(usuarioMock, updates);
    return;
  }
  
  // Para usuarios registrados
  const usuarios = localStorage.getItem("usuarios");
  if (usuarios) {
    const listaUsuarios: Usuario[] = JSON.parse(usuarios);
    const index = listaUsuarios.findIndex((u) => u.id === id);
    if (index !== -1) {
      listaUsuarios[index] = { ...listaUsuarios[index], ...updates };
      localStorage.setItem("usuarios", JSON.stringify(listaUsuarios));
    }
  }
}

export function getPQRSByArea(areaId: string): PQRS[] {
  const pqrs = getAllPQRS();
  return pqrs.filter((p) => p.areaId === areaId);
}

export function getPQRSSinAsignar(): PQRS[] {
  const pqrs = getAllPQRS();
  return pqrs.filter((p) => !p.areaId);
}

export function asignarPQRSArea(pqrsId: string, areaId: string, asignadoPor: string): void {
  updatePQRS(pqrsId, {
    areaId,
    asignadoPor,
    fechaAsignacion: new Date().toISOString(),
    estado: "en_proceso",
  });
}