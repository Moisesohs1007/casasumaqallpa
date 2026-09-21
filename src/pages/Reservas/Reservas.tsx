import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonBadge } from '@ionic/react';
import type { Color } from '@ionic/core';
import {
  Reserva,
  EstadoReserva,
  OrigenReserva,
  Moneda,
  Huesped,
  HabitacionReserva,
  PoliticaCancelacion,
  ID,
  DateTimeISO,
  DateISO,
} from '../../types';
import './Reservas.css';

const now = new Date();
const isoNow: DateTimeISO = now.toISOString();

function buildMockHuesped(id: string, nombres: string, apellidos: string, tel: string): Huesped {
  return {
    id,
    uuid: `huesped-uuid-${id}`,
    nombres,
    apellidos,
    tipoDocumento: 'DNI',
    numeroDocumento: `${id}-${nombres.slice(0, 3)}`,
    telefonoCelular: tel,
    preferenciasAlimentarias: 'NINGUNA',
    tags: [],
    createdAt: isoNow,
    updatedAt: isoNow,
  };
}

function buildMockReserva(params: {
  id: ID;
  codigo: string;
  huespedTitularId: ID;
  huespedTitular?: Huesped;
  habitacionNombre: string;
  estado: EstadoReserva;
  origen: OrigenReserva;
  fechaCheckIn: DateISO;
  fechaCheckOut: DateISO;
  noches: number;
  adultos: number;
  ninos?: number;
}): Reserva {
  const habitacionReserva: HabitacionReserva = {
    id: `hab-res-${params.id}`,
    reservaId: params.id,
    habitacionId: params.habitacionNombre,
    tipoHabitacionId: 'tipo-x',
    tarifaId: 'tarifa-x',
    fechaCheckIn: params.fechaCheckIn,
    fechaCheckOut: params.fechaCheckOut,
    noches: params.noches,
    adultos: params.adultos,
    ninos: params.ninos ?? 0,
    precioTotalReservaHabitacion: 100 * params.noches,
    moneda: 'PEN',
  };
  const politica: PoliticaCancelacion = {
    id: 'pc-default',
    nombre: 'Flexible',
    tipo: 'FLEXIBLE',
    diasAntesParaCancelarGratis: 2,
    estado: 'ACTIVO',
    createdAt: isoNow,
    updatedAt: isoNow,
  };
  const subtotal = habitacionReserva.precioTotalReservaHabitacion;
  return {
    id: params.id,
    codigo: params.codigo,
    huespedTitularId: params.huespedTitularId,
    huespedTitular: params.huespedTitular,
    habitaciones: [habitacionReserva],
    origen: params.origen,
    estado: params.estado,
    fechaCreacion: isoNow,
    fechaCheckIn: params.fechaCheckIn,
    fechaCheckOut: params.fechaCheckOut,
    noches: params.noches,
    adultosTotal: params.adultos,
    ninosTotal: params.ninos ?? 0,
    moneda: 'PEN' as Moneda,
    subTotalAlojamiento: subtotal,
    impuestos: Math.round(subtotal * 0.18),
    descuentos: 0,
    totalReserva: subtotal + Math.round(subtotal * 0.18),
    politicaCancelacionId: politica.id,
    politicaCancelacion: politica,
    historialCambios: [
      {
        id: `hc-${params.id}-1`,
        fecha: isoNow,
        usuarioId: 'usr-actual',
        tipoCambio: 'CREADA',
      },
    ],
    createdAt: isoNow,
    updatedAt: isoNow,
  };
}

const mockHuespedes: Huesped[] = [
  buildMockHuesped('h-perez', 'Juan', 'Pérez', '+51987654321'),
  buildMockHuesped('h-gomez', 'María', 'Gómez', '+51987654322'),
  buildMockHuesped('h-quispe', 'Luis', 'Quispe', '+51987654323'),
  buildMockHuesped('h-ramos', 'Ana', 'Ramos', '+51987654324'),
  buildMockHuesped('h-huaman', 'Carlos', 'Huamán', '+51987654325'),
];

