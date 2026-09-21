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
  IonLabel,
  IonChip,
} from '@ionic/react';
import type { Color } from '@ionic/core';
import { checkmarkCircle, alert, timeOutline, Icon } from 'ionicons/icons';
import {
  PuntoVenta,
  TipoPuntoVenta,
  Mesa,
  EstadoMesa as EstadoMesaReal,
  Comanda,
  EstadoComanda as EstadoComandaReal,
  TipoConsumoComanda,
  PrioridadComanda,
  Moneda,
  Usuario,
  Huesped,
  ID,
  DateTimeISO,
} from '../../types';
import './Pos.css';

const now = new Date();
const isoNow: DateTimeISO = now.toISOString();

const auditBase = { createdAt: isoNow, updatedAt: isoNow };

const pvRestaurante: PuntoVenta = {
  id: 'pv-restaurante-1',
  nombre: 'Restaurante Principal',
  tipo: 'RESTAURANTE_CON_MESAS' as TipoPuntoVenta,
  prefijoComanda: 'C-RST',
  proximoNumeroComanda: 1001,
  moneda: 'PEN' as Moneda,
  horarioAtencion: [{ diaSemana: 'TODOS', operacion24h: true }],
  tiposComandasPermitidos: ['MESA_RESTAURANTE', 'ROOM_SERVICE', 'PARA_LLEVAR'],
  propinaOpcional: true,
  propinaPorcentajeSugerido: 10,
  impuestoPorDefecto: 'IGV',
  permiteDescuentos: true,
  maximoDescuentoPorcentaje: 20,
  permiteCortesias: true,
  estado: 'ACTIVO',
  ...auditBase,
};

const estadoMesaMap: Record<'libre' | 'ocupada' | 'sucia', EstadoMesaReal> = {
  libre: 'LIBRE',
  ocupada: 'OCUPADA',
  sucia: 'EN_LIMPIEZA',
};

function buildMockUsuario(id: ID, iniciales: string, nombre: string, apellido: string, rolNombre: string): Usuario {
  return {
    id,
    uuid: `usr-uuid-${id}`,
    iniciales,
    nombres: nombre,
    apellidos: apellido,
    correoElectronico: `${nombre.toLowerCase()}.${apellido.toLowerCase()}@casasumaqallpa.com`,
    rolId: `rol-${rolNombre.toLowerCase()}`,
    estado: 'ACTIVO',
    passwordHash: '__hidden__',
    ...auditBase,
  };
}

const mockUsuariosMozos: Usuario[] = [
  buildMockUsuario('usr-luis', 'LM', 'Luis', 'Mendoza', 'MOZO'),
  buildMockUsuario('usr-ana', 'AR', 'Ana', 'Ramos', 'MOZO'),
  buildMockUsuario('usr-rs', 'RS', 'Room', 'Service', 'MOZO'),
];

function buildMockMesa(id: ID, nombre: string, capacidad: number, estadoLabel: 'libre' | 'ocupada' | 'sucia', habitacionVinculada?: string): Mesa {
  return {
    id,
    nombre,
    puntoVentaId: pvRestaurante.id,
    puntoVenta: pvRestaurante,
    capacidadPersonas: capacidad,
    esCombinable: false,
    esTransferible: true,
    estado: estadoMesaMap[estadoLabel],
    ...auditBase,
  };
}

