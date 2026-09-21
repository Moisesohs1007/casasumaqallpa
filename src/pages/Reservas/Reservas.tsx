import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonBadge } from '@ionic/react';
import './Reservas.css';

interface ReservaMock {
  id: number;
  titular: string;
  habitacion: string;
  checkIn: string;
  checkOut: string;
  estado: 'pendiente' | 'confirmada' | 'checkin' | 'checkout' | 'cancelada';
  noches: number;
}

const mockReservas: ReservaMock[] = [
  { id: 1001, titular: 'Juan Pérez', habitacion: 'Cabaña 1', checkIn: '2026-09-20', checkOut: '2026-09-23', estado: 'checkin', noches: 3 },
  { id: 1002, titular: 'María Gómez', habitacion: 'Suite 2', checkIn: '2026-09-21', checkOut: '2026-09-24', estado: 'confirmada', noches: 3 },
  { id: 1003, titular: 'Luis Quispe', habitacion: 'Familiar 3', checkIn: '2026-09-20', checkOut: '2026-09-22', estado: 'checkin', noches: 2 },
  { id: 1004, titular: 'Ana Ramos', habitacion: 'Cabaña 4', checkIn: '2026-09-25', checkOut: '2026-09-28', estado: 'pendiente', noches: 3 },
  { id: 1005, titular: 'Carlos Huamán', habitacion: 'Doble 5', checkIn: '2026-09-19', checkOut: '2026-09-20', estado: 'checkout', noches: 1 },
];

const estadoColor: Record<ReservaMock['estado'], string> = {
  pendiente: 'warning',
  confirmada: 'tertiary',
  checkin: 'success',
  checkout: 'medium',
  cancelada: 'danger',
};

const ReservasPage: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Reservas</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Reservas</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonList inset>
          {mockReservas.map((r) => (
            <IonItem key={r.id} button detail>
              <IonLabel>
                <h2>
                  #{r.id} — {r.titular}
                </h2>
                <p>
                  {r.habitacion} · {r.noches} noche{r.noches === 1 ? '' : 's'}
                </p>
                <p className="ion-text-wrap">
                  Check-in: {r.checkIn} · Check-out: {r.checkOut}
                </p>
              </IonLabel>
              <IonBadge color={estadoColor[r.estado]} slot="end">
                {r.estado.toUpperCase()}
              </IonBadge>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default ReservasPage;
