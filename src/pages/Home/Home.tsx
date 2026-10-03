import React, { useState, useEffect } from 'react';
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
  IonSkeletonText,
  useIonRouter,
  useIonViewWillEnter,
} from '@ionic/react';
import type { Color } from '@ionic/core';
import { people, bed, restaurant, trendingUp } from 'ionicons/icons';
import {
  ReservaService,
  HabitacionService,
  ComandaService,
} from '../../services';
import './Home.css';

interface DashboardKpiItem {
  id: string;
  label: string;
  value: number;
  badge?: string;
  icon: string;
  color: Color;
  loading?: boolean;
  navigateTo?: string;
}

interface HomePageProps {}

const HomePage: React.FC<HomePageProps> = () => {
  const router = useIonRouter();
  const today = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const [kpis, setKpis] = useState<DashboardKpiItem[]>([
    { id: 'kpi-llegadas', label: 'Llegadas hoy', value: 0, icon: people, color: 'primary', loading: true, navigateTo: '/reservas?filter=llegadas-hoy' },
    { id: 'kpi-salidas', label: 'Salidas hoy', value: 0, icon: trendingUp, color: 'warning', loading: true, navigateTo: '/reservas?filter=salidas-hoy' },
    { id: 'kpi-hab', label: 'Habitaciones ocupadas', value: 0, badge: '/0', icon: bed, color: 'tertiary', loading: true, navigateTo: '/habitaciones' },
    { id: 'kpi-com', label: 'Comandas activas', value: 0, icon: restaurant, color: 'success', loading: true, navigateTo: '/pos?filter=activas' },
  ]);

  const cargarKpis = async () => {
    setKpis((prev) => prev.map((k) => ({ ...k, loading: true })));
    try {
      const [estReservas, habs, comandas] = await Promise.all([
        ReservaService.estadisticasHoy(),
        HabitacionService.listarTodas(),
        ComandaService.listarTodas({ estado: 'ABIERTA' }),
      ]);
      const habsOcupadas = habs.filter((h) => h.estado === 'OCUPADA').length;
      const totalHabs = habs.length || 0;
      const comandasAbiertas = comandas.filter(
        (c) => c.estado === 'ABIERTA' || c.estado === 'EN_COCINA_BAR' || c.estado === 'LISTA_PARA_ENTREGAR'
      ).length;
      setKpis([
        { id: 'kpi-llegadas', label: 'Llegadas hoy', value: estReservas.llegadasHoy, icon: people, color: 'primary', navigateTo: '/reservas?filter=llegadas-hoy' },
        { id: 'kpi-salidas', label: 'Salidas hoy', value: estReservas.salidasHoy, icon: trendingUp, color: 'warning', navigateTo: '/reservas?filter=salidas-hoy' },
        { id: 'kpi-hab', label: 'Habitaciones ocupadas', value: habsOcupadas, badge: `/${totalHabs}`, icon: bed, color: 'tertiary', navigateTo: '/habitaciones' },
        { id: 'kpi-com', label: 'Comandas activas', value: comandasAbiertas, icon: restaurant, color: 'success', navigateTo: '/pos?filter=activas' },
      ]);
    } catch (e: any) {
      console.warn('[Home] Error cargando KPIs:', e?.message || e);
      setKpis((prev) => prev.map((k) => ({ ...k, loading: false })));
    }
  };

  useIonViewWillEnter(() => {
    cargarKpis();
  });

  const handleKpiClick = (item: DashboardKpiItem) => {
    if (item.navigateTo) {
      router.push(item.navigateTo, 'forward');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Casa Sumaq Allpa</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonCard className="today-card">
          <IonCardContent style={{ padding: '10px 12px' }}>
            <h2 className="ion-text-capitalize" style={{ margin: 0 }}>{today}</h2>
            <p style={{ margin: '2px 0 0 0', opacity: 0.85 }}>Panel de gestión — recepción en vivo.</p>
          </IonCardContent>
        </IonCard>

        <IonGrid className="table-grid dashboard-grid">
          <IonRow>
            {kpis.map((item) => (
              <IonCol key={item.id} size="12" size-xs="12" size-sm="6" size-md="6" size-lg="6" size-xl="3">
                <IonCard
                  color={`${item.color}`}
                  className="dashboard-card"
                  button={!!item.navigateTo}
                  onClick={() => handleKpiClick(item)}
                  style={{ cursor: item.navigateTo ? 'pointer' : 'default' }}
                >
                  <IonCardHeader>
                    <div className="card-header-row">
                      <IonIcon icon={item.icon} size="large" color="light" />
                      <IonBadge color="light" className="badge-value">
                        {item.loading ? <IonSkeletonText animated style={{ width: 40 }} /> : item.value}
                        {item.badge ? (
                          <span className="badge-sub">
                            {item.loading ? <IonSkeletonText animated style={{ width: 28, display: 'inline-block' }} /> : item.badge}
                          </span>
                        ) : null}
                      </IonBadge>
                    </div>
                    <IonCardTitle className="ion-padding-top card-title">{item.label}</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <small style={{ opacity: 0.92 }}>{item.navigateTo ? 'Toca para ver el detalle' : 'Datos en tiempo real'}</small>
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

export default HomePage;