function buildMockComanda(params: {
  id: ID;
  numero: number;
  mesaId: ID;
  habitacionCodigo?: string;
  mozo: Usuario;
  estado: EstadoComandaReal;
  itemsCantidad: number;
  total: number;
}): Comanda {
  const tipoConsumo: TipoConsumoComanda = params.habitacionCodigo ? 'ROOM_SERVICE' : 'MESA_RESTAURANTE';
  return {
    id: params.id,
    numeroCorrelativo: params.numero,
    prefijoCorrelativo: pvRestaurante.prefijoComanda,
    puntoVentaId: pvRestaurante.id,
    puntoVenta: pvRestaurante,
    tipoConsumo,
    habitacionNombreString: params.habitacionCodigo,
    mesaId: params.mesaId,
    cantidadPersonas: 2,
    mozoAsignadoId: params.mozo.id,
    mozoAsignadoNombre: `${params.mozo.nombres} ${params.mozo.apellidos}`,
    fechaApertura: isoNow,
    estado: params.estado,
    prioridad: tipoConsumo === 'ROOM_SERVICE' ? 'ROOM_SERVICE_RAPIDO' : 'NORMAL',
    moneda: 'PEN' as Moneda,
    subtotalProductos: Math.round(params.total / 1.18),
    impuestos: params.total - Math.round(params.total / 1.18),
    descuentosTotal: 0,
    totalComanda: params.total,
    saldoPendientePago: params.estado === 'CERRADA_COBRADA' || params.estado === 'CARGADA_A_FOLIO' ? 0 : params.total,
    cargadaTotalmenteAFolio: params.estado === 'CARGADA_A_FOLIO',
    items: [],
    historialEstados: [
      {
        id: `he-${params.id}-1`,
        fecha: isoNow,
        estadoNuevo: params.estado,
      },
    ],
    pagos: [],
    usuarioAperturaId: params.mozo.id,
    anulada: false,
    ...auditBase,
  };
}

type EstadoMesaLabel = 'libre' | 'ocupada' | 'sucia';
type EstadoComandaLabel = 'abierta' | 'cocina' | 'lista' | 'cerrada';

interface PosVistaMesaRow {
  id: ID;
  nombre: string;
  capacidad: number;
  estado: EstadoMesaLabel;
  habitacionVinculada?: string;
  comanda?: {
    id: ID;
    numero: number;
    estado: EstadoComandaLabel;
    itemsCantidad: number;
    mozo: Usuario;
    total: number;
  };
}

const rawMesas: PosVistaMesaRow[] = [
  {
    id: 'm1',
    nombre: 'Mesa 1',
    capacidad: 4,
    estado: 'ocupada',
    comanda: { id: 'com-901', numero: 901, estado: 'cocina', itemsCantidad: 6, mozo: mockUsuariosMozos[0], total: 125.5 },
  },
  {
    id: 'm2',
    nombre: 'Mesa 2',
    capacidad: 2,
    estado: 'ocupada',
    comanda: { id: 'com-902', numero: 902, estado: 'lista', itemsCantidad: 3, mozo: mockUsuariosMozos[1], total: 62 },
  },
  { id: 'm3', nombre: 'Mesa 3', capacidad: 6, estado: 'libre' },
  { id: 'm4', nombre: 'Mesa 4', capacidad: 4, estado: 'sucia' },
  {
    id: 'm5',
    nombre: 'Mesa 5',
    capacidad: 2,
    estado: 'ocupada',
    comanda: { id: 'com-903', numero: 903, estado: 'abierta', itemsCantidad: 2, mozo: mockUsuariosMozos[0], total: 48 },
  },
  {
    id: 'm6',
    nombre: 'Terraza 1',
    capacidad: 4,
    estado: 'ocupada',
    comanda: { id: 'com-904', numero: 904, estado: 'cerrada', itemsCantidad: 4, mozo: mockUsuariosMozos[1], total: 98 },
  },
  {
    id: 'h101',
    nombre: 'Hab. 101',
    capacidad: 2,
    estado: 'ocupada',
    habitacionVinculada: 'CAB-01',
    comanda: { id: 'com-910', numero: 910, estado: 'cocina', itemsCantidad: 5, mozo: mockUsuariosMozos[2], total: 110 },
  },
  {
    id: 'h103',
    nombre: 'Hab. 103',
    capacidad: 4,
    estado: 'ocupada',
    habitacionVinculada: 'FAM-03',
    comanda: { id: 'com-915', numero: 915, estado: 'abierta', itemsCantidad: 8, mozo: mockUsuariosMozos[2], total: 240 },
  },
];

