# Fix Persistencia Total + Módulo Stock Completo — Implementation Plan

## Repository Research (Causas Raíz 100% CONFIRMADAS)

### 🏗️ Arquitectura Double DB actual:
1. **`__db__.ts InMemoryDB` (sync RAM local):** Constructor inicializa las 17 colecciones con `__seed__.ts` hardcodeado **EN CADA BOOT** (F5, cerrar/abrir Chrome). Si no hay una hidratación previa desde Supabase, el seed vacío **PISA** TODO cambio.
2. **`__supabase_db__.ts SupabaseDB` (async cloud):** Singleton que usa `@supabase/supabase-js` con anon key + VITE vars.
3. **Patrón dual-write:** Métodos mutadores = escribir `db` (sync UI) + disparar `dbRemota.*Async` fire-and-forget catch logs. **ESTE PATRÓN SÓLO ESTÁ IMPLEMENTADO EN 2 SERVICIOS.** El resto escribe SÓLO RAM.
4. **Hidratación boot `App.tsx` useEffect:** SOLO hidrata `HabitacionService.hidratarDesdeSupabase` + `ReservaService.hidratarDesdeSupabase` (commit d670184). Los otros 15 módulos NUNCA hidratan.

### 🐛 BUG #1 Persistencia (ROOT CAUSE):
Servicios **SIN dual-write y SIN boot hidratación** (TODO cambio desaparece al cerrar Chrome):
- ❌ **FolioService** (FOLIOS, recalc totales, abrir/cerrar)
- ❌ **CargoFolioService** (crear/actualizar/anular cargos del huésped)
- ❌ **PagoFolioService** (crear pagos en el folio — 13 métodos pago!)
- ❌ **HuespedService** (crear/actualizar/eliminar/incrementarVisita — clientes!)
- ❌ **PosService / MesaService / ComandaService + Detalles** (POS walk-in, Room Service comandas)
- ❌ **TarifaService (Tarifas)** + **TemporadaService** + **PoliticaCancelacionService** + **CodigoPromocionalService** (CRUDs)
- ❌ **CatalogoFBService (Productos F&B)** + **CategoriaFB** + **PresentacionesProducto** + **ModificadoresGrupo** + **Alergenos**

**BUG #1b adicional:** Whitelist columnas en `__supabase_db__.ts` solo existen para `reservas` + `habitaciones`. El resto de tablas si envían columnas que no existen en schema físico → HTTP 400 API REST.
**Solución #1b:** Migrar a mecanismo **genérico de whitelist + JSONB payload auto-merge** (igual que habitaciones; normalizeRow expande payload). Cada tabla con whitelist explícito de columnas físicas reales.

### 📦 BUG #2 Stock (ROOT CAUSE):
1. **Schema SQL:** Tablas `categorias_fb` / `productos_fb` / `presentaciones_fb` / `modificadores_fb` / `alergenos` SÍ existen. `presentaciones_fb.stock_control BOOLEAN L80` existe, pero **NO hay columna `stock_actual`**, `stock_minimo`, `costo_unitario`, ni tabla `movimientos_stock`.
2. **CatalogoFBService:** SOLO tiene métodos de lectura `listarCategorias / listarProductos / buscarProductoPorId / etc`. 0 métodos mutadores.
3. **UI Perfil Admin:** SÓLO hay IonModal CRUD para `Tipos Hab / Habitaciones`. NINGUNA sección Productos / Stock.
4. **PosService (agregar detalle a comanda):** NINGUNA línea descuenta stock.
5. **Seed productos:** Se inicializa en seed local pero NUNCA se sube a BD (sin dual-write).
**Solución #2:** Guardar `stockActual / stockMinimo / costoUnitario / ultimaActualizacionStock` dentro del `payload JSONB` de `productos_fb` o `presentaciones_fb` (evita ALTER TABLE + HTTP 400); agregar CRUD UI en Perfil Admin nueva sección "Gestión Productos & Stock"; al confirmar venta en POS o Room Service, si `stockControl=true` descontar stock y guardar movimiento en payload.

## Files and Modules (Dependencias claras)

