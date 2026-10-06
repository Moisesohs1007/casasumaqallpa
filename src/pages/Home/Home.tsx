import React, { useMemo } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
  IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent,
  IonBadge, IonLabel, IonItem, IonButton, IonIcon, IonGrid, IonRow, IonCol,
} from '@ionic/react';
import { calendarNumber, bed, restaurantOutline, personCircle, restaurant, cartOutline, build } from 'ionicons/icons';
import './Home.css';

const LOGO_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 750">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9fd8ff"/>
      <stop offset="100%" stop-color="#e5f4ff"/>
    </linearGradient>
  </defs>
  <rect x="320" y="60" width="960" height="380" rx="190" fill="url(#sky)"/>
  <!-- Nevados -->
  <polygon points="600,320 720,130 840,320" fill="#f7f9fc" stroke="#c5d0dd" stroke-width="3"/>
  <polygon points="720,130 760,180 800,140 810,200 720,130" fill="#1e3a8a" opacity="0.45"/>
  <polygon points="870,320 1020,140 1170,320" fill="#f7f9fc" stroke="#c5d0dd" stroke-width="3"/>
  <polygon points="1020,140 1060,190 1110,150 1140,210 1020,140" fill="#1e3a8a" opacity="0.45"/>
  <!-- Roca escalada -->
  <path d="M400,410 Q420,200 560,180 L600,420 Z" fill="#d7c19a" stroke="#9a825d" stroke-width="3"/>
  <line x1="520" y1="270" x2="460" y2="280" stroke="#222" stroke-width="3"/>
  <circle cx="462" cy="288" r="2" fill="#222"/>
  <!-- Escalador -->
  <circle cx="450" cy="265" r="16" fill="#1e1b4b"/>
  <rect x="444" y="280" width="18" height="28" rx="4" fill="#2563eb"/>
  <rect x="460" y="290" width="14" height="28" rx="4" fill="#1e293b" transform="rotate(18 467 304)"/>
  <rect x="438" y="308" width="12" height="26" rx="3" fill="#1e293b" transform="rotate(-20 444 321)"/>
  <rect x="450" y="248" width="10" height="22" rx="3" fill="#f59e0b" transform="rotate(30 455 259)"/>
  <rect x="468" y="244" width="10" height="22" rx="3" fill="#f59e0b" transform="rotate(-25 473 255)"/>
  <!-- Casa -->
  <polygon points="700,410 890,340 1080,410 1080,500 700,500" fill="#f3d7a2" stroke="#6b4a1b" stroke-width="4"/>
  <polygon points="690,408 890,330 1090,408" fill="#c78d2c" stroke="#6b4a1b" stroke-width="4"/>
  <line x1="750" y1="358" x2="750" y2="410" stroke="#6b4a1b" stroke-width="3"/>
  <line x1="830" y1="356" x2="830" y2="410" stroke="#6b4a1b" stroke-width="3"/>
  <line x1="970" y1="356" x2="970" y2="410" stroke="#6b4a1b" stroke-width="3"/>
  <line x1="1030" y1="358" x2="1030" y2="410" stroke="#6b4a1b" stroke-width="3"/>
  <rect x="755" y="418" width="120" height="70" fill="#eaf2ff" stroke="#334155" stroke-width="3"/>
  <line x1="815" y1="418" x2="815" y2="488" stroke="#334155" stroke-width="3"/>
  <line x1="755" y1="453" x2="875" y2="453" stroke="#334155" stroke-width="3"/>
  <rect x="910" y="418" width="120" height="70" fill="#eaf2ff" stroke="#334155" stroke-width="3"/>
  <line x1="970" y1="418" x2="970" y2="488" stroke="#334155" stroke-width="3"/>
  <line x1="910" y1="453" x2="1030" y2="453" stroke="#334155" stroke-width="3"/>
  <rect x="696" y="500" width="388" height="18" fill="#a16207" stroke="#6b4a1b" stroke-width="3"/>
  <rect x="696" y="518" width="388" height="22" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>
  <!-- Chimenea -->
  <rect x="648" y="350" width="40" height="70" fill="#e5e7eb" stroke="#64748b" stroke-width="3"/>
  <!-- Arboles -->
  <g>
    <circle cx="1120" cy="420" r="56" fill="#15803d"/>
    <circle cx="1172" cy="400" r="62" fill="#166534"/>
    <circle cx="1218" cy="440" r="50" fill="#15803d"/>
    <rect x="1155" y="460" width="14" height="48" fill="#78350f"/>
    <circle cx="1280" cy="480" r="34" fill="#166534"/>
    <circle cx="1320" cy="472" r="30" fill="#15803d"/>
    <rect x="1295" y="505" width="10" height="30" fill="#78350f"/>
    <circle cx="1362" cy="488" r="26" fill="#166534"/>
    <rect x="1370" y="509" width="8" height="26" fill="#78350f"/>
  </g>
  <!-- Hojas arco izq -->
  <g transform="translate(40,40)">
    <path d="M20,380 Q-10,200 160,80" fill="none" stroke="#7c2d12" stroke-width="10" stroke-linecap="round"/>
    <g fill="#166534">
      <ellipse cx="30" cy="320" rx="16" ry="8" transform="rotate(35 30 320)"/>
      <ellipse cx="55" cy="270" rx="18" ry="9" transform="rotate(55 55 270)"/>
      <ellipse cx="85" cy="228" rx="18" ry="9" transform="rotate(70 85 228)"/>
      <ellipse cx="122" cy="190" rx="18" ry="9" transform="rotate(85 122 190)"/>
      <ellipse cx="160" cy="158" rx="18" ry="9" transform="rotate(100 160 158)"/>
      <ellipse cx="18" cy="372" rx="14" ry="7" transform="rotate(20 18 372)"/>
    </g>
    <g fill="#fb923c"><circle cx="34" cy="365" r="12"/><circle cx="110" cy="186" r="12"/><circle cx="184" cy="140" r="12"/></g>
    <g fill="#fde68a" opacity="0.7"><circle cx="33" cy="366" r="5"/><circle cx="109" cy="187" r="5"/><circle cx="183" cy="141" r="5"/></g>
    <!-- Ramas -->
    <path d="M70,280 L130,300" stroke="#7c2d12" stroke-width="4" stroke-linecap="round"/>
    <g fill="#15803d">
      <ellipse cx="130" cy="292" rx="15" ry="8" transform="rotate(20 130 292)"/>
      <ellipse cx="148" cy="308" rx="14" ry="7" transform="rotate(10 148 308)"/>
      <ellipse cx="112" cy="312" rx="14" ry="7" transform="rotate(-30 112 312)"/>
    </g>
  </g>
  <!-- Hojas arco der -->
  <g transform="translate(1150,40)">
    <path d="M380,380 Q410,200 240,80" fill="none" stroke="#7c2d12" stroke-width="10" stroke-linecap="round"/>
    <g fill="#166534">
      <ellipse cx="370" cy="320" rx="16" ry="8" transform="rotate(-35 370 320)"/>
      <ellipse cx="345" cy="270" rx="18" ry="9" transform="rotate(-55 345 270)"/>
      <ellipse cx="315" cy="228" rx="18" ry="9" transform="rotate(-70 315 228)"/>
      <ellipse cx="278" cy="190" rx="18" ry="9" transform="rotate(-85 278 190)"/>
      <ellipse cx="240" cy="158" rx="18" ry="9" transform="rotate(-100 240 158)"/>
      <ellipse cx="382" cy="372" rx="14" ry="7" transform="rotate(-20 382 372)"/>
    </g>
    <g fill="#fb923c"><circle cx="366" cy="365" r="12"/><circle cx="290" cy="186" r="12"/><circle cx="216" cy="140" r="12"/></g>
    <g fill="#fde68a" opacity="0.7"><circle cx="367" cy="366" r="5"/><circle cx="291" cy="187" r="5"/><circle cx="217" cy="141" r="5"/></g>
    <path d="M330,280 L270,300" stroke="#7c2d12" stroke-width="4" stroke-linecap="round"/>
    <g fill="#15803d">
      <ellipse cx="270" cy="292" rx="15" ry="8" transform="rotate(-20 270 292)"/>
      <ellipse cx="252" cy="308" rx="14" ry="7" transform="rotate(-10 252 308)"/>
      <ellipse cx="288" cy="312" rx="14" ry="7" transform="rotate(30 288 312)"/>
    </g>
  </g>
  <!-- Texto Sumaq Allpa -->
  <text x="800" y="660" font-family="Georgia, serif" font-style="italic" font-size="130" font-weight="700" text-anchor="middle" fill="#0f172a" stroke="#0f172a" stroke-width="1">
    Sumaq Allpa
  </text>
