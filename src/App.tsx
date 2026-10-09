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

// ====== Helper PING REAL a Supabase (3 capas fallback, NO falso negativo) ======
const PING_TIMEOUT_MS = 2200;
const PING_CACHE_MS = 4500;
const SUPABASE_URL_FOR_PING =
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_SUPABASE_URL) ||
  'https://yuoftlckoctrkkfajaii.supabase.co';
const SUPABASE_ANON_FOR_PING =
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1b2Z0bGNrb2N0cmtrZmFqYWlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMzkwMzIsImV4cCI6MjEwNjYxNTAzMn0.6kXEWIKvumiTxcPXA9-C-JoVDi338RGKqkVXXythgoc';
let _pingCache: { ts: number; result: boolean } | null = null;
let _pingEnCurso: Promise<boolean> | null = null;

async function _pingSupabaseReal(): Promise<boolean> {
  const ahora = Date.now();
  if (_pingCache && (ahora - _pingCache.ts) < PING_CACHE_MS) return _pingCache.result;
  if (_pingEnCurso) return _pingEnCurso;

  _pingEnCurso = (async (): Promise<boolean> => {
    try {
      // CAPA 1: Supabase client si existe
      const client = dbRemota?.client;
      let ok = false;
      if (client && (client as any).from) {
        const timeoutC1 = new Promise<never>((_, rj) =>
          setTimeout(() => rj(new Error('C1_TIMEOUT')), PING_TIMEOUT_MS)
        );
        try {
          const req = (client as any).from('impuestos').select('id', { count: 'exact', head: true }).limit(1);
          const res = await Promise.race([req, timeoutC1]);
          ok = !(res?.error);
        } catch { ok = false; }
      }
      // CAPA 2: Fallback fetch() directo a REST API si capa1 falla / client no existe
      if (!ok && typeof fetch === 'function') {
        const timeoutC2 = new Promise<never>((_, rj) =>
          setTimeout(() => rj(new Error('C2_TIMEOUT')), PING_TIMEOUT_MS)
        );
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
          const res = await Promise.race([req, timeoutC2]) as Response;
          ok = !!res && res.ok;
        } catch { ok = false; }
      }
      // CAPA 3: Optimista si navigator.onLine=true (fallback extremo si Supabase está caído
      //          PERO usuario SÍ tiene internet → mostrar VERDE igual, no bloquear UX)
      if (!ok) {
        const navOnline = typeof navigator !== 'undefined' ? !!navigator.onLine : true;
        if (navOnline) {
          try {
            const timeoutC3 = new Promise<never>((_, rj) =>
              setTimeout(() => rj(new Error('C3_TIMEOUT')), 900)
            );
            const tiny = await Promise.race([
              fetch('https://httpbin.org/get', { method: 'HEAD', cache: 'no-store', credentials: 'omit' }),
              timeoutC3,
            ]) as any;
            ok = !!tiny && (!!tiny.ok || !!tiny.status || !!tiny.type);
          } catch { ok = navOnline; /* último recurso, creemos al navegador */ }
        }
      }
      _pingCache = { ts: Date.now(), result: !!ok };
      return !!ok;
    } catch (_e) {
      const navOnline = typeof navigator !== 'undefined' ? !!navigator.onLine : true;
      const res = !!navOnline;
      _pingCache = { ts: Date.now(), result: res };
      return res;
    } finally {
      _pingEnCurso = null;
    }
  })();
  return _pingEnCurso;
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