| # | Archivo | Cambio esperado |
|---|---------|-----------------|
| 1 | `src/services/__supabase_db__.ts` | Agregar whitelist genérico para TODAS las tablas; agregar `removeAsync` si falta; ensure `addAsync/updateAsync` para todas las tablas usan whitelist + payload auto-merge; agregar `TABLE` mappings para categoriasFB/productosFB/presentacionesFB/modificadoresFB/alergenos/tarifas/temporadas/politicasCancelacion/codigosPromo/huespedes/puntosVenta/mesas/comandas/comandasDetalles/folios/cargosFolio/pagosFolio. |
| 2 | `src/services/HuespedService.ts` | Full rewrite: hidratarDesdeSupabase singleton + dual-write crear/actualizar/eliminar/incrementarVisita. |
| 3 | `src/services/FolioService.ts` | Full rewrite (CargoFolio + PagoFolio + FolioService): singleton boot hidratación (folios/cargos/pagos) + dual-write TODOS métodos mutadores (crear/actualizar/recalcularTotales/abrirFolio/cerrarFolio/checkIn/checkOut). |
| 4 | `src/services/PosService.ts` | Full rewrite (CatalogoFB / PuntoVentaService / MesaService / crearComanda / agregarItemAComanda / cambiarEstadoComanda / cerrarComanda): singleton boot (categorias/productos/presentaciones/modificadores/alergenos/mesas/puntosVenta/comandas/detalles) + dual-write. |
| 5 | `src/services/TarifaService.ts` | Full rewrite (Tarifas + Temporadas + PolCancel + CodPromo + Impuestos): hidratación + dual-write CRUD. |
| 6 | `src/App.tsx` useEffect boot | Después de ReservaService.hidratar, agregar hidrataciones NO FATAL catch individual por servicio (orden: Tarifas (Imp/Temp/Pol/Promo) → Catalogo (Alerg/Cat/Prod/Pres/Mod) → Huespedes → PuntosVenta/Mesas → Folios (Fol/Carg/Pag) → Comandas (Com/Det)). |
| 7 | `src/services/index.ts` barrel | Ensure exports all services. |
| 8 | `src/pages/Perfil/Perfil.tsx` | Nueva **sección "Gestión Productos & Stock"** (2da columna o tab) en Panel Admin. CRUD: (a) Categorías F&B (nombre/orden/estado), (b) Productos F&B (nombre/codigo/categoria/estado/impuestosIds/precio/costo/controlStock/stockActual/stockMinimo/unidadMedida), (c) **Acciones stock: +Agregar stock / -Quitar stock** input numérico + observación. |
| 9 | Stock helpers dentro de servicios | Nuevo `InventarioService.ts` o métodos dentro de `CatalogoFBService`: moverStock(id, +n/-n, motivo, usuarioId); warnings si stockActual < stockMinimo. Al confirmar venta en ComandaDetalle descontar. |
| 10 | `src/services/__seed__.ts` | Seed 0 productos demo no deseados → vaciar productosFB/categoriasFB/presentacionesFB/modificadoresFB/alergenos a 0. (Usuario poblará desde Panel Admin reales del lodge). |
| 11 | `supabase/scripts/poblarCatalogoVacio.ts` (opcional) | Si user pide poblar con producto prueba. NO ejecutar por defecto. |
| 12 | Pos + Habitaciones (Room Service agregar item) | Después de agregarItemAComanda, llamar a descontar stock. |
| 13 | tsc + vite build + commit push deploy | Commit message descriptivo; smoke tests. |

## Implementation Steps (Orden estricto de dependencias)

### FASE A — Fix persistencia global (TODOS los servicios)

**Paso 1: Whitelist genérico + TABLE mappings en __supabase_db__.ts**
- Crear `const TABLE: Record<CollectionKey, string>` con los nombres reales de tablas snake_case en Supabase:
  - `alergenos → alergenos`
  - `categoriasFB → categorias_fb`
  - `productosFB → productos_fb`
  - `presentacionesFB → presentaciones_fb`
  - `modificadoresFB → modificadores_fb`
  - `impuestos → impuestos`
  - `tiposHabitacion → tipos_habitacion`
  - `habitaciones → habitaciones`
  - `tarifas → tarifas`
  - `temporadas → temporadas`
  - `politicasCancelacion → politicas_cancelacion`
  - `codigosPromo → codigos_promocionales`
  - `huespedes → huespedes`
  - `roles → roles`
  - `usuarios → usuarios`
  - `puntosVenta → punto_ventas`
  - `mesas → mesas`
  - `reservas → reservas`
  - `folios → folios`
  - `cargosFolio → cargos_folio`
  - `pagosFolio → pagos_folio`
  - `comandas → comandas`
  - `comandasDetalles → comandas_detalles`