const mockMesas: Mesa[] = rawMesas.map((r) => buildMockMesa(r.id, r.nombre, r.capacidad, r.estado, r.habitacionVinculada));
const mockComandasDict: Record<string, Comanda> = Object.fromEntries(
  rawMesas
    .filter((r) => !!r.comanda)
    .map((r) => [
      r.comanda!.id,
      buildMockComanda({
        id: r.comanda!.id,
        numero: r.comanda!.numero,
        mesaId: r.id,
        habitacionCodigo: r.habitacionVinculada,
        mozo: r.comanda!.mozo,
        estado: {
          abierta: 'ABIERTA',
          cocina: 'EN_COCINA_BAR',
          lista: 'LISTA_PARA_ENTREGAR',
          cerrada: 'CERRADA_COBRADA',
        }[r.comanda!.estado],
        itemsCantidad: r.comanda!.itemsCantidad,
        total: r.comanda!.total,
      }),
    ]),
);
void mockMesas;
void mockComandasDict;

const mesaColor: Record<EstadoMesaLabel, Color> = {
  libre: 'success',
  ocupada: 'danger',
  sucia: 'warning',
};

interface ComandaBadgeCfg {
  color: Color;
  label: string;
  icon: Icon;
}

const comandaBadge: Record<EstadoComandaLabel, ComandaBadgeCfg> = {
  abierta: { color: 'warning', label: 'ABIERTA', icon: timeOutline },
  cocina: { color: 'tertiary', label: 'EN COCINA', icon: alert },
  lista: { color: 'success', label: 'LISTA', icon: checkmarkCircle },
  cerrada: { color: 'medium', label: 'CERRADA', icon: checkmarkCircle },
};

const PosPage: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>POS · Comida y Bebida</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">POS F&amp;B</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="pos-legend">
          <IonChip color="success">Libre</IonChip>
          <IonChip color="danger">Ocupada</IonChip>
          <IonChip color="warning">En limpieza</IonChip>
          <IonChip color="tertiary">En cocina</IonChip>
          <IonChip color="success">Lista</IonChip>
        </div>

        <IonGrid className="table-grid ion-margin-top">
          <IonRow>
            {rawMesas.map((m) => (
              <IonCol key={m.id} size="12" size-sm="6" size-md="4" size-lg="4" size-xl="3">
                <IonCard button className={`pos-mesa pos-${m.estado}`}>
                  <IonCardHeader>
                    <div className="pos-row">
                      <IonCardTitle>{m.nombre}</IonCardTitle>
                      <IonBadge color={mesaColor[m.estado]}>{m.estado.toUpperCase()}</IonBadge>
                    </div>
                    <IonCardSubtitle>Capacidad: {m.capacidad} pax</IonCardSubtitle>
                    {m.habitacionVinculada ? (
                      <IonLabel className="hab-ref">Vinculada a habitación: {m.habitacionVinculada}</IonLabel>
                    ) : null}
                  </IonCardHeader>
                  <IonCardContent>
                    {m.comanda ? (
                      <>
                        <div className="comanda-row">
                          <span>
                            <strong>#{m.comanda.numero}</strong> — {comandaBadge[m.comanda.estado].label}
                          </span>
                          <IonBadge color={comandaBadge[m.comanda.estado].color}>
                            {comandaBadge[m.comanda.estado].label}
                          </IonBadge>
                        </div>
                        <p className="ion-no-margin">
                          {m.comanda.itemsCantidad} platos · Mozo: {m.comanda.mozo.nombres} {m.comanda.mozo.apellidos}
                        </p>
                        <p className="ion-no-margin total">
                          Total: <strong>S/ {m.comanda.total.toFixed(2)}</strong>
                        </p>
                      </>
                    ) : (
                      <p className="sin-comanda">Sin comanda activa</p>
                    )}
                  </IonCardContent>
                </IonCard>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default PosPage;
