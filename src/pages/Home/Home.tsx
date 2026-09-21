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
import { people, bed, restaurant, trendingUp } from 'ionicons/icons';
import './Home.css';

const HomePage: React.FC = () => {
  const today = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const dashboardItems = [
    { id: 1, label: 'Llegadas hoy', value: 3, badge: '+1', icon: people, color: 'primary' },
    { id: 2, label: 'Salidas hoy', value: 2, badge: '', icon: trendingUp, color: 'warning' },
    { id: 3, label: 'Habitaciones ocupadas', value: 12, badge: '/15', icon: bed, color: 'tertiary' },
    { id: 4, label: 'Comandas activas', value: 5, badge: '', icon: restaurant, color: 'success' },
  ];

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