- Crear `WHITELISTS: Partial<Record<CollectionKey, Set<string>>>` para cada tabla usando columnas del schema SQL initial `20261003_000001`.
- Refactor `addAsync / updateAsync`: ya no hardcodear RESERVA_WHITELIST. Usar lookup genérico WHITELISTS[key]. Si existe → applyWhitelist. Si NO existe → fallback: enviar objeto con payload merge (sin bloquear, catch log).
- Ensure normalizeRow sigue expandiendo payload al nivel superior (ya está).

**Paso 2: Full Rewrite HuespedService**
- Pattern igual que HabitacionService: `let _hidratado = false; hidratarDesdeSupabase(force=false)` — allAsync huespedes → setAll.
- Métodos duales: crear/actualizar/eliminar/incrementarVisita (return local sync inmediato, dbRemota fire-and-forget catch log).

**Paso 3: Full Rewrite TarifaService (5 serv anidados)**
- ImpuestoService (read-only → solo hidratar).
- TemporadaService: dual crear/actualizar.
- PoliticaCancelacionService: dual crear/actualizar.
- CodigoPromocionalService: dual crear/registrarUso.
- TarifaService: dual crear/actualizar/cambiarEstado.
- 1 singleton `hidratarDesdeSupabase()` TarifaService → Promise.all allAsync(impuestos/tarifas/temporadas/politicas/codigosPromo) → setAll cada colección.
- Exportar en barrel + barrel index.ts.

**Paso 4: Full Rewrite PosService (9 serv anidados)**
- 1 singleton `hidratarDesdeSupabase()`: categoriasFB, productosFB, presentacionesFB, modificadoresFB, alergenos, puntosVenta, mesas, comandas, comandasDetalles → Promise.all 9 fetch → setAll.
- Servicios mutadores dual-write:
  - CatalogoFBService: crear/actualizar/eliminar Categoria; crear/actualizar/eliminar Producto; crear/actualizar/eliminar Presentacion; crear/actualizar/eliminar Modificador. Stock helpers (moverStock).
  - MesaService: crear/actualizar/cambiarEstado/crearRoomServiceSiNoExiste dual.
  - ComandaService: crearComanda, agregarItemAComanda (aquí descontar stock), quitarItem, actualizarItem, cambiarEstadoComanda, cerrarComanda, anularComanda — todos dual.
- Ensure no rompe imports (PosService exports pattern existing de `{ CatalogoFBService, PuntoVentaService, MesaService, ComandaService, ...PosService }`).

**Paso 5: Full Rewrite FolioService (3 serv)**
- 1 singleton `hidratarDesdeSupabase()`: Promise.all(folios, cargosFolio, pagosFolio) → setAll.
- CargoFolioService dual: crear/actualizar/anular (luego recalcularTotales + write remoto FOLIO también).
- PagoFolioService dual: crear (recalc totales write remoto).
- FolioService dual: recalcularTotales (db.update + dbRemota.updateAsync folio), registrarCheckIn (complejo, pero los métodos internos Folio/Cargo/Pago/Huesped/Reserva/Hab ya son duales internamente → asegurar que el folio y cargos creados se envían luego). RegistrarCheckOut (cerrar folio, actualizar estados).

**Paso 6: App.tsx useEffect boot — orquestar hidrataciones NO FATAL**
En el IIFE async, después de ReservaService.hidratar... agregar en orden y try/catch individual para que 1 fallo no pare a los demás:
```
try { await TarifaService.hidratarDesdeSupabase(false); } catch(e){console.warn(e)}
try { await PosService.hidratarDesdeSupabase(false); } catch(e){console.warn(e)}
try { await HuespedService.hidratarDesdeSupabase(false); } catch(e){console.warn(e)}
try { await FolioService.hidratarDesdeSupabase(false); } catch(e){console.warn(e)}
```

