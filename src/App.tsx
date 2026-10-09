import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  IonApp,
  IonBadge,
  IonButton,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonToast,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { cloud, cloudOffline, refreshCircle, home, calendar, bed, restaurant, person, alertCircle, checkmarkCircle } from 'ionicons/icons';
import { Redirect, Route, useHistory, useLocation } from 'react-router-dom';

import HomePage from './pages/Home/Home';
import ReservasPage from './pages/Reservas/Reservas';
import NuevaReservaPage from './pages/NuevaReserva/NuevaReserva';
import ReservaDetallePage from './pages/Reservas/ReservaDetalle';
import HabitacionesPage from './pages/Habitaciones/Habitaciones';
import PosPage from './pages/Pos/Pos';
import PerfilPage from './pages/Perfil/Perfil';
import FolioPage from './pages/Folio/Folio';
import { HabitacionService, ReservaService, TarifaService, PosService, HuespedService, FolioService, pendingSync, seedProductos } from './services';
import { dbRemota } from './services/__supabase_db__';

setupIonicReact({
  mode: 'md',
  animated: true,
});

const STORAGE_KEY = 'lodge_ultima_pestana_v1';
const RUTAS_TAB = ['/home', '/reservas', '/habitaciones', '/pos', '/perfil'];
const EVENTO_HIDRATACION = 'lodge:hidratacion-listo' as const;

type NetworkMode = 'ONLINE' | 'OFFLINE' | 'CHECKING';

// ====== Helper PING REAL a Supabase (3 capas + 3 retry + timeout 7s) ======
const PING_TIMEOUT_MS = 7000;
const PING_CACHE_MS = 5500;
const PING_RETRY = 3;
const SUPABASE_URL_FOR_PING =
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_SUPABASE_URL) ||
  'https://yuoftlckoctrkkfajaii.supabase.co';
const SUPABASE_ANON_FOR_PING =
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1b2Z0bGNrb2N0cmtrZmFqYWlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMzkwMzIsImV4cCI6MjEwNjYxNTAzMn0.6kXEWIKvumiTxcPXA9-C-JoVDi338RGKqkVXXythgoc';
let _pingCache: { ts: number; result: boolean } | null = null;
let _pingEnCurso: Promise<boolean> | null = null;

function timeoutPromise(ms: number, label: string) {
  return new Promise<never>((_, rj) => setTimeout(() => rj(new Error(label)), ms));
}

async function _pingSupabaseReal(): Promise<boolean> {
  const ahora = Date.now();
  if (_pingCache && (ahora - _pingCache.ts) < PING_CACHE_MS) return _pingCache.result;
  if (_pingEnCurso) return _pingEnCurso;

  _pingEnCurso = (async (): Promise<boolean> => {
    let ultimoOk = false;
    for (let intento = 1; intento <= PING_RETRY; intento++) {
      try {
        // CAPA 1: Supabase client si existe
        const client = dbRemota?.client;
        let ok = false;
        if (client && (client as any).from) {
          try {
            const req = (client as any).from('impuestos').select('id', { count: 'exact', head: true }).limit(1);
            const res = await Promise.race([req, timeoutPromise(PING_TIMEOUT_MS, `C1_T${intento}`)]);
            ok = !(res?.error);
          } catch { ok = false; }
        }
        // CAPA 2: Fallback fetch() directo a REST API
        if (!ok && typeof fetch === 'function') {
          try {
            const req = fetch(
              `${SUPABASE_URL_FOR_PING}/rest/v1/impuestos?select=id&limit=1`,
              {
                method: 'GET',
                headers: {
                  apikey: SUPABASE_ANON_FOR_PING,
                  Authorization: `Bearer ${SUPABASE_ANON_FOR_PING}`,
                  Accept: 'application/json',
                  Range: '0-0',
                },
                credentials: 'omit' as RequestCredentials,
                cache: 'no-store',
              }
            );
            const res = await Promise.race([req, timeoutPromise(PING_TIMEOUT_MS, `C2_T${intento}`)]) as Response;
            ok = !!res && res.ok;
          } catch { ok = false; }
        }
        // CAPA 3: Optimista navigator.onLine + httpbin tiny HEAD
        if (!ok) {
          const navOnline = typeof navigator !== 'undefined' ? !!navigator.onLine : true;
          if (navOnline) {
            try {
              const tiny = await Promise.race([
                fetch('https://httpbin.org/get', { method: 'HEAD', cache: 'no-store', credentials: 'omit' }),
                timeoutPromise(1800, `C3_T${intento}`),
              ]) as any;
              ok = !!tiny && (!!tiny.ok || !!tiny.status || !!tiny.type);
            } catch { ok = navOnline; }
          } else {
            ok = false;
          }
        }
        ultimoOk = !!ok;
        if (ultimoOk) break;
        // Entre intentos esperamos 400ms
        if (intento < PING_RETRY) {
          await new Promise((r) => setTimeout(r, 400));
        }
      } catch {
        ultimoOk = false;
        if (intento < PING_RETRY) await new Promise((r) => setTimeout(r, 400));
      }
    }
    const navOnline = typeof navigator !== 'undefined' ? !!navigator.onLine : true;
    const finalOk = ultimoOk || navOnline; // Último optimista: si navegador dice online = online
    _pingCache = { ts: Date.now(), result: !!finalOk };
    return !!finalOk;
  })();
  return _pingEnCurso.finally(() => { _pingEnCurso = null; });
}
const dispatchHidratado = (grupo: string, ok: boolean) => {
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent(EVENTO_HIDRATACION, { detail: { grupo, ok } }));
    }
  } catch { /* noop */ }
};

