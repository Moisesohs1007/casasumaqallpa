import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonLabel,
  IonBadge,
  IonItem,
  IonIcon,
} from '@ionic/react';
import type { Color } from '@ionic/core';
import { people, bed, restaurant, trendingUp, Icon } from 'ionicons/icons';
import type { EstadoReserva, EstadoComanda, EstadoHabitacion, MetodoPago, Moneda, OrigenReserva, Usuario } from '../../types';
import './Home.css';

interface DashboardKpiItem {
  id: string;
  label: string;
  value: number;
  badge?: string;
  icon: Icon;
  color: Color;
}

interface HomePageProps {}

const HomePage: React.FC<HomePageProps> = () => {
  const today = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const dashboardItems: DashboardKpiItem[] = [
    { id: 'kpi-llegadas', label: 'Llegadas hoy', value: 3, badge: '+1', icon: people, color: 'primary' },
    { id: 'kpi-salidas', label: 'Salidas hoy', value: 2, icon: trendingUp, color: 'warning' },
    { id: 'kpi-hab', label: 'Habitaciones ocupadas', value: 12, badge: '/15', icon: bed, color: 'tertiary' },
    { id: 'kpi-com', label: 'Comandas activas', value: 5, icon: restaurant, color: 'success' },
  ];

  const sessionUsuario: Usuario = {
    id: 'usr-actual',
    uuid: 'usr-uuid-actual',
    iniciales: 'MO',
    nombres: 'Moises',
    apellidos: 'OHS',
    correoElectronico: 'moisesohs@gmail.com',
    rolId: 'rol-admin',
    estado: 'ACTIVO',
    passwordHash: '__hidden__',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  void sessionUsuario;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Casa Sumaq Allpa</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Inicio</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonItem lines="none" className="ion-margin-bottom">
          <IonLabel>
            <h2 className="ion-text-capitalize">{today}</h2>
            <p>Bienvenido(a) al panel de gestión.</p>
          </IonLabel>
        </IonItem>

        <IonGrid>
          <IonRow>
            {dashboardItems.map((item) => (
              <IonCol key={item.id} size="12" size-sm="6" size-md="6" size-lg="4" size-xl="3">
                <IonCard color={`${item.color}`} className="dashboard-card">
                  <IonCardHeader>
                    <div className="card-header-row">
                      <IonIcon icon={item.icon} size="large" color="light" />
                      <IonBadge color="light" className="badge-value">
                        {item.value}
                        {item.badge ? <span className="badge-sub">{item.badge}</span> : null}
                      </IonBadge>
                    </div>
                    <IonCardTitle className="ion-padding-top card-title">{item.label}</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <small>Etapa 1 + Etapa 2 — Base preparada</small>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>

        <IonCard className="ion-margin-top">
          <IonCardHeader>
            <IonCardTitle>Estructura del sistema</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <ul className="home-ul">
              <li>Etapa 1: Núcleo de reservas (Habitaciones, Tarifas, Calendario, Reservas, Huéspedes)</li>
              <li>Etapa 2: Recepción, Cuenta y POS F&amp;B (Check-in/out, Folio, Cobros, Usuarios y POS)</li>
              <li>Etapas 3-8: Operación diaria, Facturación SUNAT, Extras, Distribución, Experiencia, Admin.</li>
            </ul>
            <p className="ion-margin-top">
              <strong>Siguiente paso:</strong> implementar los modelos (tipos TypeScript) y servicios mock
              para Reservas, Habitaciones y Huéspedes (Etapa 1).
            </p>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
