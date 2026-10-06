import React, { useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonBadge, IonFab, IonFabButton, IonIcon, useIonRouter, useIonViewWillEnter, IonButton, IonButtons } from '@ionic/react';
import { addCircle, logIn, create } from 'ionicons/icons';
import type { Color } from '@ionic/core';
import {
  Reserva,
  EstadoReserva,
  OrigenReserva,
} from '../../types';
import { ReservaService } from '../../services';
import CheckinModal from '../../components/modals/CheckinModal';
import './Reservas.css';

const USUARIO_ACTUAL = { id: 'USR-MOISES-0001', nombres: 'Moisés', apellidos: 'Ochoa' };

const estadoColor: Record<EstadoReserva, Color> = {
  PENDIENTE: 'warning',
  CONFIRMADA: 'tertiary',
  CHECKIN: 'success',
  CHECKED_IN: 'success',
  CHECKOUT: 'medium',
  CHECKED_OUT: 'medium',
  CANCELADA: 'danger',
  NO_SHOW: 'danger',
  MODIFICADA: 'primary',
  EN_ESPERA: 'warning',
};

const estadoLabel: Record<EstadoReserva, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  CHECKIN: 'Check-in',
  CHECKED_IN: 'Check-in',
  CHECKOUT: 'Check-out',
  CHECKED_OUT: 'Check-out',
  CANCELADA: 'Cancelada',
  NO_SHOW: 'No show',
  MODIFICADA: 'Modificada',
  EN_ESPERA: 'En espera',
};

const ReservasPage: React.FC = () => {
  const router = useIonRouter();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [modalCheckinOpen, setModalCheckinOpen] = useState(false);
  const [reservaIdParaCheckin, setReservaIdParaCheckin] = useState<string | null>(null);

  const abrirCheckin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setReservaIdParaCheckin(id);
    setModalCheckinOpen(true);
  };

  useIonViewWillEnter(() => {
    try {
      const todas = ReservaService.listarTodas ? ReservaService.listarTodas() : [];
      const ordenadas = [...todas].sort((a: any, b: any) => {
        const fa = new Date(a.fechaCreacion || a.createdAt || 0).getTime();
        const fb = new Date(b.fechaCreacion || b.createdAt || 0).getTime();
        return fb - fa;
      });
      setReservas(ordenadas as any);
    } catch {
      setReservas([]);
    }
  });

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
          {reservas.map((r: any) => {
            const hab0 = (r.habitaciones || [])[0];
            const codHab = hab0?.habitacion?.codigo ?? hab0?.tipoHabitacionNombre ?? hab0?.habitacionId ?? '—';
            const titular = r.huesped
              ? `${r.huesped.nombres} ${r.huesped.apellidos}`
              : r.huespedTitular
                ? `${r.huespedTitular.nombres} ${r.huespedTitular.apellidos}`
                : `Titular #${r.huespedId || r.huespedTitularId || ''}`;
            const codigo = r.codigoReserva || r.codigo || 'R-???';
            const estado = (r.estado || 'PENDIENTE') as EstadoReserva;
            const noches = r.totalNoches || r.noches || 0;
            const origen = r.origen || '';
            const checkin = (r.fechaCheckin || r.fechaCheckIn || '').slice(0, 10);
            const checkout = (r.fechaCheckout || r.fechaCheckOut || '').slice(0, 10);
            const puedeCheckearse = ['PENDIENTE', 'CONFIRMADA', 'MODIFICADA'].includes(estado);
            return (
              <IonItem
                key={r.id || codigo}
                button
                detail
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/reservas/${r.id || codigo}`, 'forward');
                }}
              >
                <IonLabel>
                  <h2>
                    #{codigo} — {titular}
                  </h2>
                  <p>
                    {codHab} · {noches} noche{noches === 1 ? '' : 's'} · {origen}
                  </p>
                  <p className="ion-text-wrap">
                    Check-in: {checkin} · Check-out: {checkout}
                  </p>
                </IonLabel>
                <IonButtons slot="end">
                  {puedeCheckearse && (
                    <IonButton
                      color="success"
                      size="small"
                      fill="solid"
                      onClick={(e) => abrirCheckin(e, r.id)}
                    >
                      <IonIcon icon={logIn} slot="start" />
                      CHECK-IN
                    </IonButton>
                  )}
                  <IonBadge color={estadoColor[estado] || 'medium'} slot="end">
                    {(estadoLabel[estado] || estado).toUpperCase()}
                  </IonBadge>
                </IonButtons>
              </IonItem>
            );
          })}
          {reservas.length === 0 && (
            <IonItem lines="none">
              <IonLabel style={{ textAlign: 'center', padding: '24px 0' }}>
                No hay reservas todavía. Toca el botón [+] para crear la primera.
              </IonLabel>
            </IonItem>
          )}
        </IonList>

        <IonFab slot="fixed" vertical="bottom" horizontal="end" style={{ marginBottom: 90, marginRight: 10 }}>
          <IonFabButton color="primary" onClick={() => router.push('/nueva-reserva', 'root', 'replace')}>
            <IonIcon icon={addCircle} />
          </IonFabButton>
        </IonFab>

        <CheckinModal
          isOpen={modalCheckinOpen}
          onDidDismiss={() => {
            setModalCheckinOpen(false);
            setReservaIdParaCheckin(null);
            // Refrescar listado después de check-in
            try {
              const todas = ReservaService.listarTodas ? ReservaService.listarTodas() : [];
              const ordenadas = [...todas].sort((a: any, b: any) => {
                const fa = new Date(a.fechaCreacion || a.createdAt || 0).getTime();
                const fb = new Date(b.fechaCreacion || b.createdAt || 0).getTime();
                return fb - fa;
              });
              setReservas(ordenadas as any);
            } catch {}
          }}
          reservaId={reservaIdParaCheckin}
          usuarioActual={USUARIO_ACTUAL}
        />
      </IonContent>
    </IonPage>
  );
};

export default ReservasPage;
export { ReservasPage };
