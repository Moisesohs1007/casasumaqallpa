import React, { useState } from 'react';
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
  IonFab, IonFabButton, IonFabList, IonIcon,
  IonSkeletonText,
  useIonViewWillEnter,
} from '@ionic/react';
import type { Color } from '@ionic/core';
import { checkmarkCircle, alert, timeOutline, add, fastFood } from 'ionicons/icons';
import TomarComanda from '../../components/modals/TomarComanda';
import {
  Mesa,
  Comanda,
} from '../../types';
import { MesaService, ComandaService } from '../../services';
import './Pos.css';

type EstadoMesaLabel = 'libre' | 'ocupada' | 'sucia';
type EstadoComandaLabel = 'abierta' | 'cocina' | 'lista' | 'cerrada';

interface PosVistaMesaRow {
  id: string;
  nombre: string;
  capacidad: number;
  estado: EstadoMesaLabel;
  habitacionVinculada?: string;
  comanda?: {
    id: string;
    numero: number;
    estado: EstadoComandaLabel;
    itemsCantidad: number;
    mozoNombre: string;
    total: number;
  };
}

const mesaColor: Record<EstadoMesaLabel, Color> = {
  libre: 'success',
  ocupada: 'danger',
  sucia: 'warning',
};

interface ComandaBadgeCfg {
  color: Color;
  label: string;
}

const comandaBadge: Record<EstadoComandaLabel, ComandaBadgeCfg> = {
  abierta: { color: 'warning', label: 'ABIERTA' },
  cocina: { color: 'tertiary', label: 'EN COCINA' },
  lista: { color: 'success', label: 'LISTA' },
  cerrada: { color: 'medium', label: 'CERRADA' },
};

const estadoMesaToLabel = (e: any): EstadoMesaLabel => {
  const s = String(e || '').toUpperCase();
  if (s === 'OCUPADA' || s === 'EN_USO') return 'ocupada';
  if (s === 'SUCIA' || s === 'EN_LIMPIEZA' || s === 'LIMPIEZA') return 'sucia';
  return 'libre';
};

const estadoComandaToLabel = (e: any): EstadoComandaLabel => {
  const s = String(e || '').toUpperCase();
  if (s.includes('COCINA') || s === 'EN_PREPARACION') return 'cocina';
  if (s.includes('LISTA') || s.includes('ENTREGAR') || s.includes('ENTREGADA')) return 'lista';
  if (s.includes('CERRADA') || s.includes('COBRADA') || s.includes('CARGADA')) return 'cerrada';
  return 'abierta';
};

