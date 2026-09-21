import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonBadge,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
} from '@ionic/react';
import './Perfil.css';

const PerfilPage: React.FC = () => {
  const usuario = {
    iniciales: 'MO',
    nombre: 'Moises OHS',
    rol: 'Administración',
    email: 'moisesohs@gmail.com',
    sede: 'Casa Sumaq Allpa',
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Perfil</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Perfil y sesión</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonCard className="profile-card">
          <IonCardHeader className="profile-header">
            <IonAvatar className="profile-avatar">
              <div className="avatar-inner">{usuario.iniciales}</div>
            </IonAvatar>
            <div className="profile-info">
              <IonCardTitle>{usuario.nombre}</IonCardTitle>
              <IonBadge color="tertiary">{usuario.rol}</IonBadge>
            </div>
          </IonCardHeader>
          <IonCardContent>
            <p>
              <strong>Sede:</strong> {usuario.sede}
            </p>
            <p>
              <strong>Email:</strong> {usuario.email}
            </p>
            <p className="ion-text-color-danger">
              Recuerda: verifica siempre el badge de iniciales antes de operaciones críticas.
            </p>
          </IonCardContent>
        </IonCard>

        <IonList inset>
          <IonItem button detail>
            <IonLabel>Configuración de cuenta</IonLabel>
          </IonItem>
          <IonItem button detail>
            <IonLabel>Permisos y roles</IonLabel>
          </IonItem>
          <IonItem button detail>
            <IonLabel>Preferencias de notificaciones</IonLabel>
          </IonItem>
          <IonItem button lines="none">
            <IonLabel className="ion-text-color-danger">Cerrar sesión</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default PerfilPage;
