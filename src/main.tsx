import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';
import './theme/global.css';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error('[ErrorBoundary] React render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      return (
        <div style={{
          position: 'fixed', inset: 0, background: '#1a1a1a', color: '#fff',
          fontFamily: 'monospace', padding: 20, overflow: 'auto', zIndex: 999999,
        }}>
          <h2 style={{ color: '#ef4444', margin: '0 0 12px' }}>⚠️ Error de renderizado</h2>
          <div style={{ background: '#2a2a2a', padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <strong>Mensaje:</strong><br />
            <span style={{ color: '#fca5a5' }}>{err?.message || String(err)}</span>
          </div>
          {err?.stack && (
            <pre style={{ background: '#0d0d0d', padding: 12, borderRadius: 8, fontSize: 11, whiteSpace: 'pre-wrap' }}>
              {String(err.stack)}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          >
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('No se encontró el elemento #root en index.html');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
