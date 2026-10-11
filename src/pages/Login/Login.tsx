import React, { useState } from 'react';
import {
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonSpinner,
  IonIcon,
  IonToast,
} from '@ionic/react';
import { lockClosed, person, eye, eyeOff, logIn } from 'ionicons/icons';
import { AuthService, type SesionUsuario } from '../../services';

interface LoginPageProps {
  onLoginOk: (usuario: SesionUsuario) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginOk }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!username.trim() || !password) {
      setError('Ingresa nombre de usuario y contraseña.');
      return;
    }
    setProcesando(true);
    try {
      const res = await AuthService.login(username, password);
      if (res.ok && res.usuario) {
        onLoginOk(res.usuario);
      } else {
        setError(res.error || 'No se pudo iniciar sesión.');
      }
    } catch (e: any) {
      setError(e?.message || 'Error de conexión.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <IonContent fullscreen className="login-content">
      <div className="login-wrapper">
        <div className="login-logo">
          <div className="login-logo-circle">
            <IonIcon icon={logIn} style={{ fontSize: 48, color: '#fff' }} />
          </div>
        </div>

        <IonCard className="login-card">
          <IonCardHeader>
            <IonCardTitle className="login-title">Casa Sumaq Allpa</IonCardTitle>
            <IonLabel className="login-subtitle">Sistema de Gestión Hotelera</IonLabel>
          </IonCardHeader>

          <IonCardContent>
            <IonItem className="login-item">
              <IonIcon icon={person} slot="start" style={{ color: '#10b981' }} />
              <IonInput
                placeholder="Nombre de usuario"
                value={username}
                onIonInput={(e) => setUsername((e.target as HTMLIonInputElement).value as string)}
                clearInput
                autocapitalize="off"
                spellcheck={false}
              />
            </IonItem>

            <IonItem className="login-item">
              <IonIcon icon={lockClosed} slot="start" style={{ color: '#10b981' }} />
              <IonInput
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onIonInput={(e) => setPassword((e.target as HTMLIonInputElement).value as string)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLogin();
                }}
              />
              <IonButton
                fill="clear"
                slot="end"
                onClick={() => setShowPassword(!showPassword)}
                style={{ color: '#6b7280' }}
              >
                <IonIcon icon={showPassword ? eyeOff : eye} />
              </IonButton>
            </IonItem>

            {error && (
              <div className="login-error">
                <IonIcon icon={lockClosed} style={{ marginRight: 6 }} />
                {error}
              </div>
            )}

            <IonButton
              expand="block"
              className="login-btn"
              onClick={handleLogin}
              disabled={procesando}
            >
              {procesando ? (
                <IonSpinner name="crescent" />
              ) : (
                'Iniciar Sesión'
              )}
            </IonButton>

            <div className="login-hint">
              Usuario por defecto: <strong>Admin</strong> / <strong>Admin123</strong>
            </div>
          </IonCardContent>
        </IonCard>
      </div>

      <style>{`
        .login-content {
          --background: linear-gradient(160deg, #064e3b 0%, #065f46 40%, #047857 100%);
        }
        .login-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .login-logo {
          margin-bottom: 24px;
        }
        .login-logo-circle {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          border-radius: 16px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }
        .login-card ion-card-header {
          padding-bottom: 0;
          text-align: center;
        }
        .login-title {
          font-size: 22px;
          font-weight: 800;
          color: #065f46;
          margin: 0;
        }
        .login-subtitle {
          font-size: 12px;
          color: #6b7280;
          text-align: center;
          width: 100%;
          display: block;
          margin-top: 4px;
        }
        .login-item {
          --padding-start: 0;
          --inner-padding-end: 0;
          margin-bottom: 8px;
        }
        .login-error {
          background: #fef2f2;
          color: #b91c1c;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
          margin: 12px 0;
          display: flex;
          align-items: center;
          border: 1px solid #fecaca;
        }
        .login-btn {
          --background: linear-gradient(135deg, #10b981, #059669);
          --background-hover: linear-gradient(135deg, #059669, #047857);
          --border-radius: 10px;
          height: 48px;
          font-weight: 700;
          margin-top: 8px;
        }
        .login-hint {
          text-align: center;
          font-size: 11px;
          color: #9ca3af;
          margin-top: 16px;
        }
      `}</style>
    </IonContent>
  );
};

export default LoginPage;