function esRutaTab(pathname: string): boolean {
  return RUTAS_TAB.some((r) => pathname === r);
}

function ControlPestanaPersistente() {
  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    if (!window || !window.sessionStorage) return;
    try {
      const actual = location.pathname;
      if (esRutaTab(actual)) {
        sessionStorage.setItem(STORAGE_KEY, actual);
      }
    } catch {}
  }, [location.pathname]);

  useEffect(() => {
    if (!window || !window.sessionStorage) return;
    try {
      const actual = location.pathname;
      const search = location.search;
      const hash = location.hash;
      if (actual === '/' || actual === '') {
        const recordada = sessionStorage.getItem(STORAGE_KEY);
        const destino = recordada && esRutaTab(recordada) ? recordada : '/home';
        if (destino !== actual) {
          history.replace(destino + search + hash);
        }
      }
    } catch {}
  }, []);

  return null;
}

function TabBarCondicional() {
  const location = useLocation();
  const esHome = location.pathname === '/home';
  return (
    <IonTabBar slot="bottom" className={esHome ? 'app-tabbar-home-hidden' : undefined}>
      <IonTabButton tab="home" href="/home">
        <IonIcon aria-hidden="true" icon={home} />
        <IonLabel>Inicio</IonLabel>
      </IonTabButton>
      <IonTabButton tab="reservas" href="/reservas">
        <IonIcon aria-hidden="true" icon={calendar} />
        <IonLabel>Reservas</IonLabel>
      </IonTabButton>
      <IonTabButton tab="habitaciones" href="/habitaciones">
        <IonIcon aria-hidden="true" icon={bed} />
        <IonLabel>Habitaciones</IonLabel>
      </IonTabButton>
      <IonTabButton tab="pos" href="/pos">
        <IonIcon aria-hidden="true" icon={restaurant} />
        <IonLabel>POS</IonLabel>
      </IonTabButton>
      <IonTabButton tab="perfil" href="/perfil">
        <IonIcon aria-hidden="true" icon={person} />
        <IonLabel>Perfil</IonLabel>
      </IonTabButton>
    </IonTabBar>
  );
}

