import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonBadge, IonFab, IonFabButton, IonIcon, useIonRouter, useIonViewWillEnter, IonButton, IonButtons, IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton, IonAlert } from '@ionic/react';
import { addCircle, logIn, create, refresh } from 'ionicons/icons';
import type { Color } from '@ionic/core';
import {
  Reserva,
  EstadoReserva,
  OrigenReserva,
} from '../../types';
import { ReservaService, FolioService, HabitacionService, pendingSync, seedUtil } from '../../services';
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
  const [vistaReservas, setVistaReservas] = useState<'ACTIVAS' | 'HISTORICO'>('ACTIVAS');
  const [alertCheckinOpen, setAlertCheckinOpen] = useState(false);
  const [alertCheckinMsg, setAlertCheckinMsg] = useState<{ header: string; subHeader?: string; message?: string }>({ header: '' });
  const refreshingRef = useRef(false);
  const snapshotReservas = useRef<string>('');
  // Refs estables: setState vía refs para NO recrear refrescarFuerza
  const setReservasRef = useRef<typeof setReservas>(() => {});
  setReservasRef.current = setReservas;

  // ===== NORMALIZADOR estado RESERVA (mismo patrón helper overlap) =====
  // Convierte variantes: "Check-in" / "check_in" / "Check In" / "CHECK-IN" → CHECKIN
  // "Check out" / "Checked_Out" / "CHECKED-OUT" → CHECKEDOUT
  // "No Show" / "NO-SHOW" → NOSHOW
  const _normEst = (est: any): string =>
    String(est || 'PENDIENTE')
      .toUpperCase()
      .replace(/[\s_-]+/g, '');

  // ESTADOS = RESERVA "ACTIVA" (no debe desaparecer del tab principal)
  // Claves NORMALIZADAS.
  const ESTADOS_ACTIVOS_NORM = new Set([
    'PENDIENTE','CONFIRMADA','ENESPERA','MODIFICADA',
    'CHECKIN','CHECKEDIN','CHECKOUT',
  ]);

  // ESTADOS = HISTÓRICO (solo tab Histórico). Claves NORMALIZADAS.
  // Todo lo que NO está en ACTIVOS se muestra en Histórico (por defecto). Este set se usa solo para depurar.
  const ESTADOS_HISTORICO_NORM = new Set([
    'CHECKEDOUT','CANCELADA','CANCELADO','NOSHOW',
  ]);

  const reservasVisibles = useMemo(() => {
    try {
      const todos = Array.isArray(reservas) ? reservas : [];
      const filtrados = vistaReservas === 'ACTIVAS'
        ? todos.filter((r: any) => {
            const n = _normEst(r?.estado);
            // Si está en activos → OK. Si está en históricos claros → NO.
            if (ESTADOS_ACTIVOS_NORM.has(n)) return true;
            if (ESTADOS_HISTORICO_NORM.has(n)) return false;
            // Estado desconocido: MANTENER EN ACTIVAS para no perder de vista.
            return true;
          })
        : todos.filter((r: any) => {
            const n = _normEst(r?.estado);
            if (ESTADOS_HISTORICO_NORM.has(n)) return true;
            if (ESTADOS_ACTIVOS_NORM.has(n)) return false;
            // Estado desconocido → NO se manda a Histórico; para Histórico SOLO los claramente terminados.
            return false;
          });
      return filtrados.sort((a: any, b: any) => {
        const fa = new Date(a.fechaCreacion || a.createdAt || 0).getTime();
        const fb = new Date(b.fechaCreacion || b.createdAt || 0).getTime();
        return fb - fa;
      });
    } catch { return [] as Reserva[]; }
  }, [reservas, vistaReservas]);

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
        setReservasRef.current(ordenadas as any);
      }
    } catch {
      if (snapshotReservas.current !== '[]') {
        snapshotReservas.current = '[]';
        setReservasRef.current([]);
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
  const refrescarFuerzaRef = useRef(refrescarFuerza);
  refrescarFuerzaRef.current = refrescarFuerza;

  useIonViewWillEnter(() => { refrescarFuerzaRef.current(); });

  // Listener evento global 'lodge:refrescarAhora' — deps = [] estable
  useEffect(() => {
    const handler = (e: any) => {
      const quien = (e as any)?.detail?.page;
      if (!quien || quien === 'RESERVAS' || quien === 'TODAS') refrescarFuerzaRef.current();
    };
    window.addEventListener(EVENTO_REFRESCAR, handler as any);
    return () => window.removeEventListener(EVENTO_REFRESCAR, handler as any);
  }, []);

  // Realtime Channels debounce 500ms (sin guard clause) — deps = [] estable (NO SE RE-MONTA)
  useEffect(() => {
    let alive = true;
    let debounceId: any;
    const TABLAS = ['reservas', 'huespedes', 'habitaciones', 'folios', 'cargos_folio', 'pagos_folio'];
    const recargarDebounced = () => {
      if (!alive) return;
      clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        if (!alive) return;
        refrescarFuerzaRef.current(false);
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
  }, []);

  // Pull-refresh handler (IonRefresher)
  const onPullRefresh = async (event: any) => {
    try {
      await refrescarFuerza(true);
    } finally {
      try { event?.detail?.complete?.(); } catch (_) {}
    }
  };

  // Pre-refresh ANTES de abrir Checkin modal + BLOQUEO PREVIO RC10 (fecha/ocupación HOY)
  const abrirCheckin = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();

    const hoy = new Date().toISOString().slice(0, 10);
    const r = ReservaService.buscarPorId(id);
    if (!r) return;

    const ci = String(r.fechaCheckin || r.fechaCheckIn || '').slice(0, 10);
    const co = String(r.fechaCheckout || r.fechaCheckOut || '').slice(0, 10);
    const codR = r.codigoReserva || r.codigo || String(r.id || '').slice(0, 9);

    // RC10 VALIDACIÓN 1: HOY debe estar DENTRO del rango [checkin, checkout)
    if (hoy < ci) {
      const msAntes = Math.max(0, new Date(ci).getTime() - new Date(hoy).getTime());
      const diasAntes = Math.max(1, Math.round(msAntes / 86400000));
      setAlertCheckinMsg({
        header: '⛔ Check-in ANTICIPADO NO permitido',
        subHeader: `Reserva ${codR} empieza el ${ci}`,
        message: `Hoy es ${hoy}. Faltan ${diasAntes} día(s) para el inicio de la reserva.\n\nEl check-in SÓLO se permite el mismo día de ingreso o posterior (dentro del rango de la reserva).\nNO se puede reemplazar a un huésped que todavía está ocupando la habitación.`,
      });
      setAlertCheckinOpen(true);
      return;
    }
    if (hoy >= co) {
      setAlertCheckinMsg({
        header: '⛔ Reserva ya FINALIZÓ',
        subHeader: `Checkout de ${codR} fue el ${co}`,
        message: `Hoy es ${hoy}. Esta reserva ya terminó.\nNo se puede hacer check-in de una reserva cerrada.`,
      });
      setAlertCheckinOpen(true);
      return;
    }

    // RC10 VALIDACIÓN 2: Habitación NO OCUPADA HOY por otra reserva ACTIVA
    const habsIds = (r.habitaciones || []).map((rh: any) => String(rh.habitacionId || ''));
    for (const habId of habsIds) {
      if (!habId) continue;
      const hab = HabitacionService.buscarPorId(habId);

      const conflictos = ReservaService.listarPorHabitacionYFechas?.({
        habitacionId: habId,
        checkinISO: hoy,
        checkoutISO: seedUtil?.addDaysISO ? seedUtil.addDaysISO(hoy, 1) : hoy,
        excluirReservaId: r.id,
      }) || [];

      if (conflictos.length > 0) {
        const cods = conflictos
          .map((cf: any) => {
            const cod = cf.codigoReserva || cf.codigo || String(cf.id || '').slice(0, 9);
            const est = String(cf.estado || 'PENDIENTE').toUpperCase();
            const cfCi = String(cf.fechaCheckin || '').slice(0, 10);
            const cfCo = String(cf.fechaCheckout || '').slice(0, 10);
            return `· #${cod}  [${est}]  ${cfCi} → ${cfCo}`;
          })
          .join('\n');
        setAlertCheckinMsg({
          header: '⛔ HABITACIÓN OCUPADA HOY',
          subHeader: `${hab?.codigo || hab?.nombre || habId} — estado = ${hab?.estado || '?'}`,
          message: `La habitación está ocupada HOY (${hoy}) por otra(s) reserva(s) activa(s) que todavía NO han hecho check-out:\n\n${cods}\n\nSOLUCIÓN:\n1) Primero haga el CHECK-OUT de la reserva actual que ocupa la habitación.\n2) La habitación se marcará como LIMPIEZA → luego LIBRE.\n3) RECIÉN podrá hacer el check-in de ESTA reserva (${codR}).\n\n⚠️ NUNCA se permite reemplazar una reserva VIGENTE por otra.`,
        });
        setAlertCheckinOpen(true);
        return;
      }

      // 2b) Si la habitación está marcada OCUPADA pero no encontramos reserva → alerta
      if (hab && hab.estado === 'OCUPADA') {
        setAlertCheckinMsg({
          header: '⛔ Habitación MARCADA COMO OCUPADA',
          subHeader: `${hab.codigo || hab.nombre || habId} — OCUPADA`,
          message: `La habitación está marcada como OCUPADA pero no se encontró una reserva activa para hoy. Puede deberse a un check-out no registrado.\n\nAntes de hacer check-in la habitación debe estar LIBRE o LIMPIEZA.`,
        });
        setAlertCheckinOpen(true);
        return;
      }
    }

    // ✅ TODAS LAS VALIDACIONES PASARON — abrir modal
    try {
      await refrescarFuerza();
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

        <div style={{ padding: '10px 14px 0 14px' }}>
          <IonSegment value={vistaReservas} onIonChange={(e) => { const v = (e.detail.value as any) || 'ACTIVAS'; setVistaReservas(v); }}>
            <IonSegmentButton value="ACTIVAS">
              <IonLabel>🟢 Activas del día</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="HISTORICO">
              <IonLabel>📚 Histórico (Check-out / Canceladas)</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </div>

        <IonList inset>
          {reservasVisibles.map((r: any) => {
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
          {reservasVisibles.length === 0 && (
            <IonItem lines="none">
              <IonLabel style={{ textAlign: 'center', padding: '24px 0' }}>
                {vistaReservas === 'ACTIVAS'
                  ? 'No hay reservas activas hoy. Toca el botón [+] para crear una, o revisa "Histórico" para ver Check-out y canceladas.'
                  : 'Todavía no hay reservas cerradas en Histórico.'}
              </IonLabel>
            </IonItem>
          )}
        </IonList>

        <IonFab slot="fixed" vertical="bottom" horizontal="end" style={{ marginBottom: 90, marginRight: 10 }}>
          <IonFabButton color="primary" onClick={() => router.push('/nueva-reserva', 'root', 'replace')}>
            <IonIcon icon={addCircle} />
          </IonFabButton>
        </IonFab>

        <IonAlert
          isOpen={alertCheckinOpen}
          header={alertCheckinMsg.header}
          subHeader={alertCheckinMsg.subHeader}
          message={alertCheckinMsg.message}
          buttons={['Entendido']}
          onDidDismiss={() => setAlertCheckinOpen(false)}
        />

        <CheckinModal
          isOpen={modalCheckinOpen}
          onDidDismiss={() => {
            setModalCheckinOpen(false);
            setReservaIdParaCheckin(null);
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
