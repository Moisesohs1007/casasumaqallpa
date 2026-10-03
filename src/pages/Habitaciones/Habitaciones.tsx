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
  IonSkeletonText,
  IonAlert,
  useIonViewWillEnter,
  useIonActionSheet,
} from '@ionic/react';
import type { Color } from '@ionic/core';
import {
  Habitacion,
  EstadoHabitacion,
  TipoHabitacion,
} from '../../types';
import { HabitacionService, ReservaService } from '../../services';
import CheckinModal from '../../components/modals/CheckinModal';
import CheckoutModal from '../../components/modals/CheckoutModal';
import TomarComanda from '../../components/modals/TomarComanda';
import './Habitaciones.css';

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

const USUARIO_ACTUAL = { id: 'USR-MOISES-0001', nombres: 'Moisés', apellidos: 'Ochoa' };

const HabitacionesPage: React.FC = () => {
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [present] = useIonActionSheet();
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ header: string; sub?: string }>({ header: '', sub: '' });

  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinReservaId, setCheckinReservaId] = useState<string | null>(null);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutReservaId, setCheckoutReservaId] = useState<string>('');

  const [tomarComandaOpen, setTomarComandaOpen] = useState(false);
  const [habPedidoId, setHabPedidoId] = useState<string>('');

  const cargar = async () => {
    setLoading(true);
    try {
      const lista = await HabitacionService.listarTodas();
      setHabitaciones(lista);
    } catch {
      setHabitaciones([]);
    } finally {
      setLoading(false);
    }
  };

  useIonViewWillEnter(() => {
    cargar();
  });

  const mostrarAlerta = (header: string, sub?: string) => {
    setAlertMsg({ header, sub });
    setAlertOpen(true);
  };

  const buscarReservaActivaHab = async (habId: string): Promise<string | null> => {
    try {
      const rs = await (ReservaService as any).listarTodas?.() || [];
      for (const r of rs) {
        const e = String(r.estado || '').toUpperCase().replace(/[^A-Z]/g, '');
        if (!(e.includes('CHECKIN') || e.includes('CHECKEDIN') || e.includes('RESERVA') || e.includes('CONFIRMAD'))) continue;
        const habs: any[] = (r.habitaciones || []) as any[];
        const match = habs.some((x) => {
          const id = x.habitacionId || x.habitacion?.id;
          return id === habId;
        });
        if (match) return r.id;
      }
    } catch { /* noop */ }
    return null;
  };

  const marcarEstado = async (h: Habitacion, nuevo: EstadoHabitacion) => {
    try {
      if (typeof (HabitacionService as any).actualizar === 'function') {
        await (HabitacionService as any).actualizar(h.id, { estado: nuevo });
      } else if (typeof (HabitacionService as any).cambiarEstado === 'function') {
        await (HabitacionService as any).cambiarEstado(h.id, nuevo);
      }
      mostrarAlerta(`Habitación ${h.codigo}`, `Estado cambiado a ${nuevo}.`);
      await cargar();
    } catch (e: any) {
      mostrarAlerta('Error', e?.message || 'No se pudo actualizar el estado.');
    }
  };

  const onClickHab = async (h: Habitacion) => {
    const est = h.estado;
    const headerAccion = `${h.codigo} · ${estadoLabel[est]}`;
    const opciones: any[] = [];

    if (est === 'LIBRE' || est === 'INSPECCIONADA') {
      opciones.push({
        text: '🔑 Check-in (solo si la reserva está confirmada)',
        handler: async () => {
          const reservaId = await buscarReservaActivaHab(h.id);
          if (!reservaId) {
            mostrarAlerta('Sin reserva activa', `No se encontró una reserva para ${h.codigo}. Ve a Reservas y confirma una primero.`);
            return;
          }
          setCheckinReservaId(reservaId);
          setCheckinOpen(true);
        },
      });
      opciones.push({
        text: '🚧 Marcar en MANTENIMIENTO',
        handler: () => marcarEstado(h, 'MANTENIMIENTO'),
      });
    }

    if (est === 'OCUPADA') {
      opciones.push({
        text: '🍽️ Agregar consumo · Pedido Room Service',
        handler: () => {
          setHabPedidoId(h.id);
          setTomarComandaOpen(true);
        },
      });
      opciones.push({
        text: '💵 Check-out · Cobrar folio',
        handler: async () => {
          const reservaId = await buscarReservaActivaHab(h.id);
          if (!reservaId) {
            mostrarAlerta('Sin Check-in', `No se encontró reserva CHECKED_IN para ${h.codigo}.`);
            return;
          }
          setCheckoutReservaId(reservaId);
          setCheckoutOpen(true);
        },
      });
      opciones.push({
        text: '📄 Ver folio (próximamente)',
        handler: () => mostrarAlerta('Folio', 'Vista detallada de folio: próximo módulo.'),
      });
    }

    if (est === 'RESERVADA') {
      opciones.push({
        text: '🔑 Hacer Check-in ahora',
        handler: async () => {
          const reservaId = await buscarReservaActivaHab(h.id);
          if (!reservaId) {
            mostrarAlerta('Sin reserva', `No hay reserva asociada a ${h.codigo}.`);
            return;
          }
          setCheckinReservaId(reservaId);
          setCheckinOpen(true);
        },
      });
    }

    if (est === 'LIMPIEZA' || est === 'MANTENIMIENTO' || est === 'BLOQUEADA') {
      if (est !== 'LIBRE') {
        opciones.push({
          text: '✅ Marcar como LIBRE',
          handler: () => marcarEstado(h, 'LIBRE'),
        });
      }
    }

    opciones.push({
      text: 'Cancelar',
      role: 'cancel',
      data: { action: 'cancel' },
    });

    present({
      header: headerAccion,
      subHeader: 'Selecciona una acción',
      buttons: opciones,
      animated: true,
      backdropDismiss: true,
    });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Habitaciones ({habitaciones.length})</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonAlert
          isOpen={alertOpen}
          header={alertMsg.header}
          subHeader={alertMsg.sub}
          buttons={['OK']}
          onDidDismiss={() => setAlertOpen(false)}
        />

        <CheckinModal
          isOpen={checkinOpen}
          onDidDismiss={() => {
            setCheckinOpen(false);
            setCheckinReservaId(null);
            cargar();
          }}
          reservaId={checkinReservaId}
          usuarioActual={USUARIO_ACTUAL}
        />

        <CheckoutModal
          isOpen={checkoutOpen}
          onDismiss={() => {
            setCheckoutOpen(false);
            setCheckoutReservaId('');
            cargar();
          }}
          reservaId={checkoutReservaId}
        />

        <TomarComanda
          isOpen={tomarComandaOpen}
          onDismiss={() => {
            setTomarComandaOpen(false);
            setHabPedidoId('');
            cargar();
          }}
          preHabitacionId={habPedidoId || undefined}
          preTipoConsumo="CARGO_A_HABITACION"
        />

        <IonGrid className="table-grid hab-grid">
          <IonRow>
            {loading &&
              Array.from({ length: habitaciones.length || 12 }).map((_, i) => (
                <IonCol key={i} size="6" size-xs="6" size-sm="6" size-md="4" size-lg="3" size-xl="3">
                  <IonCard className="hab-card">
                    <IonCardHeader>
                      <IonSkeletonText animated style={{ width: '55%' }} />
                      <IonCardSubtitle><IonSkeletonText animated style={{ width: '85%' }} /></IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <p><IonSkeletonText animated style={{ width: '90%' }} /></p>
                      <p><IonSkeletonText animated style={{ width: '70%' }} /></p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              ))}
            {!loading && habitaciones.map((h) => {
              const tipo: any = h.tipoHabitacion;
              const capacidadTotal = (tipo?.capacidadAdultos ?? 0) + (tipo?.capacidadNinos ?? 0);
              const tarifaBase = tipo?.precioBaseNoche ?? 0;
              return (
                <IonCol key={h.id} size="6" size-xs="6" size-sm="6" size-md="4" size-lg="3" size-xl="3">
                  <IonCard button className={`hab-card hab-${h.estado.toLowerCase()}`} style={{ minHeight: '82px' }} onClick={() => onClickHab(h)}>
                    <IonCardHeader>
                      <div className="hab-row">
                        <IonCardTitle>{h.codigo}</IonCardTitle>
                        <IonBadge color={estadoColor[h.estado]}>{estadoLabel[h.estado]}</IonBadge>
                      </div>
                      <IonCardSubtitle>{tipo?.nombre ?? h.tipoHabitacionId}</IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <p>
                        Capacidad: <strong>{capacidadTotal} pax</strong>
                      </p>
                      <p>
                        Tarifa base: <strong>S/ {Number(tarifaBase || 0).toFixed(2)}</strong>
                      </p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              );
            })}
            {!loading && habitaciones.length === 0 && (
              <IonCol size="12">
                <IonCard>
                  <IonCardContent style={{ textAlign: 'center', padding: '24px 0' }}>
                    No hay habitaciones registradas en la base de datos.
                  </IonCardContent>
                </IonCard>
              </IonCol>
            )}
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default HabitacionesPage;
