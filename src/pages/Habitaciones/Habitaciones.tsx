import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonBadge,
} from '@ionic/react';
import './Habitaciones.css';

interface HabitacionMock {
  id: string;
  tipo: string;
  capacidad: number;
  estado: 'libre' | 'ocupada' | 'limpieza' | 'mantenimiento';
  tarifa: number;
}

const mockHabitaciones: HabitacionMock[] = [
  { id: 'CAB-01', tipo: 'Cabaña Doble', capacidad: 2, estado: 'ocupada', tarifa: 280 },
  { id: 'CAB-02', tipo: 'Cabaña Doble', capacidad: 2, estado: 'libre', tarifa: 280 },
  { id: 'FAM-03', tipo: 'Familiar 4P', capacidad: 4, estado: 'ocupada', tarifa: 420 },
  { id: 'CAB-04', tipo: 'Cabaña Triple', capacidad: 3, estado: 'limpieza', tarifa: 360 },
  { id: 'DOB-05', tipo: 'Doble', capacidad: 2, estado: 'libre', tarifa: 220 },
  { id: 'SUI-06', tipo: 'Suite con vista', capacidad: 2, estado: 'mantenimiento', tarifa: 520 },
  { id: 'CAB-07', tipo: 'Cabaña Doble', capacidad: 2, estado: 'libre', tarifa: 280 },
  { id: 'FAM-08', tipo: 'Familiar 5P', capacidad: 5, estado: 'ocupada', tarifa: 500 },
];

const estadoLabel: Record<HabitacionMock['estado'], string> = {
  libre: 'LIBRE',
  ocupada: 'OCUPADA',
  limpieza: 'LIMPIEZA',
  mantenimiento: 'MANTENIMIENTO',
};

const estadoColor: Record<HabitacionMock['estado'], string> = {
  libre: 'success',
  ocupada: 'danger',
  limpieza: 'warning',
  mantenimiento: 'medium',
};

const HabitacionesPage: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Habitaciones</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Habitaciones</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonGrid className="table-grid">
          <IonRow>
            {mockHabitaciones.map((h) => (
              <IonCol key={h.id} size="12" size-sm="6" size-md="4" size-lg="3" size-xl="3">
                <IonCard button className={`hab-card hab-${h.estado}`}>
                  <IonCardHeader>
                    <div className="hab-row">
                      <IonCardTitle>{h.id}</IonCardTitle>
                      <IonBadge color={estadoColor[h.estado]}>{estadoLabel[h.estado]}</IonBadge>
                    </div>
                    <IonCardSubtitle>{h.tipo}</IonCardSubtitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <p>
                      Capacidad: <strong>{h.capacidad} pax</strong>
                    </p>
                    <p>
                      Tarifa base: <strong>S/ {h.tarifa.toFixed(2)}</strong>
                    </p>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default HabitacionesPage;
