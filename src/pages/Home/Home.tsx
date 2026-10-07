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
import { useHistory } from 'react-router-dom';
import { home, calendar, bed, restaurant, personCircle } from 'ionicons/icons';
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

interface NavButtonItem {
  id: string;
  label: string;
  route: string;
  icon: string;
  colorClass: string;
}

interface HomePageProps {}

const HomePage: React.FC<HomePageProps> = () => {
  const history = useHistory();
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

  const navButtons: NavButtonItem[] = [
    { id: 'nav-inicio',      label: 'Inicio',        route: '/home',         icon: home,          colorClass: 'nv-inicio' },
    { id: 'nav-reservas',    label: 'Reservas',      route: '/reservas',     icon: calendar,      colorClass: 'nv-reservas' },
    { id: 'nav-habitac',     label: 'Habitaciones',  route: '/habitaciones', icon: bed,           colorClass: 'nv-habitac' },
    { id: 'nav-pos',         label: 'POS',           route: '/pos',          icon: restaurant,    colorClass: 'nv-pos' },
    { id: 'nav-perfil',      label: 'Perfil',        route: '/perfil',       icon: personCircle,  colorClass: 'nv-perfil' },
  ];

  const goTo = (route: string) => {
    history.push(route);
  };

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
        {/* ============ PORTADA GIGANTE, SIN OVERLAY, SIN BOTONES ADENTRO ============ */}
        {portadaSrc && (
          <div className="portada-wrap">
            <IonImg src={portadaSrc} alt="Portada Casa Sumaq Allpa" className="portada-img" />
          </div>
        )}

        {/* ============ 5 BOTONES NAV · FILA HORIZONTAL, DEBAJO DE LA PORTADA ============ */}
        <div className="home-nav-row">
          {navButtons.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`nv-card ${b.colorClass}`}
              onClick={() => goTo(b.route)}
            >
              <IonIcon icon={b.icon} color="light" className="nv-icon" />
              <div className="nv-label">{b.label}</div>
            </button>
          ))}
        </div>

        {/* ============ FECHA HOY ============ */}
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
