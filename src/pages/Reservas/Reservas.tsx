import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonBadge, IonFab, IonFabButton, IonIcon, useIonRouter, useIonViewWillEnter, IonButton, IonButtons, IonRefresher, IonRefresherContent } from '@ionic/react';
import { addCircle, logIn, create, refresh } from 'ionicons/icons';
import type { Color } from '@ionic/core';
import {
  Reserva,
  EstadoReserva,
  OrigenReserva,
} from '../../types';
import { ReservaService, FolioService, HabitacionService, pendingSync } from '../../services';
import { supabase } from '../../services/__supabase_db__';
import CheckinModal from '../../components/modals/CheckinModal';
import './Reservas.css';

const USUARIO_ACTUAL = { id: 'USR-MOISES-0001', nombres: 'Moisés', apellidos: 'Ochoa' };
const EVENTO_REFRESCAR = 'lodge:refrescarAhora' as const;

// Helper anti-parpadeo: JSON.stringify determinista (ordena keys)
const stableStringify = (obj: any): string => {
  try {
    if (obj == null) return String(obj);
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) {
      return '[' + obj.map((v) => stableStringify(v)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const k of keys) {
      parts.push(JSON.stringify(k) + ':' + stableStringify((obj as any)[k]));
    }
    return '{' + parts.join(',') + '}';
  } catch {
    try { return JSON.stringify(obj); } catch { return String(obj); }
  }
};

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
  const refreshingRef = useRef(false);
  const snapshotReservas = useRef<string>('');

  const cargarReservas = () => {
    try {
      const todas = ReservaService.listarTodas ? ReservaService.listarTodas() : [];
      const ordenadas = [...todas].sort((a: any, b: any) => {
        const fa = new Date(a.fechaCreacion || a.createdAt || 0).getTime();
        const fb = new Date(b.fechaCreacion || b.createdAt || 0).getTime();
        return fb - fa;
      });
      const snap = stableStringify(ordenadas);
      if (snap !== snapshotReservas.current) {
        snapshotReservas.current = snap;
        setReservas(ordenadas as any);
      }
    } catch {
      if (snapshotReservas.current !== '[]') {
        snapshotReservas.current = '[]';
        setReservas([]);
      }
    }
  };

  const refrescarFuerza = useCallback(async (postFlush = false) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      try {
        await Promise.all([
          (ReservaService as any).hidratarDesdeSupabase?.(true),
          (HabitacionService as any).hidratarDesdeSupabase?.(true),
          (FolioService as any).hidratarDesdeSupabase?.(true),
        ]);
      } catch (_) {}
      try { pendingSync.applyPendingLocal?.(); } catch (_) {}
      cargarReservas();
    } finally {
      refreshingRef.current = false;
      if (postFlush) {
        try { await pendingSync.processQueue?.(false); } catch (_) {}
        cargarReservas();
      }
    }
  }, []);

  useIonViewWillEnter(() => { refrescarFuerza(); });

  // Listener evento global 'lodge:refrescarAhora' (boton 🔄 / pre-accion / pull-refresh otros)
  useEffect(() => {
    const handler = (e: any) => {
      const quien = (e as any)?.detail?.page;
      if (!quien || quien === 'RESERVAS' || quien === 'TODAS') refrescarFuerza();
    };
    window.addEventListener(EVENTO_REFRESCAR, handler as any);
    return () => window.removeEventListener(EVENTO_REFRESCAR, handler as any);
  }, [refrescarFuerza]);

  // Realtime Channels debounce 500ms (sin guard clause) — SOLO actualiza si hay cambios
  useEffect(() => {
    let alive = true;
    let debounceId: any;
    const TABLAS = ['reservas', 'huespedes', 'habitaciones', 'folios', 'cargos_folio', 'pagos_folio'];

    const recargarDebounced = () => {
      if (!alive) return;
      clearTimeout(debounceId);
      debounceId = setTimeout(async () => {
        if (!alive) return;
        try { await Promise.all([ (ReservaService as any).hidratarDesdeSupabase?.(true) ]); } catch (_) {}
        try { pendingSync.applyPendingLocal?.(); } catch (_) {}
        try { cargarReservas(); } catch (_) {}
      }, 500);
    };

    const canales: any[] = [];
    try {
      const sb = (supabase as any)?.channel ? (supabase as any) : null;
      if (sb) {
        for (const t of TABLAS) {
          try {
            const ch = sb.channel(`rt-res-${t}-${Math.random().toString(36).slice(2,7)}`)
              .on('postgres_changes', { event: '*' as any, schema: 'public', table: t }, recargarDebounced)
              .subscribe();
            canales.push(ch);
          } catch (_) {}
        }
      }
    } catch (_) {}

    return () => {
      alive = false;
      clearTimeout(debounceId);
      try {
        const sb = (supabase as any);
        Promise.all(canales.map(c => sb?.removeChannel?.(c))).catch(()=>{});
      } catch (_) {}
    };
  }, [refrescarFuerza]);

  // Pull-refresh handler (IonRefresher)
  const onPullRefresh = async (event: any) => {
    try {
      await refrescarFuerza(true);
    } finally {
      try { event?.detail?.complete?.(); } catch (_) {}
    }
  };

  // Pre-refresh ANTES de abrir Checkin modal (hidrata esa reserva + hab específica)
  const abrirCheckin = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      // 1) Refresco general
      await refrescarFuerza();
      // 2) Re-hidrato específico ReservaService por id (force=true) - mejor 2 capas
      try {
        await Promise.all([
          (ReservaService as any).hidratarDesdeSupabase?.(true),
          (HabitacionService as any).hidratarDesdeSupabase?.(true),
          (FolioService as any).hidratarDesdeSupabase?.(true),
        ]);
        await pendingSync.applyPendingLocal?.();
      } catch (_) {}
    } finally {
      setReservaIdParaCheckin(id);
      setModalCheckinOpen(true);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Reservas</IonTitle>
          <IonButtons slot="end">
            <IonButton
              size="small"
              color="light"
              onClick={() => {
                try { window.dispatchEvent(new CustomEvent(EVENTO_REFRESCAR, { detail: { page:'RESERVAS' }})); } catch(_){}
              }}
            >
              <IonIcon icon={refresh} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onPullRefresh}>
          <IonRefresherContent
            pullingIcon={refresh as any}
            pullingText="Desliza para actualizar reservas"
            refreshingSpinner="crescent"
            refreshingText="Actualizando..."
          />
        </IonRefresher>
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
