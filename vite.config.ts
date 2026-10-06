import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  base: '/casasumaqallpa/',
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          ionic: ['@ionic/react', '@ionic/react-router', 'ionicons/icons'],
        },
      },
    },
  },
});
