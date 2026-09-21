import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonBadge,
} from '@ionic/react';
import type { Color } from '@ionic/core';
import {
  Habitacion,
  EstadoHabitacion,
  TipoHabitacion,
  CamaHabitacion,
  Tarifa,
  Moneda,
  AuditFields,
} from '../../types';
import './Habitaciones.css';

const now = new Date();
const isoNow = now.toISOString();

const auditBase: AuditFields = {
  createdAt: isoNow,
  updatedAt: isoNow,
};

function buildMockTipo(nombre: string, capacidadAdultos: number, capacidadNinos: number): TipoHabitacion {
  return {
    id: `tipo-${nombre.replace(/\s+/g, '-').toLowerCase()}`,
    nombre,
    capacidadAdultos,
    capacidadNinos,
    camas: [{ tipo: 'DOBLE', cantidad: Math.ceil(capacidadAdultos / 2) }] as CamaHabitacion[],
    serviciosIncluidos: ['WiFi', 'Agua caliente', 'Toallas'],
    fotos: [],
    estado: 'ACTIVO',
    ...auditBase,
  };
}

const tipos: Record<string, TipoHabitacion> = {
  'Cabaña Doble': buildMockTipo('Cabaña Doble', 2, 0),
  'Cabaña Triple': buildMockTipo('Cabaña Triple', 3, 0),
  'Familiar 4P': buildMockTipo('Familiar 4P', 3, 1),
  'Familiar 5P': buildMockTipo('Familiar 5P', 4, 1),
  Doble: buildMockTipo('Doble', 2, 0),
  'Suite con vista': buildMockTipo('Suite con vista', 2, 0),
};

function buildMockTarifa(tipoId: string, precio: number): Tarifa {
  return {
    id: `tarifa-${tipoId}`,
    nombre: `Tarifa estándar ${tipoId}`,
    tipoHabitacionId: tipoId,
    moneda: 'PEN' as Moneda,
    precioBasePorNoche: precio,
    regimen: 'SOLO_ALOJAMIENTO',
    minimoNoches: 1,
    politicaCancelacionId: 'pc-default',
    impuestos: [{ nombre: 'IGV', porcentaje: 18 }],
    estado: 'ACTIVO',
    ...auditBase,
  };
}

function buildMockHabitacion(codigo: string, tipoNombre: string, estadoLbl: 'libre' | 'ocupada' | 'limpieza' | 'mantenimiento', tarifaSoles: number): Habitacion {
  const tipo = tipos[tipoNombre];
  const estadoMap: Record<'libre' | 'ocupada' | 'limpieza' | 'mantenimiento', EstadoHabitacion> = {
    libre: 'LIBRE',
    ocupada: 'OCUPADA',
    limpieza: 'LIMPIEZA',
    mantenimiento: 'MANTENIMIENTO',
  };
  return {
    id: `hab-${codigo}`,
    codigo,
    tipoHabitacionId: tipo.id,
    tipoHabitacion: tipo,
    estado: estadoMap[estadoLbl],
    ...auditBase,
  };
}

const rawHabitaciones: Array<{ codigo: string; tipo: string; estado: 'libre' | 'ocupada' | 'limpieza' | 'mantenimiento'; tarifa: number }> = [
  { codigo: 'CAB-01', tipo: 'Cabaña Doble', estado: 'ocupada', tarifa: 280 },
  { codigo: 'CAB-02', tipo: 'Cabaña Doble', estado: 'libre', tarifa: 280 },
  { codigo: 'FAM-03', tipo: 'Familiar 4P', estado: 'ocupada', tarifa: 420 },
  { codigo: 'CAB-04', tipo: 'Cabaña Triple', estado: 'limpieza', tarifa: 360 },
  { codigo: 'DOB-05', tipo: 'Doble', estado: 'libre', tarifa: 220 },
  { codigo: 'SUI-06', tipo: 'Suite con vista', estado: 'mantenimiento', tarifa: 520 },
  { codigo: 'CAB-07', tipo: 'Cabaña Doble', estado: 'libre', tarifa: 280 },
  { codigo: 'FAM-08', tipo: 'Familiar 5P', estado: 'ocupada', tarifa: 500 },
];

const mockHabitaciones: Habitacion[] = rawHabitaciones.map((h) => buildMockHabitacion(h.codigo, h.tipo, h.estado, h.tarifa));
const mockTarifasPorTipo: Record<string, Tarifa> = Object.fromEntries(
  Object.entries(tipos).map(([nombre, t]) => [nombre, buildMockTarifa(t.id, rawHabitaciones.find((r) => r.tipo === nombre)?.tarifa ?? 200)]),
);
const rawHabitacionesByCodigo: Record<string, (typeof rawHabitaciones)[number]> = Object.fromEntries(
  rawHabitaciones.map((r) => [r.codigo, r]),
);

const estadoLabel: Record<EstadoHabitacion, string> = {
  LIBRE: 'LIBRE',
  OCUPADA: 'OCUPADA',
  RESERVADA: 'RESERVADA',
  BLOQUEADA: 'BLOQUEADA',
  LIMPIEZA: 'LIMPIEZA',
  INSPECCIONADA: 'INSPECCIONADA',
  MANTENIMIENTO: 'MANTENIMIENTO',
};

const estadoColor: Record<EstadoHabitacion, Color> = {
  LIBRE: 'success',
  OCUPADA: 'danger',
  RESERVADA: 'primary',
  BLOQUEADA: 'medium',
  LIMPIEZA: 'warning',
  INSPECCIONADA: 'tertiary',
  MANTENIMIENTO: 'medium',
};

const HabitacionesPage: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Habitaciones</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Habitaciones</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonGrid className="table-grid">
          <IonRow>
            {mockHabitaciones.map((h) => {
              const raw = rawHabitacionesByCodigo[h.codigo];
              const tipo = h.tipoHabitacion;
              const capacidadTotal = (tipo?.capacidadAdultos ?? 0) + (tipo?.capacidadNinos ?? 0);
              const tarifa = tipo ? mockTarifasPorTipo[tipo.nombre] : undefined;
              const tarifaBase = tarifa?.precioBasePorNoche ?? raw?.tarifa ?? 0;
              return (
                <IonCol key={h.id} size="12" size-sm="6" size-md="4" size-lg="3" size-xl="3">
                  <IonCard button className={`hab-card hab-${h.estado.toLowerCase()}`}>
                    <IonCardHeader>
                      <div className="hab-row">
                        <IonCardTitle>{h.codigo}</IonCardTitle>
                        <IonBadge color={estadoColor[h.estado]}>{estadoLabel[h.estado]}</IonBadge>
                      </div>
                      <IonCardSubtitle>{tipo?.nombre ?? raw?.tipo}</IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <p>
                        Capacidad: <strong>{capacidadTotal} pax</strong>
                      </p>
                      <p>
                        Tarifa base: <strong>S/ {tarifaBase.toFixed(2)}</strong>
                      </p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              );
            })}
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default HabitacionesPage;