const mockReservas: Reserva[] = [
  buildMockReserva({
    id: 'res-1001',
    codigo: 'R-1001',
    huespedTitularId: mockHuespedes[0].id,
    huespedTitular: mockHuespedes[0],
    habitacionNombre: 'Cabaña 1',
    estado: 'CHECKIN',
    origen: 'DIRECTA',
    fechaCheckIn: '2026-09-20',
    fechaCheckOut: '2026-09-23',
    noches: 3,
    adultos: 2,
  }),
  buildMockReserva({
    id: 'res-1002',
    codigo: 'R-1002',
    huespedTitularId: mockHuespedes[1].id,
    huespedTitular: mockHuespedes[1],
    habitacionNombre: 'Suite 2',
    estado: 'CONFIRMADA',
    origen: 'BOOKING',
    fechaCheckIn: '2026-09-21',
    fechaCheckOut: '2026-09-24',
    noches: 3,
    adultos: 2,
    ninos: 1,
  }),
  buildMockReserva({
    id: 'res-1003',
    codigo: 'R-1003',
    huespedTitularId: mockHuespedes[2].id,
    huespedTitular: mockHuespedes[2],
    habitacionNombre: 'Familiar 3',
    estado: 'CHECKIN',
    origen: 'WHATSAPP',
    fechaCheckIn: '2026-09-20',
    fechaCheckOut: '2026-09-22',
    noches: 2,
    adultos: 3,
    ninos: 2,
  }),
  buildMockReserva({
    id: 'res-1004',
    codigo: 'R-1004',
    huespedTitularId: mockHuespedes[3].id,
    huespedTitular: mockHuespedes[3],
    habitacionNombre: 'Cabaña 4',
    estado: 'PENDIENTE',
    origen: 'WEB_OFICIAL',
    fechaCheckIn: '2026-09-25',
    fechaCheckOut: '2026-09-28',
    noches: 3,
    adultos: 2,
  }),
  buildMockReserva({
    id: 'res-1005',
    codigo: 'R-1005',
    huespedTitularId: mockHuespedes[4].id,
    huespedTitular: mockHuespedes[4],
    habitacionNombre: 'Doble 5',
    estado: 'CHECKOUT',
    origen: 'TELEFONO',
    fechaCheckIn: '2026-09-19',
    fechaCheckOut: '2026-09-20',
    noches: 1,
    adultos: 2,
  }),
];

const estadoColor: Record<EstadoReserva, Color> = {
  PENDIENTE: 'warning',
  CONFIRMADA: 'tertiary',
  CHECKIN: 'success',
  CHECKOUT: 'medium',
  CANCELADA: 'danger',
  NO_SHOW: 'danger',
  MODIFICADA: 'primary',
};

const estadoLabel: Record<EstadoReserva, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  CHECKIN: 'Check-in',
  CHECKOUT: 'Check-out',
  CANCELADA: 'Cancelada',
  NO_SHOW: 'No show',
  MODIFICADA: 'Modificada',
};

const ReservasPage: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Reservas</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Reservas</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonList inset>
          {mockReservas.map((r) => {
            const hab0 = r.habitaciones[0];
            const nombreHab = hab0?.habitacionId ?? '—';
            const titular = r.huespedTitular
              ? `${r.huespedTitular.nombres} ${r.huespedTitular.apellidos}`
              : `Titular #${r.huespedTitularId}`;
            return (
              <IonItem key={r.id} button detail>
                <IonLabel>
                  <h2>
                    #{r.codigo} — {titular}
                  </h2>
                  <p>
                    {nombreHab} · {r.noches} noche{r.noches === 1 ? '' : 's'} · {r.origen}
                  </p>
                  <p className="ion-text-wrap">
                    Check-in: {r.fechaCheckIn} · Check-out: {r.fechaCheckOut}
                  </p>
                </IonLabel>
                <IonBadge color={estadoColor[r.estado]} slot="end">
                  {estadoLabel[r.estado].toUpperCase()}
                </IonBadge>
              </IonItem>
            );
          })}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default ReservasPage;
