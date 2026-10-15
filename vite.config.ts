import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { execSync } from 'child_process';

// Versión base (mantener actualizada manualmente en cambios mayores)
const VERSION_BASE = 'v3.0';

// Build timestamp (fecha + hora del build) — cambia en cada deploy
const buildTime = new Date();
const buildDate = buildTime.toISOString().slice(0, 10);
const buildHour = buildTime.toISOString().slice(11, 16).replace(':', 'h');

// Git commit hash corto (si está disponible)
let commitHash = '';
try {
  commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch {
  commitHash = 'local';
}

const APP_VERSION = `${VERSION_BASE}-${buildDate}-${buildHour}h-${commitHash}`;

export default defineConfig({
  base: '/casasumaqallpa/',
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __BUILD_TIME__: JSON.stringify(buildTime.toISOString()),
  },
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],
  server: {
    host: true,
    port: 8100,
    open: false,
  },
});
