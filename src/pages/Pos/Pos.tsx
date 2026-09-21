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
  IonCardContent,
  IonBadge,
  IonLabel,
  IonChip,
} from '@ionic/react';
import { checkmarkCircle, alert, timeOutline } from 'ionicons/icons';
import './Pos.css';

type EstadoMesa = 'libre' | 'ocupada' | 'sucia';
type EstadoComanda = 'abierta' | 'cocina' | 'lista' | 'cerrada';

interface MesaMock {
  id: string;
  nombre: string;
  capacidad: number;
  estado: EstadoMesa;
  habitacion?: string;
  comanda?: {
    id: number;
    estado: EstadoComanda;
    items: number;
    mozo: string;
    total: number;
  };
}

const mockMesas: MesaMock[] = [
  { id: 'm1', nombre: 'Mesa 1', capacidad: 4, estado: 'ocupada', comanda: { id: 901, estado: 'cocina', items: 6, mozo: 'Luis', total: 125.5 } },
  { id: 'm2', nombre: 'Mesa 2', capacidad: 2, estado: 'ocupada', comanda: { id: 902, estado: 'lista', items: 3, mozo: 'Ana', total: 62 } },
  { id: 'm3', nombre: 'Mesa 3', capacidad: 6, estado: 'libre' },
  { id: 'm4', nombre: 'Mesa 4', capacidad: 4, estado: 'sucia' },
  { id: 'm5', nombre: 'Mesa 5', capacidad: 2, estado: 'ocupada', comanda: { id: 903, estado: 'abierta', items: 2, mozo: 'Luis', total: 48 } },
  { id: 'm6', nombre: 'Terraza 1', capacidad: 4, estado: 'ocupada', comanda: { id: 904, estado: 'cerrada', items: 4, mozo: 'Ana', total: 98 } },
  { id: 'h101', nombre: 'Hab. 101', capacidad: 2, estado: 'ocupada', habitacion: 'CAB-01', comanda: { id: 910, estado: 'cocina', items: 5, mozo: 'Room Service', total: 110 } },
  { id: 'h103', nombre: 'Hab. 103', capacidad: 4, estado: 'ocupada', habitacion: 'FAM-03', comanda: { id: 915, estado: 'abierta', items: 8, mozo: 'Room Service', total: 240 } },
];

const mesaColor: Record<EstadoMesa, string> = {
  libre: 'success',
  ocupada: 'danger',
  sucia: 'warning',
};

const comandaBadge: Record<EstadoComanda, { color: string; label: string; icon?: string }> = {
  abierta: { color: 'warning', label: 'ABIERTA', icon: 'timeOutline' },
  cocina: { color: 'tertiary', label: 'EN COCINA', icon: 'alert' },
  lista: { color: 'success', label: 'LISTA', icon: 'checkmarkCircle' },
  cerrada: { color: 'medium', label: 'CERRADA' },
};

const PosPage: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>POS · Comida y Bebida</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">POS F&amp;B</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="pos-legend">
          <IonChip color="success">Libre</IonChip>
          <IonChip color="danger">Ocupada</IonChip>
          <IonChip color="warning">En limpieza</IonChip>
          <IonChip color="tertiary">En cocina</IonChip>
          <IonChip color="success">Lista</IonChip>
        </div>

        <IonGrid className="table-grid ion-margin-top">
          <IonRow>
            {mockMesas.map((m) => (
              <IonCol key={m.id} size="12" size-sm="6" size-md="4" size-lg="4" size-xl="3">
                <IonCard button className={`pos-mesa pos-${m.estado}`}>
                  <IonCardHeader>
                    <div className="pos-row">
                      <IonCardTitle>{m.nombre}</IonCardTitle>
                      <IonBadge color={mesaColor[m.estado]}>{m.estado.toUpperCase()}</IonBadge>
                    </div>
                    <IonCardSubtitle>Capacidad: {m.capacidad} pax</IonCardSubtitle>
                    {m.habitacion ? (
                      <IonLabel className="hab-ref">Vinculada a habitación: {m.habitacion}</IonLabel>
                    ) : null}
                  </IonCardHeader>
                  <IonCardContent>
                    {m.comanda ? (
                      <>
                        <div className="comanda-row">
                          <span>
                            <strong>#{m.comanda.id}</strong> — {comandaBadge[m.comanda.estado].label}
                          </span>
                          <IonBadge color={comandaBadge[m.comanda.estado].color}>
                            {comandaBadge[m.comanda.estado].label}
                          </IonBadge>
                        </div>
                        <p className="ion-no-margin">
                          {m.comanda.items} platos · Mozo: {m.comanda.mozo}
                        </p>
                        <p className="ion-no-margin total">
                          Total: <strong>S/ {m.comanda.total.toFixed(2)}</strong>
                        </p>
                      </>
                    ) : (
                      <p className="sin-comanda">Sin comanda activa</p>
                    )}
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

export default PosPage;
