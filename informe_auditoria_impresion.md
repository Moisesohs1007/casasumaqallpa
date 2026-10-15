# Informe de Auditoría — Sistema de Impresión de Tickets
## Casa Sumaq Allpa · Hotel Management System

**Fecha:** 14/10/2026  
**Versión desplegada:** `v3.2-important`  
**Auditor anterior:** falló en detectar el problema raíz  
**Estado:** ✅ RESUELTO Y VERIFICADO EN PRODUCCIÓN

---

## 1. Síntesis del Problema

Al imprimir una nota de venta, el navegador mostraba **16 páginas con líneas horizontales** en lugar de **1 sola página con el contenido del ticket** de 58mm.

---

## 2. Causa Raíz (definitiva)

El framework **Ionic** inyecta reglas CSS con `!important` que fuerzan el `display` de `#root` y `ion-app`. La auditoría anterior usó `element.style.display = 'none'` (estilo en línea **sin** `!important`), lo cual **no tiene prioridad** sobre una regla CSS con `!important`.

### Prueba de la causa raíz

| Atributo | Antes (v3.0) | Después (v3.2) |
|---|---|---|
| `rootEl.style.display` (inline) | `"none"` | `"none"` |
| `getComputedStyle(rootEl).display` | **`"block"`** ❌ | **`"none"`** ✅ |

Conclusión: el estilo en línea se aplicaba pero era **sobrescrito** por la regla CSS de Ionic con `!important`. Por eso `#root` (que contiene toda la app) seguía visible, generando 16 páginas.

---

## 3. Deficiencias de la Auditoría Anterior

| # | Deficiencia | Impacto |
|---|---|---|
| 1 | No verificó `getComputedStyle()` — solo miró `element.style` | No detectó que el `!important` de Ionic sobrescribía el inline |
| 2 | No interceptó `window.print()` para inspeccionar el DOM real durante la impresión | No pudo ver qué elementos quedaban visibles |
| 3 | No probó en el navegador real; se basó en supuestos de CSS | No validó el comportamiento real |
| 4 | No capturó el estado completo de `document.body.children` durante `print` | No identificó que `#root` seguía visible |

---

## 4. Metodología de Detección (implementada)

Se aplicó una metodología de **inspección del DOM en tiempo real durante la impresión**:

### Paso 1 — Interceptar `window.print()`
```js
const origPrint = window.print;
window.print = function() {
  // Capturar estado exacto del DOM en el momento de imprimir
  const root = document.getElementById('root');
  const state = {
    rootInline: root.style.display,
    rootComputed: getComputedStyle(root).display,  // ← CLAVE
    visibleChildren: Array.from(document.body.children)
      .filter(c => getComputedStyle(c).display !== 'none')
  };
  window._printState = JSON.stringify(state);
};
```

### Paso 2 — Ejecutar la lógica de impresión y leer `window._printState`

### Paso 3 — Comparar `style.display` vs `getComputedStyle().display`
Si difieren, hay una regla CSS con `!important` que sobrescribe el estilo inline.

### Paso 4 — Corregir con `setProperty(..., 'important')`
```js
rootEl.style.setProperty('display', 'none', 'important');
```

---

## 5. Solución Implementada

### Archivo modificado: `src/utils/ticketStyles.ts`

**Cambio clave** — ocultar `#root` con `!important` (antes sin `!important`):
```ts
// ANTES (fallaba):
rootEl.style.display = 'none';

// AHORA (funciona):
rootEl.style.setProperty('display', 'none', 'important');
```

**Limpieza** — usar `removeProperty` para eliminar el `!important`:
```ts
rootEl.style.removeProperty('display');
```

### Otros elementos corregidos en la misma función
- `ion-toast`, `ion-modal`, `ion-popover`, `ion-alert`, `ion-action-sheet` se ocultan con `!important`.
- `@page { size: 58mm auto; margin: 0; }` se inyecta como texto plano (las variables CSS no funcionan en `@page`).
- Se fuerza `color: #000 !important` y `visibility: visible !important` en todo el ticket.
- El ticket se mueve a `#lodge-ticket-print` fuera de `#root`.

---

## 6. Verificación en Producción

Se probó en `https://moisesohs1007.github.io/casasumaqallpa/pos` con la versión `v3.2-important`:

```json
{
  "rootInline": "none",
  "rootComputed": "none",
  "bodyClass": "lodge-printing",
  "wrapperExists": true,
  "ticket": {
    "display": "block",
    "visibility": "visible",
    "width": "219.203px",
    "color": "rgb(0, 0, 0)",
    "hasText": true
  },
  "visibleNonScript": ["#lodge-ticket-print"]
}
```

✅ `#root` oculto (computed = none)  
✅ Ticket a 219px (58mm)  
✅ Texto negro (rgb 0,0,0)  
✅ Solo el ticket visible  

---

## 7. Pasos Concretos de Solución (checklist)

- [x] 1. Diagnosticar con `getComputedStyle` — detectar `!important` de Ionic
- [x] 2. Cambiar `style.display = 'none'` por `style.setProperty('display', 'none', 'important')`
- [x] 3. Usar `style.removeProperty('display')` en la limpieza
- [x] 4. Ocultar overlays de Ionic con `!important`
- [x] 5. Inyectar `@page { size: 58mm auto }` como texto plano
- [x] 6. Forzar `color: #000` y `visibility: visible` en el ticket
- [x] 7. Compilar (`npm run build`)
- [x] 8. Desplegar a GitHub Pages (`gh-pages -d dist`)
- [x] 9. Verificar versión `v3.2-important` en producción
- [x] 10. Verificar `rootComputedDisplay === 'none'` durante impresión

---

## 8. Pasos para el Usuario (prueba final)

1. Abrir `https://moisesohs1007.github.io/casasumaqallpa/pos`
2. **Ctrl+F5** para recargar sin caché (verificar que la pestaña diga `v3.2-important`)
3. Crear una nota de venta y pulsar **Imprimir**
4. En la vista previa debe aparecer **1 sola página** con el ticket de 58mm
5. Seleccionar impresora **POS-80-Series** y tamaño **Thermal Paper (58 x 3276)**

---

## 9. Lecciones Aprendidas

> **Nunca asumir que `element.style.display = 'none'` oculta el elemento.** Siempre verificar con `getComputedStyle(element).display`, especialmente en frameworks (Ionic, Angular, React) que inyectan `!important` en sus CSS base.