const App: React.FC = () => {
  const [networkMode, setNetworkMode] = useState<NetworkMode>('ONLINE');
  const [pendientesCount, setPendientesCount] = useState<number>(0);
  const [retryTick, setRetryTick] = useState(0);
  const checkingRef = React.useRef(false);
  const bootDoneRef = React.useRef(false);
  const prevPendientesRef = React.useRef<number>(0);
  const procesandoRef = React.useRef(false);
  const [toastOfflineGuardado, setToastOfflineGuardado] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });
  const [toastSyncOk, setToastSyncOk] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

  // ==== Toasts contextuales ====
  const avisarGuardadoOffline = useCallback(() => {
    setToastOfflineGuardado({ show: true, msg: '💾 Guardado local · Cuando tengas internet se sincronizará solo' });
    window.setTimeout(() => setToastOfflineGuardado((p) => ({ ...p, show: false })), 2800);
  }, []);
  const avisarSyncOk = useCallback((n: number) => {
    if (n <= 0) return;
    setToastSyncOk({ show: true, msg: `☁️ +${n} cambios sincronizados a la nube ✅` });
    window.setTimeout(() => setToastSyncOk((p) => ({ ...p, show: false })), 3000);
  }, []);
  const reintentarPendientes = useCallback(async () => {
    if (procesandoRef.current) return;
    procesandoRef.current = true;
    try {
      const [ok, fail] = (await pendingSync.processQueue?.(true)) || [0, 0, 0];
      const total = Number(ok || 0) + Number(fail || 0);
      if (total === 0) {
        setToastSyncOk({ show: true, msg: 'No había cambios pendientes de sincronizar' });
        window.setTimeout(() => setToastSyncOk((p) => ({ ...p, show: false })), 2200);
      } else if (Number(fail || 0) > 0) {
        setToastSyncOk({ show: true, msg: `⚠️ ${ok} OK · ${fail} fallidos · Reintenta luego` });
        window.setTimeout(() => setToastSyncOk((p) => ({ ...p, show: false })), 3200);
      } else {
        avisarSyncOk(Number(ok || 0));
      }
    } catch {
      setToastSyncOk({ show: true, msg: 'No se pudo sincronizar · Intenta en 30s' });
      window.setTimeout(() => setToastSyncOk((p) => ({ ...p, show: false })), 2800);
    } finally {
      procesandoRef.current = false;
      _pingCache = null;
      checkNetworkAndQueueRef.current?.(true);
    }
  }, [avisarSyncOk]);
  const checkNetworkAndQueueRef = React.useRef<(f?: boolean) => Promise<void>>();

  const checkNetworkAndQueue = useCallback(async (force = false) => {
    if (checkingRef.current && !force) return;
    checkingRef.current = true;
    try {
      const n = Number(pendingSync.countPendientes?.() || 0);
      const nFin = Number.isFinite(n) ? n : 0;
      // Detectar bajada (sync completado) antes de setear nuevo state
      const prevN = prevPendientesRef.current;
      if (nFin < prevN) avisarSyncOk(prevN - nFin);
      prevPendientesRef.current = nFin;
      setPendientesCount(nFin);
      const pingOk = await _pingSupabaseReal();
      setNetworkMode(!!pingOk ? 'ONLINE' : 'OFFLINE');
      if (!!pingOk && nFin > 0 && !procesandoRef.current) {
        procesandoRef.current = true;
        pendingSync.processQueue?.(false).catch(() => {}).finally(() => { procesandoRef.current = false; });
      }
    } catch {
      setNetworkMode('ONLINE');
    } finally {
      checkingRef.current = false;
      bootDoneRef.current = true;
    }
  }, [avisarSyncOk]);

  useEffect(() => {
    checkNetworkAndQueueRef.current = checkNetworkAndQueue;
  }, [checkNetworkAndQueue]);

  useEffect(() => {
    checkNetworkAndQueue(true);
    // ======= applyPendingLocal GARANTIZADO al boot y cada hidratación (Capa de protección CRÍTICA)
    try { pendingSync.applyPendingLocal?.(); } catch (_) {}
    try { window.setTimeout(() => { try { pendingSync.applyPendingLocal?.(); } catch (_){} }, 500); } catch (_) {}
    try { window.setTimeout(() => { try { pendingSync.applyPendingLocal?.(); } catch (_){} }, 1500); } catch (_) {}
    try { window.setTimeout(() => { try { pendingSync.applyPendingLocal?.(); } catch (_){} }, 3000); } catch (_) {}
    try { window.setTimeout(() => { try { pendingSync.applyPendingLocal?.(); } catch (_){} }, 6000); } catch (_) {}
    try { window.setTimeout(() => { try { pendingSync.applyPendingLocal?.(); } catch (_){} }, 12000); } catch (_) {}
    const t0 = window.setTimeout(() => {
      if (!bootDoneRef.current) {
        const navOnline = typeof navigator !== 'undefined' ? !!navigator.onLine : true;
        if (navOnline) setNetworkMode('ONLINE');
      }
    }, 1800);
    const t1 = window.setInterval(() => checkNetworkAndQueue(false), 6000);
    const t2 = window.setInterval(() => setRetryTick((t) => t + 1), 20000);
    const t3 = window.setInterval(() => { try { pendingSync.applyPendingLocal?.(); } catch (_){} }, 15000); // replay cada 15s por si Realtime pisa
    const on = () => { _pingCache = null; checkNetworkAndQueue(true); };
    window.addEventListener?.('online', on);
    window.addEventListener?.('offline', on);
    try {
      const onDBMutated = () => setTimeout(() => checkNetworkAndQueue(false), 400);
      const onEnqueued = () => {
        // Hay un pending nuevo encolado = guardado offline → toast
        setTimeout(() => {
          checkNetworkAndQueue(false);
          if (networkMode !== 'ONLINE' || pendientesCount > 0) avisarGuardadoOffline();
          else if (!dbRemota?.client || !(dbRemota.client as any)?.from) avisarGuardadoOffline();
        }, 60);
      };
      const onAppHidratado = () => { setTimeout(() => { try { pendingSync.applyPendingLocal?.(); } catch (_){} }, 200); };
      window.addEventListener?.('lodge:db:mutated', onDBMutated);
      window.addEventListener?.('lodge:pending:enqueued', onEnqueued);
      window.addEventListener?.(EVENTO_HIDRATACION, onAppHidratado);
    } catch (_) {}
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(t1);
      window.clearInterval(t2);
      window.clearInterval(t3);
      window.removeEventListener?.('online', on);
      window.removeEventListener?.('offline', on);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkNetworkAndQueue, avisarGuardadoOffline, networkMode, pendientesCount]);

  useEffect(() => { checkNetworkAndQueue(true); }, [retryTick, checkNetworkAndQueue]);

  // 1 vez al boot: hidratar InMemoryDB con datos reales de Supabase Cloud
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Orden: Hab (dep none) → Res (dep Hab) → TarifasGroup → PosGroup → Huespedes → FolioGroup (dep Res/Hab/Huesp)
      // Cada hidratación tiene try/catch individual NO FATAL; si una falla el resto sigue y usa seed local
      // Al terminar cada grupo → dispatch custom event 'lodge:hidratacion-listo' para que components refresquen states
      try {
        const hidratadoHab = await HabitacionService.hidratarDesdeSupabase(false);
        if (!cancelled) {
          dispatchHidratado('habitaciones', !!hidratadoHab);
          if (window && (window as any).console) {
            (window as any).console.debug('[App] Boot hidratación habitaciones Supabase:', hidratadoHab ? 'OK' : 'falló (seed local)');
          }
        }
      } catch (e) {
        dispatchHidratado('habitaciones', false);
        if (!cancelled) console.warn('[App] Boot hidratación habitaciones (no fatal):', (e as any)?.message || e);
      }
      try {
        const hidratadoRes = await ReservaService.hidratarDesdeSupabase(false);
        dispatchHidratado('reservas', !!hidratadoRes);
        if (!cancelled && window && (window as any).console) {
          (window as any).console.debug('[App] Boot hidratación reservas Supabase:', hidratadoRes ? 'OK' : 'falló (sin datos remotos)');
        }
      } catch (e) {
        dispatchHidratado('reservas', false);
        if (!cancelled) console.warn('[App] Boot hidratación reservas (no fatal):', (e as any)?.message || e);
      }
      try {
        const hidratadoTar = await (TarifaService as any).hidratarDesdeSupabase(false);
        dispatchHidratado('tarifas', !!hidratadoTar);
        if (!cancelled && window && (window as any).console) {
          (window as any).console.debug('[App] Boot hidratación tarifas-group Supabase:', hidratadoTar ? 'OK' : 'falló (seed local)');
        }
      } catch (e) {
        dispatchHidratado('tarifas', false);
        if (!cancelled) console.warn('[App] Boot hidratación tarifas-group (no fatal):', (e as any)?.message || e);
      }
      try {
        const hidratadoPos = await PosService.hidratarDesdeSupabase(false);
        dispatchHidratado('pos', !!hidratadoPos);
        if (!cancelled && window && (window as any).console) {
          (window as any).console.debug('[App] Boot hidratación pos-group Supabase:', hidratadoPos ? 'OK' : 'falló (seed local)');
        }
      } catch (e) {
        dispatchHidratado('pos', false);
        if (!cancelled) console.warn('[App] Boot hidratación pos-group (no fatal):', (e as any)?.message || e);
      }
      try {
        const hidratadoHuesp = await HuespedService.hidratarDesdeSupabase(false);
        dispatchHidratado('huespedes', !!hidratadoHuesp);
        if (!cancelled && window && (window as any).console) {
          (window as any).console.debug('[App] Boot hidratación huespedes Supabase:', hidratadoHuesp ? 'OK' : 'falló (sin datos remotos)');
        }
      } catch (e) {
        dispatchHidratado('huespedes', false);
        if (!cancelled) console.warn('[App] Boot hidratación huespedes (no fatal):', (e as any)?.message || e);
      }
      try {
        const hidratadoFol = await FolioService.hidratarDesdeSupabase(false);
        dispatchHidratado('folios', !!hidratadoFol);
        if (!cancelled && window && (window as any).console) {
          (window as any).console.debug('[App] Boot hidratación folios-group Supabase:', hidratadoFol ? 'OK' : 'falló (seed local)');
        }
      } catch (e) {
        dispatchHidratado('folios', false);
        if (!cancelled) console.warn('[App] Boot hidratación folios-group (no fatal):', (e as any)?.message || e);
      }
      // Iniciar worker de reintentos de sync pendiente (30s + listener window online).
      try { pendingSync.initSyncWorker?.(); } catch (_e) {}
      // Flush inicial de queue si quedaron ops de sesiones anteriores.
      try { (async () => { try { const [ok, fail] = await pendingSync.processQueue?.(false) || [0,0,0]; (console.debug || console.log)(`[PendingSync] boot flush: ${ok} OK, ${fail} fallaron`); } catch (_e) {} })(); } catch (_) {}
      // Seed inicial automático de catálogo productos/categorías/alérgenos si está vacío.
      try {
        const seed = seedProductos as any;
        if (seed?.estaCatalogoVacio?.()) {
          const res = seed.ensureSeedInicialCompleto?.(false) || {};
          console.info('[SeedCatalogo] Boot seed inicial automático:', res);
        }
      } catch (e) {
        console.warn('[SeedCatalogo] Seed inicial falló (no fatal):', (e as any)?.message || e);
      }
      // Seed punto venta default (restaurante + POS). Elimina error "Punto de venta no encontrado".
      try {
        const { PuntoVentaService } = await import('./services');
        const pv = PuntoVentaService?.ensureDefault?.('PV-RESTAURANTE-01');
        if (pv) (console.debug || console.log)(`[SeedPuntoVenta] Default PV OK: ${pv.id} ${pv.nombre}`);
      } catch (_e) { /* noop */ }
      dispatchHidratado('todos', true);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <IonApp>
      <IonReactRouter basename="/casasumaqallpa">
        <ControlPestanaPersistente />
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/home">
              <HomePage />
            </Route>
            <Route exact path="/reservas">
              <ReservasPage />
            </Route>
            <Route exact path="/nueva-reserva">
              <NuevaReservaPage />
            </Route>
            <Route exact path="/reservas/:id">
              <ReservaDetallePage />
            </Route>
            <Route exact path="/folio/:id">
              <FolioPage />
            </Route>
            <Route exact path="/habitaciones">
              <HabitacionesPage />
            </Route>
            <Route exact path="/pos">
              <PosPage />
            </Route>
            <Route exact path="/perfil">
              <PerfilPage />
            </Route>
            <Route exact path="/">
              <Redirect to="/home" />
            </Route>
          </IonRouterOutlet>

          <TabBarCondicional />
        </IonTabs>
      </IonReactRouter>

      {/* BADGE FLOTANTE Pendientes N>0: inf-dcha, sobre TabBar. Click = Reintentar sync */}
      {pendientesCount > 0 && (
        <div
          title={`${pendientesCount} cambios pendientes — Toca para sincronizar`}
          onClick={reintentarPendientes}
          style={{
            position: 'fixed',
            right: 14,
            bottom: 72,
            width: 44,
            height: 44,
            borderRadius: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99998,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 800,
            userSelect: 'none',
            background: networkMode === 'OFFLINE'
              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
              : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          }}
        >
          <IonIcon slot="icon-only" icon={networkMode === 'OFFLINE' ? cloudOffline : cloud} style={{ fontSize: 16, marginRight: 2 }} />
          <IonBadge color="danger" style={{ position: 'absolute', top: -4, right: -4, fontSize: 11 }}>
            {pendientesCount > 999 ? '999+' : pendientesCount}
          </IonBadge>
        </div>
      )}

      {/* TOAST 1: Guardado offline (cuando encolas un pending) */}
      <IonToast
        isOpen={toastOfflineGuardado.show}
        onDidDismiss={() => setToastOfflineGuardado({ show: false, msg: '' })}
        message={toastOfflineGuardado.msg}
        duration={2800}
        color="warning"
        position="top"
        buttons={[
          {
            side: 'end',
            text: 'OK',
            handler: () => setToastOfflineGuardado({ show: false, msg: '' })
          }
        ]}
      />
      {/* TOAST 2: Sync ok a nube completado */}
      <IonToast
        isOpen={toastSyncOk.show}
        onDidDismiss={() => setToastSyncOk({ show: false, msg: '' })}
        message={toastSyncOk.msg}
        duration={3000}
        color="success"
        position="bottom"
      />
    </IonApp>
  );
};

export default App;