const PosPage: React.FC = () => {
  const [tomarComandaOpen, setTomarComandaOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vistaMesas, setVistaMesas] = useState<PosVistaMesaRow[]>([]);
  const [preMesaId, setPreMesaId] = useState<string | undefined>(undefined);
  const [preHabitacionId, setPreHabitacionId] = useState<string | undefined>(undefined);
  const [preTipoConsumo, setPreTipoConsumo] = useState<'MESA' | 'CARGO_A_HABITACION' | undefined>(undefined);
  const [comandaAEditarId, setComandaAEditarId] = useState<string | undefined>(undefined);

  const openParaMesa = (m: PosVistaMesaRow) => {
    setPreMesaId(m.id);
    setPreHabitacionId(undefined);
    setPreTipoConsumo('MESA');
    setComandaAEditarId(m.comanda?.id);
    setTomarComandaOpen(true);
  };
  const openNuevoRoomService = () => {
    setPreMesaId(undefined);
    setPreHabitacionId(undefined);
    setPreTipoConsumo('MESA');
    setComandaAEditarId(undefined);
    setTomarComandaOpen(true);
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const [mesas, comandas] = await Promise.all([
        MesaService.listarTodas(),
        ComandaService.listarTodas({ estado: 'ABIERTA' as any }),
      ]);
      const comandasAbiertas = comandas.filter((c) => c.estado !== 'CERRADA_COBRADA');
      const comandasPorMesa = new Map<string, Comanda>();
      for (const c of comandasAbiertas) {
        const key = (c as any).mesaId;
        if (key && !comandasPorMesa.has(key)) comandasPorMesa.set(key, c);
      }
      const rows: PosVistaMesaRow[] = mesas.map((m: Mesa) => {
        const nombre = (m as any).nombreVisible || (m as any).nombre || (m as any).codigo || `Mesa ${m.id.slice(-3)}`;
        const capacidad = (m as any).capacidadMaxPax || (m as any).capacidadPersonas || (m as any).capacidad || 4;
        const est = estadoMesaToLabel((m as any).estado);
        const habitacionVinculada = (m as any).habitacionAsignadaId || (m as any).habitacionVinculada || undefined;
        let comanda: PosVistaMesaRow['comanda'] | undefined;
        const c = comandasPorMesa.get(m.id);
        if (c) {
          const detalles = (c as any).detalles || [];
          const numStr = String(c.numeroCorrelativo || (c as any).numero || '');
          const num = parseInt(numStr.replace(/\D/g, ''), 10) || 1000;
          comanda = {
            id: c.id,
            numero: num,
            estado: estadoComandaToLabel(c.estado),
            itemsCantidad: detalles.length || Math.round(((c as any).totalComanda || (c as any).total || 0) / 20),
            mozoNombre: (c as any).mozoAsignadoNombre || (c as any).usuarioIdMozoApertura || 'Mozo',
            total: Number((c as any).totalComanda || (c as any).total || 0),
          };
          if (comanda.itemsCantidad === 0 && comanda.total > 0) comanda.itemsCantidad = 1;
        } else if (est === 'ocupada' && (m as any).zona !== 'ROOM_SERVICE') {
          // Keep as ocupada but with no comanda yet
        }
        return { id: m.id, nombre, capacidad, estado: est, habitacionVinculada, comanda };
      });
      if (rows.length === 0) {
        setVistaMesas([]);
      } else {
        setVistaMesas(rows);
      }
    } catch (e) {
      console.warn('[POS] Error cargando data:', e);
      setVistaMesas([]);
    } finally {
      setLoading(false);
    }
  };

  useIonViewWillEnter(() => {
    cargar();
  });

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
            {loading &&
              [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <IonCol key={i} size="12" size-sm="6" size-md="4" size-lg="4" size-xl="3">
                  <IonCard>
                    <IonCardHeader>
                      <IonSkeletonText animated style={{ width: '40%' }} />
                      <IonCardSubtitle><IonSkeletonText animated style={{ width: '70%' }} /></IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonSkeletonText animated style={{ width: '90%' }} />
                      <p><IonSkeletonText animated style={{ width: '70%' }} /></p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              ))}
            {!loading && vistaMesas.length === 0 && (
              <IonCol size="12">
                <IonCard>
                  <IonCardContent style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
                    <strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                      Restaurante operando solo en modo Room Service
                    </strong>
                    <p style={{ margin: '4px 0', color: 'var(--ion-color-medium)' }}>
                      No hay mesas físicas de salón habilitadas.
                    </p>
                    <p style={{ margin: '8px 0 0', fontWeight: 500 }}>
                      Para agregar un consumo:
                    </p>
                    <ol style={{ textAlign: 'left', display: 'inline-block', margin: '8px auto 0', paddingLeft: 22, color: 'var(--ion-color-medium-shade)' }}>
                      <li>Ir a la pantalla <strong>Habitaciones</strong></li>
                      <li>Hacer clic en una habitación <strong>OCUPADA</strong></li>
                      <li>Elegir la opción <strong>Agregar Consumo / Room Service</strong></li>
                    </ol>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            )}
            {!loading && vistaMesas.map((m) => (
              <IonCol key={m.id} size="12" size-sm="6" size-md="4" size-lg="4" size-xl="3">
                <IonCard button className={`pos-mesa pos-${m.estado}`} onClick={() => openParaMesa(m)}>
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
                          {m.comanda.itemsCantidad} platos · Mozo: {m.comanda.mozoNombre}
                        </p>
                        <p className="ion-no-margin total">
                          Total: <strong>S/ {Number(m.comanda.total || 0).toFixed(2)}</strong>
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

        <button
          onClick={openNuevoRoomService}
          title="🧾 Nueva comanda / Room Service"
          style={{
            position: 'fixed',
            right: 24,
            bottom: 90,
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: '#2dd36f',
            color: '#fff',
            fontSize: 26,
            fontWeight: 900,
            border: 'none',
            boxShadow: '0 8px 20px rgba(45,211,111,.35), 0 4px 12px rgba(0,0,0,.18)',
            cursor: 'pointer',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          +
        </button>

        <TomarComanda
          isOpen={tomarComandaOpen}
          onDismiss={() => {
            setTomarComandaOpen(false);
            setPreMesaId(undefined);
            setPreHabitacionId(undefined);
            setPreTipoConsumo(undefined);
            setComandaAEditarId(undefined);
            cargar();
          }}
          preMesaId={preMesaId}
          preHabitacionId={preHabitacionId}
          preTipoConsumo={preTipoConsumo}
          comandaAEditarId={comandaAEditarId}
        />
      </IonContent>
    </IonPage>
  );
};

export default PosPage;
