import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonImg,
  IonIcon,
} from '@ionic/react';
import type { Color } from '@ionic/core';
import { people, bed, restaurant, trendingUp } from 'ionicons/icons';
import type { Usuario } from '../../types';
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

  useEffect(() => {
    let alive = true;
    findFirstAsset(PORTADA_CANDIDATOS, 'image').then((url) => alive && setPortadaSrc(url));
    return () => { alive = false; };
  }, []);

  const dashboardItems: DashboardKpiItem[] = [
    { id: 'kpi-llegadas', label: 'Llegadas hoy',    value: 0,           icon: people,      color: 'primary' },
    { id: 'kpi-salidas',  label: 'Salidas hoy',     value: 0,           icon: trendingUp,  color: 'warning' },
    { id: 'kpi-hab',      label: 'Hab. ocupadas',   value: 0, badge:'/5', icon: bed,         color: 'tertiary' },
    { id: 'kpi-com',      label: 'Comandas activas',value: 0,           icon: restaurant,  color: 'success' },
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
    <IonPage className="home-page">
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Casa Sumaq Allpa</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen scrollY={false} className="home-content">
        {portadaSrc && (
          <div className="portada-wrap">
            <IonImg src={portadaSrc} alt="Portada Casa Sumaq Allpa" className="portada-img" />
            <div className="portada-overlay">
              <div className="portada-titulo">Casa Sumaq Allpa</div>
              <div className="portada-sub">Sistema de Gestión Hotelera</div>
            </div>

            {/* ============ KPIS DENTRO DE LA PORTADA, EN LA FRANJA BLANCA DERECHA (RECTANGULO AZUL) ============ */}
            <div className="portada-kpis-col">
              {dashboardItems.map((item) => (
                <div key={item.id} className={`pkpi-card pkpi-${item.color}`}>
                  <div className="pkpi-top">
                    <IonIcon icon={item.icon} color="light" className="pkpi-icon" />
                    <div className="pkpi-value">
                      {item.value}
                      {item.badge ? <span className="pkpi-badgesub">{item.badge}</span> : null}
                    </div>
                  </div>
                  <div className="pkpi-label">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="today-row today-row-slim">
          <div className="today-text">
            <div className="today-date ion-text-capitalize">{today}</div>
            <div className="today-sub">Bienvenido(a) al panel de gestión.</div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
