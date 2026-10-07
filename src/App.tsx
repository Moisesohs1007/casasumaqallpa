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
import { HabitacionService } from './services';

setupIonicReact({
  mode: 'md',
  animated: true,
});

const STORAGE_KEY = 'lodge_ultima_pestana_v1';
const RUTAS_TAB = ['/home', '/reservas', '/habitaciones', '/pos', '/perfil'];

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

const App: React.FC = () => {
  // 1 vez al boot: hidratar InMemoryDB con datos reales de Supabase Cloud (tipos/hab/tarifas/politicas)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hidratado = await HabitacionService.hidratarDesdeSupabase(false);
        if (!cancelled && window && (window as any).console) {
          (window as any).console.debug('[App] Boot hidratación habitaciones Supabase:', hidratado ? 'OK' : 'falló (se usa seed local)');
        }
      } catch (e) {
        if (!cancelled) console.warn('[App] Boot hidratación error (no fatal):', (e as any)?.message || e);
      }
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

          <IonTabBar slot="bottom">
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
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
