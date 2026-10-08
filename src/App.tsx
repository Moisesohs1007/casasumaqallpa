import React, { useEffect } from 'react';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { home, calendar, bed, restaurant, person } from 'ionicons/icons';
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

setupIonicReact({
  mode: 'md',
  animated: true,
});

const STORAGE_KEY = 'lodge_ultima_pestana_v1';
const RUTAS_TAB = ['/home', '/reservas', '/habitaciones', '/pos', '/perfil'];
const EVENTO_HIDRATACION = 'lodge:hidratacion-listo' as const;

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
    </IonApp>
  );
};

export default App;