### FASE B — Módulo Stock Completo

**Paso 7: Diseño stock almacenado en payload JSONB de productos_fb y presentaciones_fb**
En `WHITELISTS.productosFB` → columnas físicas reales; todo lo demás (stockActual/stockMinimo/costoUnitario/ultimaMovStock) va a `payload`.
En Producto objeto TS (types): ya agregar opcionales `stockControl?: boolean; stockActual?: number; stockMinimo?: number; costoUnitario?: number; unidadMedida?: string;` (ya existe `presentaciones_fb.stock_control` físico → se puede usar o payload ambos).

**Paso 8: Nuevo InventarioService (métodos helpers)**
```
InventarioService = {
  async moverStock(productoId, presentacionId, delta, motivo, usuarioId),
  listarBajosStock(min = 1): ProductoFB[],
  async hidratar (noop, uses PosService),
}
```
Si delta es negativo y (stockActual + delta) < 0 → throw 'Stock insuficiente' o devolver advertencia no fatal según configuración user (por defecto advertencia no bloquea ventas, user prefiere ventas sobre stock).

**Paso 9: Perfil.tsx — 2da sección "Gestión Productos & Stock"**
En el Panel Admin (debajo del IonGrid Habitaciones), agregar 3 bloques:
- **🔖 Categorías:** Listar categorías; botón +Nueva; modal editar (nombre, orden, icono? opcional, estado ACTIVO/INACTIVO).
- **🍽️ Productos:** Tarjetas o tabla (cuadrícula estilo Excel); columnas: Código / Nombre / Categoría / Precio Venta S/ / Costo S/ / % Ganancia / Stock Actual / Stock Mínimo / Unidad Medida / Estado / Acciones (✏️ editar / 📦 Agregar stock / 📤 Quitar stock / 🗑️ eliminar).
- **Modal Editar Producto:** inputs todos los campos; **IonSegment Stock Control: SI/NO**.
- **Modal Agregar/Quitar stock:** IonInput numérico (solo positivo); IonTextarea Motivo observación; botón confirmar; IonAlert 2 paso resumen.

**Paso 10: Integrar descuento de stock en PosService.agregarItemAComanda**
Después de confirmar la línea de detalle, if (producto && (producto.stockControl || presentacion.stockControl) && cantidad > 0):
  - `InventarioService.moverStock(producto.id, presentacion?.id, -1*cantidad, `Venta en comanda #${comanda.numeroComanda || comanda.id}`, usuarioId)`
  - Actualizar el producto en InMemory UI + remoto.
- Advertencias: si (stockActual después) < stockMinimo → toast amarillo "⚠️ Producto X llegó a stock bajo (actual Y / min Z)".

**Paso 11: Seed limpio**
`__seed__.ts`: categoriasFB / productosFB / presentacionesFB / modificadoresFB / alergenos → arrays VACIOS. User poblará reales desde Panel Admin. (Si user pide demos luego se agrega script).

### FASE C — Build, Deploy, Smoke Tests

**Paso 12: tsc build 0 + vite build 0**

**Paso 13: git status, diff, commit push main**

## Dependencies and Considerations

- **Orden estricto FASE A:** No tocar servicios 2-5 sin antes terminar paso 1 (whitelist + tables mappings).
- **Catch NO FATAL:** Las hidrataciones boot y writes remotos son no fatales; si Supabase falla la app sigue en modo local (catch console.warn/error). User pidió que UI no se cuelgue.
- **`updatedBy = 'system'`:** Los writes remotos fire-and-forget usan updatedBy interno; no es crítico si no hay sesión real.
- **Tipos Supabase vs Local:** Para FKs en writes de comandas/folios, el addAsync remoto acepta objetos anidados en el payload JSONB; la desnormalización `huesped: {...}` se guarda en payload sin problema.
- **Restricción EXPLÍCITA user:** NUNCA usar `supabase_apply_migration` de TRAE (popup atascado). Cualquier schema change se guarda como SQL de referencia en `supabase/migrations/` pero NO se ejecuta. Todo cambio se almacena en columnas JSONB `payload` existentes.
- **Restricción EXPLÍCITA user:** NUNCA botones Run/Skip IDE para SQL. Todos los writes de datos se ejecutan con `tsx supabase/` script service_role.
- **Stock no bloquea ventas por defecto:** Lodge usa Punto Venta rápido; si no hay stock se muestra advertencia pero no se impide cobrar. (Cambio a bloqueable luego si user pide).
- **Íconos / brand:** Mantener misma estética Perfil (ion-iconos, verde primario, modal 88% breakpoint).

