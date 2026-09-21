# Casa Sumaq Allpa — Sistema de Gestión para Lodge

PWA construida con **Ionic + React + TypeScript + Vite** y **vite-plugin-pwa** (Service Worker + Manifest + Modo Offline).

## Estructura del proyecto (alineada a las 8 Etapas)

```
├── docs/                           Documentación del sistema (PDF/MD)
├── public/                         Archivos estáticos (favicon, manifest, icons)
├── src/
│   ├── main.tsx                    Punto de entrada
│   ├── App.tsx                     Router + Tabs principales
│   ├── theme/                      variables.css, global.css (diseño responsive 100%)
│   ├── pages/
│   │   ├── Home/                   Dashboard principal (resumen diario)
│   │   ├── Reservas/               Etapa 1.4 (mock)
│   │   ├── Habitaciones/           Etapa 1.1 (plano responsive)
│   │   ├── Pos/                    Etapa 2.5 POS F&B (mesas + comandas mock)
│   │   └── Perfil/                 Sesión activa (badge iniciales)
│   └── vite-env.d.ts
├── index.html                      Viewport MÓVIL 100% (no espacios muertos)
├── vite.config.ts                  PWA + Service Worker + GitHub Pages (base: './')
├── tsconfig.json                   TypeScript estricto
└── package.json
```

## Scripts

```bash
npm install           # instalar dependencias
npm run dev           # modo desarrollo en http://localhost:8100
npm run build         # build producción PWA → carpeta dist/
npm run preview       # previsualizar build local
```

## Despliegue en GitHub Pages (tu flujo habitual)

1. **Build:**
   ```bash
   npm run build
   ```
2. **Solo una vez — publicar carpeta `dist/` a la rama `gh-pages` (2 opciones):**
   - Opción A: copiar el contenido de `dist/` a la rama `gh-pages` y hacer push.
   - Opción B (recomendado): con `gh-pages` CLI:
     ```bash
     npm install -g gh-pages
     gh-pages -d dist
     ```
3. En GitHub → Settings → Pages → Source: **Deploy from branch** → `gh-pages` / `root`.
4. **Validación:** Abre la URL publicada y presiona **Ctrl+Shift+R** para recarga sin caché.

## Responsive: breakpoints usados (Ionic estándar)

| Tamaño | Nombre | Uso típico |
|---|---|---|
| < 576px | xs | Celulares |
| ≥ 576px | sm | Celulares grandes |
| ≥ 768px | md | Tablets |
| ≥ 992px | lg | Laptops |
| ≥ 1200px | xl | PC escritorio / KDS cocina |

## Seguridad de sesión

Antes de cualquier operación crítica, **el frontend mostrará el badge de iniciales del usuario
activo en la esquina superior derecha** (Perfil / Header) para validar identidad, tal como se
definió en las restricciones del proyecto.
