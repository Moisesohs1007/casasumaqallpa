import type { AuditFields } from '../types/common';

const generateUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const nowISO = () => new Date().toISOString();

const buildAudit = (user = 'system-init'): AuditFields => ({
  createdAt: nowISO(),
  updatedAt: nowISO(),
  createdBy: user,
  updatedBy: user,
});

const hoy = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const addDaysISO = (baseISO: string, days: number) => {
  const d = new Date(baseISO);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

export type Create<T extends Record<string, any>> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> &
  Partial<Pick<T, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>>;

export type Update<T extends Record<string, any>> = Partial<Omit<T, 'id'>>;

const auditSeed = buildAudit();

const HAB_TIPOS: any[] = [
  {
    id: 'TIPO-DOBLE-P2',
    nombre: 'Habitación Doble Piso 2',
    descripcion: 'Habitación doble en 2do piso, 2 camas matrimoniales opc.',
    capacidadAdultos: 2,
    capacidadNinos: 1,
    camas: [{ tipo: 'DOBLE', cantidad: 1 }],
    serviciosIncluidos: ['WIFI', 'AGUA_CALIENTE', 'DESAYUNO_OPC'],
    fotos: [],
    estado: 'ACTIVO',
    precioBaseNoche: 180,
    ...auditSeed,
  },
  {
    id: 'TIPO-SUITE',
    nombre: 'Suite',
    descripcion: 'Suite principal con sala privada y vista.',
    capacidadAdultos: 2,
    capacidadNinos: 2,
    camas: [{ tipo: 'KING', cantidad: 1 }],
    serviciosIncluidos: ['WIFI', 'AGUA_CALIENTE', 'TV_CABLE', 'MINIBAR'],
    fotos: [],
    estado: 'ACTIVO',
    precioBaseNoche: 380,
    ...auditSeed,
  },
  {
    id: 'TIPO-CABANA',
    nombre: 'Cabaña',
    descripcion: 'Cabaña independiente estilo rústico.',
    capacidadAdultos: 2,
    capacidadNinos: 0,
    camas: [{ tipo: 'QUEEN', cantidad: 1 }],
    serviciosIncluidos: ['WIFI', 'AGUA_CALIENTE'],
    fotos: [],
    estado: 'ACTIVO',
    precioBaseNoche: 260,
    ...auditSeed,
  },
];

const HABS: any[] = [
  { id: 'HAB-H201', codigo: 'H201', nombre: 'Habitación 201', tipoHabitacionId: 'TIPO-DOBLE-P2', piso: '2', ubicacion: 'Piso 2 · Frente', estado: 'LIBRE', estadoLimpieza: 'LIMPIA', vistaEfectiva: 'VISTA_CALLE', ...auditSeed },
  { id: 'HAB-H202', codigo: 'H202', nombre: 'Habitación 202', tipoHabitacionId: 'TIPO-DOBLE-P2', piso: '2', ubicacion: 'Piso 2 · Interior', estado: 'LIBRE', estadoLimpieza: 'LIMPIA', vistaEfectiva: 'INTERIOR', ...auditSeed },
  { id: 'HAB-H203', codigo: 'H203', nombre: 'Habitación 203', tipoHabitacionId: 'TIPO-DOBLE-P2', piso: '2', ubicacion: 'Piso 2 · Fondo', estado: 'LIBRE', estadoLimpieza: 'LIMPIA', vistaEfectiva: 'VISTA_JARDIN', ...auditSeed },
  { id: 'HAB-SUITE', codigo: 'SUITE', nombre: 'Suite Principal', tipoHabitacionId: 'TIPO-SUITE', piso: '3', ubicacion: 'Piso 3', estado: 'LIBRE', estadoLimpieza: 'LIMPIA', vistaEfectiva: 'VISTA_PANORAMICA', ...auditSeed },
  { id: 'HAB-CABANA', codigo: 'CABAÑA', nombre: 'Cabaña Independiente', tipoHabitacionId: 'TIPO-CABANA', piso: '1', ubicacion: 'Jardín trasero', estado: 'MANTENIMIENTO', motivoBloqueo: 'Calefón en mantenimiento', estadoLimpieza: 'PENDIENTE', ...auditSeed },
];

const POL_CANC: any[] = [
  { id: 'POL-GENERAL', nombre: 'Política General', tipo: 'MODERADA', diasAntesParaCancelarGratis: 3, porcentajeMultaPorCancelacionTardia: 50, porcentajeMultaNoShow: 100, notas: 'Aplica a todas las reservas por defecto.', ...auditSeed },
];

const TARIFAS: any[] = [
  { id: 'TAR-DOBLE-GEN', nombre: 'Tarifa Hab Doble', tipoHabitacionId: 'TIPO-DOBLE-P2', moneda: 'PEN', precioBasePorNoche: 180, regimen: 'SOLO_ALOJAMIENTO', estado: 'ACTIVO', ...auditSeed },
  { id: 'TAR-SUITE-GEN', nombre: 'Tarifa Suite',    tipoHabitacionId: 'TIPO-SUITE',    moneda: 'PEN', precioBasePorNoche: 380, regimen: 'SOLO_ALOJAMIENTO', estado: 'ACTIVO', ...auditSeed },
  { id: 'TAR-CAB-GEN',   nombre: 'Tarifa Cabaña',   tipoHabitacionId: 'TIPO-CABANA',   moneda: 'PEN', precioBasePorNoche: 260, regimen: 'SOLO_ALOJAMIENTO', estado: 'ACTIVO', ...auditSeed },
];

export const seed = {
  audit: auditSeed,
  alergenos: [],
  estacionesCocina: [],
  impuestos: [],
  categoriasFB: [],
  productosFB: [],
  presentacionesFB: [],
  modificadoresFB: [],
  tiposHabitacion: HAB_TIPOS,
  habitaciones: HABS,
  tarifas: TARIFAS,
  temporadas: [],
  politicasCancelacion: POL_CANC,
  codigosPromo: [],
  huespedes: [],
  roles: [],
  usuarios: [],
  puntosVenta: [],
  mesas: [],
  reservas: [],
  folios: [],
  pagosFolio: [],
  comandas: [],
};

export const seedUtil = {
  generateUUID,
  nowISO,
  addDaysISO,
  hoy,
};