## Validation (Pruebas post-implementación)

### ✅ Bug #1 Persistencia Total — validación:
1. `http://localhost:8100/reservas` → Crear reserva → confirmar listado muestra R-XXXX.
2. **Matar Chrome, volver abrir** → reserva SIGUE visible (ya, debe pasar con commit d670184; se revalida).
3. Ir a **Reserva → Acciones Check-In:** Elegir habitación, aceptar.
4. Abrir **Habitaciones:** Hab cambia badge OCUPADA ✔️.
5. Entrar a **Habitación → Cargar consumo Room Service:** Agregar 1 producto cualquiera (se crea Cargo en folio + Detalle comanda).
6. **Matar Chrome, volver abrir → Habitaciones:** Entrar a la habitación, abrir folio → CARGO Y PAGOS SIGUEN ✔️; habitación sigue OCUPADA; folio sigue ABIERTO con total correcto ✔️.
7. **Perfil Admin:** Crear nuevo Tipo Habitación (ej. Matrimonial 4 pax S/300) → guardar → cerrar/abrir Chrome → sigue existiendo.
8. Crear nueva Tarifa y Política Cancelación → cerrar/abrir → persisten.

### ✅ Bug #2 Módulo Stock — validación:
1. **Perfil Admin → Gestión Productos & Stock:** Botón +Nueva Categoría = "Bebidas". Crear.
2. **+Nuevo Producto:** Nombre "Cusqueña Trigo", Categoría Bebidas, Precio 18.00, Costo 8.50, Control Stock = SI, Stock Actual=24, Stock Mínimo=6, Unidad Medida=unidad. Guardar.
3. **Cerrar Chrome, volver abrir.** Perfil Productos: producto "Cusqueña Trigo" SIGUE visible con stockActual=24.
4. **POS Walk-in:** Nueva comanda, agregar Cusqueña Trigo, cantidad=19. Confirmar comanda.
5. **Volver a Perfil → Productos:** StockActual=24-19=5 ✔️; Toast amarillo "⚠️ Stock bajo: Cusqueña Trigo (actual 5 < min 6)" ✔️.
6. **+Agregar Stock Cusqueña:** Motivo "Compra proveedor #123", cantidad=40 → nuevo stock=45.
7. **Cerrar/abrir Chrome:** stockActual=45 persiste ✔️.

## Risks

| Riesgo | Mitigación |
|--------|------------|
| TypeScript 100 errores TS2339 al refactor servicios (objetos muy anidados de Folio/Comanda) | Usar `/* @ts-expect-error */` temporal en 2-3 estructuras muy complejas; o `as any` en payloads de dual-write. Priorizar compilación 0. |
| Supabase RLS (Row Level Security) bloquea anon inserts/updates en tablas sin policy. | User confirmó Supabase RLS no está activo o policies públicas; si bloquea: ejecutar SQL reference `GRANT ALL ON <tabla> TO anon, authenticated` desde tsx service_role script o habilitar policies public read/write. |
| `addAsync` generar UUID remoto vs local id colisión (UNIQUE constraint). | Local ya usa `seedUtil.generateUUID()` (crypto); el `db.add` local asigna id, el `addAsync` envía el MISMO id (no se crea otro remoto). La PK es el id local (coherente). |
| Múltiples writes remotos saturan red. | Métodos mutadores `return` local sincrónico inmediato; async remoto fire-and-forget no await bloqueante. UI nunca espera. |
| Usuario prueba antes de hacer Ctrl+Shift+R (build viejo). | Documentar en la entrega final: PASO 1 Ctrl+Shift+R / borrar datos sitio Android. |
| Lista productos se llena demasiado en 1 vista → scroll no deseado. | Mantener diseño compacto; filtrar por categoría + búsqueda textual; perfiles pestañas para minimizar visualización masiva (si hace falta). |