</svg>
`);

const Home: React.FC = () => {
  const today = useMemo(() => new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), []);
  const ocupadas = 0;
  const totalHab = 5;
  const comandasActivas = 0;
  const llegadasHoy = 0;
  const salidasHoy = 0;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="success">
          <IonTitle>Inicio</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="home-page">
        <div className="home-logo-wrap">
          <img src={LOGO_SVG} alt="Sumaq Allpa" className="home-logo" />
          <h1 className="home-subtitle">Casa Sumaq Allpa</h1>
          <p className="home-fecha">{today}</p>
          <p className="home-lead">Panel de gestión — recepción en vivo.</p>
        </div>

        <IonGrid className="home-kpis">
          <IonRow>
            <IonCol size="6">
              <IonCard className="kpi-card kpi-hab">
                <IonCardHeader>
                  <IonCardSubtitle><IonIcon icon={bed} /> Habitaciones ocupadas</IonCardSubtitle>
                  <IonCardTitle className="kpi-value">{ocupadas} / {totalHab}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>Toca para ver el detalle</IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="6">
              <IonCard className="kpi-card kpi-com">
                <IonCardHeader>
                  <IonCardSubtitle><IonIcon icon={restaurantOutline} /> Comandas activas</IonCardSubtitle>
                  <IonCardTitle className="kpi-value">{comandasActivas}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>Toca para ver el detalle</IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="6">
              <IonCard className="kpi-card kpi-ll">
                <IonCardHeader>
                  <IonCardSubtitle><IonIcon icon={calendarNumber} /> Llegadas hoy</IonCardSubtitle>
                  <IonCardTitle className="kpi-value">{llegadasHoy}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>Toca para ver el detalle</IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="6">
              <IonCard className="kpi-card kpi-sa">
                <IonCardHeader>
                  <IonCardSubtitle><IonIcon icon={calendarNumber} /> Salidas hoy</IonCardSubtitle>
                  <IonCardTitle className="kpi-value">{salidasHoy}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>Toca para ver el detalle</IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>

        <IonGrid className="home-shortcuts">
          <IonRow>
            <IonCol size="6">
              <IonButton expand="block" fill="outline" color="success" routerLink="/reservas">
                <IonIcon slot="start" icon={calendarNumber} /> Reservas
              </IonButton>
            </IonCol>
            <IonCol size="6">
              <IonButton expand="block" fill="outline" color="tertiary" routerLink="/habitaciones">
                <IonIcon slot="start" icon={bed} /> Habitaciones
              </IonButton>
            </IonCol>
            <IonCol size="6">
              <IonButton expand="block" fill="outline" color="warning" routerLink="/pos">
                <IonIcon slot="start" icon={restaurant} /> POS Walk-in
              </IonButton>
            </IonCol>
            <IonCol size="6">
              <IonButton expand="block" fill="outline" color="medium" routerLink="/perfil">
                <IonIcon slot="start" icon={build} /> Inventario / Admin
              </IonButton>
            </IonCol>
          </IonRow>
        </IonGrid>

        <div className="home-pad"></div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
