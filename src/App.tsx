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
import { Redirect, Route } from 'react-router-dom';

import HomePage from './pages/Home/Home';
import ReservasPage from './pages/Reservas/Reservas';
import NuevaReservaPage from './pages/NuevaReserva/NuevaReserva';
import ReservaDetallePage from './pages/Reservas/ReservaDetalle';
import HabitacionesPage from './pages/Habitaciones/Habitaciones';
import PosPage from './pages/Pos/Pos';
import PerfilPage from './pages/Perfil/Perfil';
import FolioPage from './pages/Folio/Folio';

setupIonicReact({
  mode: 'md',
  animated: true,
});

const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/home">
              <HomePage />
            </Route>
            <Route exact path="/reservas">
              <ReservasPage />
            </Route>
            <Route exact path="/reservas/nueva">
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
