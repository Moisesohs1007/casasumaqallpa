import React, { useEffect, useState } from 'react';
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
  IonImg,
  IonButton,
} from '@ionic/react';
import type { Color } from '@ionic/core';
import { people, bed, restaurant, trendingUp, documentText } from 'ionicons/icons';
import type { EstadoReserva, EstadoComanda, EstadoHabitacion, MetodoPago, Moneda, OrigenReserva, Usuario } from '../../types';
import './Home.css';

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
function encodeUriBajo(url: string): string {
  const re = /^(.*?)([^/]+)$/;
  const m = url.match(re);
  if (!m) return url;
  const base = m[1];
  const name = m[2];
  return base + encodeURIComponent(name);
}
const PORTADA_CANDIDATOS = [
  `${BASE_URL}/portada.webp`,
  `${BASE_URL}/portada.jpg`,
  `${BASE_URL}/portada.png`,
  `${BASE_URL}/portada.jpeg`,
  `${BASE_URL}/WhatsApp Image 2026-10-06 at 2.07.54 PM(1).jpeg`,
  `${BASE_URL}/WhatsApp Image 2026-10-06 at 2.07.54 PM 1 .jpeg`,
  `${BASE_URL}/logo.webp`,
  `${BASE_URL}/logo.jpg`,
  `${BASE_URL}/logo.png`,
  `${BASE_URL}/logo.jpeg`,
  `${BASE_URL}/portada-sumaq.webp`,
  `${BASE_URL}/portada-sumaq.jpg`,
  `${BASE_URL}/portada-sumaq.png`,
  `${BASE_URL}/portada-sumaq.jpeg`,
  `${BASE_URL}/portada-sumaq-allpa.webp`,
  `${BASE_URL}/portada-sumaq-allpa.jpg`,
  `${BASE_URL}/portada-sumaq-allpa.png`,
  `${BASE_URL}/portada-sumaq-allpa.jpeg`,
].map((u) => encodeUriBajo(u));
const CARTA_CANDIDATOS = [
  `${BASE_URL}/carta.pdf`,
  `${BASE_URL}/carta-sumaq-allpa.pdf`,
  `${BASE_URL}/menu.pdf`,
  `${BASE_URL}/CARTA SUMAQ ALLPA.pdf`,
  `${BASE_URL}/CARTA SUMAQ ALLPA....pdf`,
  `${BASE_URL}/CARTA SUMAQ ALLPA….pdf`,
  `${BASE_URL}/CARTA SUMAQ ALLPA ...pdf`,
  `${BASE_URL}/CARTA SUMAQ ALLPA ….pdf`,
  `${BASE_URL}/CARTA.pdf`,
  `${BASE_URL}/Carta.pdf`,
  `${BASE_URL}/Menu.pdf`,
].map((u) => encodeUriBajo(u));

function probeUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
async function findFirstAsset(candidatos: string[], checkType: 'image' | 'any'): Promise<string | null> {
  if (checkType === 'image') {
    for (const c of candidatos) {
      const r = await probeUrl(c);
      if (r) return r;
    }
    return null;
  }
  for (const c of candidatos) {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const signal = controller?.signal;
      const timer = controller ? window.setTimeout(() => controller.abort(), 2500) : 0;
      const resp = await fetch(c, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'follow',
        headers: { Range: 'bytes=0-1' },
        ...(signal ? { signal } : {}),
      });
      window.clearTimeout(timer);
      if (resp.ok || resp.status === 206 || resp.status === 416) return c;
    } catch {
      continue;
    }
  }
  return null;
}

interface DashboardKpiItem {
  id: string;
  label: string;
  value: number;
  badge?: string;
  icon: string;
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
  const [portadaSrc, setPortadaSrc] = useState<string | null>(null);
  const [cartaHref, setCartaHref] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    findFirstAsset(PORTADA_CANDIDATOS, 'image').then((url) => alive && setPortadaSrc(url));
    findFirstAsset(CARTA_CANDIDATOS, 'any').then((url) => alive && setCartaHref(url));
    return () => { alive = false; };
  }, []);

  const dashboardItems: DashboardKpiItem[] = [
    { id: 'kpi-llegadas', label: 'Llegadas hoy', value: 0, icon: people, color: 'primary' },
    { id: 'kpi-salidas', label: 'Salidas hoy', value: 0, icon: trendingUp, color: 'warning' },
    { id: 'kpi-hab', label: 'Habitaciones ocupadas', value: 0, badge: '/5', icon: bed, color: 'tertiary' },
    { id: 'kpi-com', label: 'Comandas activas', value: 0, icon: restaurant, color: 'success' },
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

        {portadaSrc && (
          <IonCard className="portada-card">
            <div className="portada-wrap">
              <IonImg src={portadaSrc} alt="Portada Casa Sumaq Allpa" className="portada-img" />
              <div className="portada-overlay">
                <div className="portada-titulo">Casa Sumaq Allpa</div>
                <div className="portada-sub">Sistema de Gestión Hotelera</div>
              </div>
            </div>
          </IonCard>
        )}

        <IonItem lines="none" className="ion-margin-bottom">
          <IonLabel>
            <h2 className="ion-text-capitalize">{today}</h2>
            <p>Bienvenido(a) al panel de gestión.</p>
          </IonLabel>
          {cartaHref && (
            <IonButton
              slot="end"
              size="default"
              color="secondary"
              onClick={() => window.open(cartaHref, '_blank', 'noopener,noreferrer')}
            >
              <IonIcon slot="start" icon={documentText} />
              Ver carta
            </IonButton>
          )}
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
                </IonCard>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>

        <IonCard className="ion-margin-top">
          <IonCardHeader>
            <IonCardTitle>Instrucciones rápidas</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <ul className="home-ul">
              <li><strong>📸 Portada/Logo:</strong> Guarda la imagen en <code>public/portada.jpg</code> (o .png / .webp) y aparecerá automáticamente arriba. No usar carpeta <code>dist/</code>, se borra en cada build.</li>
              <li><strong>📄 Carta del lodge:</strong> Guarda el PDF en <code>public/carta.pdf</code> para que aparezca el botón "Ver carta" arriba.</li>
              <li><strong>🛏️ Operación diaria:</strong> Todo desde la pestaña <strong>Habitaciones</strong>. POS para clientes eventuales walk-in.</li>
              <li><strong>💾 Base de datos SQL:</strong> Usa <code>npm run db:migrate -- --file tu_migracion.sql</code> (sin popup Run/Skip).</li>
            </ul>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