function BannerEstadoConexion({
  networkMode,
  pendientesCount,
  onReintentar,
}: {
  networkMode: NetworkMode;
  pendientesCount: number;
  onReintentar: () => void;
}) {
  const [toastOk, setToastOk] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });
  const [loadingRetry, setLoadingRetry] = useState(false);

  const fondoBanner = useMemo(() => {
    if (networkMode === 'OFFLINE') return '#fde68a';
    if (pendientesCount > 0) return '#dbeafe';
    return '#dcfce7';
  }, [networkMode, pendientesCount]);
  const colorTexto = useMemo(() => {
    if (networkMode === 'OFFLINE') return '#78350f';
    if (pendientesCount > 0) return '#1e3a8a';
    return '#14532d';
  }, [networkMode, pendientesCount]);
  const icono = useMemo(() => {
    if (networkMode === 'OFFLINE') return cloudOffline;
    if (networkMode === 'CHECKING') return alertCircle;
    return pendientesCount > 0 ? cloud : checkmarkCircle;
  }, [networkMode, pendientesCount]);
  const label = useMemo(() => {
    if (networkMode === 'OFFLINE') return '⚠️ Sin internet · Modo offline (se guarda local, luego se sincroniza)';
    if (pendientesCount > 0) return `🟡 ${pendientesCount} cambios pendientes de sincronizar a la nube`;
    if (networkMode === 'CHECKING') return '🔄 Verificando conexión...';
    return '✅ Conectado · Todo sincronizado';
  }, [networkMode, pendientesCount]);

  const reintentar = useCallback(async () => {
    setLoadingRetry(true);
    try {
      const [ok, fail] = (await pendingSync.processQueue?.(true)) || [0, 0, 0];
      const total = Number(ok || 0) + Number(fail || 0);
      if (total === 0 && networkMode === 'ONLINE') {
        setToastOk({ show: true, msg: 'No hay cambios pendientes de sincronizar' });
      } else if (fail === 0) {
        setToastOk({ show: true, msg: `✅ ${ok} cambios sincronizados a la nube` });
      } else {
        setToastOk({ show: true, msg: `⚠️ ${ok} OK / ${fail} fallidos · Reintenta en 30s o con Wi-Fi` });
      }
    } catch (e: any) {
      setToastOk({ show: true, msg: e?.message || 'Error al reintentar' });
    } finally {
      setTimeout(() => setLoadingRetry(false), 400);
    }
  }, [networkMode]);

  return (
    <>
      <div
        onClick={() => { if (networkMode !== 'ONLINE' || pendientesCount > 0) reintentar(); }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: fondoBanner,
          color: colorTexto,
          fontSize: 13,
          fontWeight: 600,
          borderBottom: `1px solid ${colorTexto}33`,
          userSelect: 'none',
          cursor: (networkMode !== 'ONLINE' || pendientesCount > 0) ? 'pointer' : 'default',
        }}
      >
        <IonIcon icon={icono} style={{ fontSize: 18 }} />
        <div style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        {(networkMode !== 'ONLINE' || pendientesCount > 0) && (
          <IonButton
            size="small"
            color={networkMode === 'OFFLINE' ? 'warning' : 'primary'}
            onClick={(e) => { e.stopPropagation(); onReintentar(); }}
            disabled={loadingRetry}
            style={{ marginInline: 0, marginBlock: 0, minHeight: 30 }}
          >
            <IonIcon slot="start" icon={refreshCircle} />
            Reintentar
          </IonButton>
        )}
        {pendientesCount > 0 && (
          <IonBadge color={networkMode === 'OFFLINE' ? 'warning' : 'primary'} style={{ fontSize: 12 }}>{pendientesCount}</IonBadge>
        )}
      </div>
      <IonToast
        isOpen={toastOk.show}
        onDidDismiss={() => setToastOk({ show: false, msg: '' })}
        message={toastOk.msg}
        duration={2400}
        position="top"
        style={{ marginTop: 42 }}
      />
    </>
  );
}

const App: React.FC = () => {
  const [networkMode, setNetworkMode] = useState<NetworkMode>('CHECKING');
  const [pendientesCount, setPendientesCount] = useState<number>(0);
  const [retryTick, setRetryTick] = useState(0);
  const checkingRef = React.useRef(false);
  const bootDoneRef = React.useRef(false);

  const checkNetworkAndQueue = useCallback(async (force = false) => {
    if (checkingRef.current && !force) return;
    checkingRef.current = true;
    try {
      // 1. Actualizar contador pendientes SIEMPRE
      const n = Number(pendingSync.countPendientes?.() || 0);
      setPendientesCount(Number.isFinite(n) ? n : 0);
      // 2. Ping 3 capas Supabase/fetch/httpbin -> dentro ya tiene fallback navOnline optimista
      const pingOk = await _pingSupabaseReal();
      const finalOnline = !!pingOk;
      setNetworkMode(finalOnline ? 'ONLINE' : 'OFFLINE');
      // 3. Si volvemos ONLINE con pendientes → auto-flush suave
      if (finalOnline && pendingSync.countPendientes?.() > 0) {
        pendingSync.processQueue?.(false).catch(() => {});
      }
    } catch {
      setNetworkMode('ONLINE');
    } finally {
      checkingRef.current = false;
      bootDoneRef.current = true;
    }
  }, []);

  useEffect(() => {
    checkNetworkAndQueue(true);
    // Primer boot: si a los 2s sigue CHECKING y navigator.onLine=true, mostrar ONLINE
    const t0 = window.setTimeout(() => {
      if (!bootDoneRef.current) {
        const navOnline = typeof navigator !== 'undefined' ? !!navigator.onLine : true;
        if (navOnline) setNetworkMode('ONLINE');
      }
    }, 2000);
    const t1 = window.setInterval(() => checkNetworkAndQueue(false), 6000);
    const t2 = window.setInterval(() => setRetryTick((t) => t + 1), 20000);
    const on = () => { _pingCache = null; checkNetworkAndQueue(true); };
    window.addEventListener?.('online', on);
    window.addEventListener?.('offline', on);
    try {
      const onDBMutated = () => setTimeout(() => checkNetworkAndQueue(false), 350);
      window.addEventListener?.('lodge:db:mutated', onDBMutated);
      window.addEventListener?.('lodge:pending:enqueued', onDBMutated);
    } catch (_) {}
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(t1);
      window.clearInterval(t2);
      window.removeEventListener?.('online', on);
      window.removeEventListener?.('offline', on);
    };
  }, [checkNetworkAndQueue]);

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
    <IonApp style={{ paddingTop: 36 }}>
      <BannerEstadoConexion
        networkMode={networkMode}
        pendientesCount={pendientesCount}
        onReintentar={() => { checkNetworkAndQueue(); setRetryTick((t) => t + 1); }}
      />
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
    </IonApp>
  );
};

export default App;
