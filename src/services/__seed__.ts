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

export const seed = {
  audit: auditSeed,
  alergenos: [],
  estacionesCocina: [],
  impuestos: [],
  categoriasFB: [],
  productosFB: [],
  presentacionesFB: [],
  modificadoresFB: [],
  tiposHabitacion: [],
  habitaciones: [],
  tarifas: [],
  temporadas: [],
  politicasCancelacion: [],
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
