import React, { useMemo, useState } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
  IonList, IonItem, IonLabel, IonAvatar, IonBadge, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent,
  IonButton, IonIcon, IonSegment, IonSegmentButton, IonGrid, IonRow, IonCol, IonInput, IonTextarea, IonNote, IonSelect, IonSelectOption,
} from '@ionic/react';
import { add, create, build, trash, refresh, save, arrowDown, warning, arrowUp, pricetags, bed, cart, cube } from 'ionicons/icons';
import { ProductoFB, Habitacion, Usuario, Rol, RolUsuario, ModuloPermiso, Moneda, AuditFields, TipoHabitacion } from '../../types';
import './Perfil.css';

// Stub de seedUtil reemplazado (utils/seed no existe).
const generateUUID = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const seedUtilStub = { generateUUID };
const uid8 = () => generateUUID().slice(0, 8).toUpperCase();

const nowIso = new Date().toISOString();
const audit: AuditFields = { createdAt: nowIso, updatedAt: nowIso };

const rolAdmin: Rol = {
  id: 'rol-admin',
  nombre: 'ADMINISTRACION' as RolUsuario,
  descripcion: 'Rol de administración completa para Casa Sumaq Allpa',
  nivelJerarquia: 90,
  estado: 'ACTIVO',
  permisos: ([
    'DASHBOARD', 'HABITACIONES', 'TARIFAS', 'RESERVAS', 'HUESPEDES', 'CHECKIN_CHECKOUT',
    'FOLIOS', 'CAJA_PAGOS', 'POS_FB', 'INVENTARIO', 'CONFIGURACION_SISTEMA',
  ] as Array<ModuloPermiso['modulo']>).map((modulo) => ({
    modulo, permiso: 'ADMIN' as const,
  })) as ModuloPermiso[],
  ...audit,
};

const usuario: Usuario = {
  id: 'usr-actual', uuid: 'usr-uuid-actual', iniciales: 'MO',
  nombres: 'Moises', apellidos: 'OHS',
  correoElectronico: 'moisesohs@gmail.com',
  rolId: rolAdmin.id, rol: rolAdmin,
  estado: 'ACTIVO', passwordHash: '__hidden__',
  preferencias: { idioma: 'es', zonaHoraria: 'America/Lima', monedaPorDefecto: 'PEN' as Moneda, paginacionPorDefecto: 25 },
  ultimoAcceso: nowIso,
  ...audit,
};

// ===== MOCK DATA (inicialmente fixtures - luego vendrá de Supabase) =====
type TipoHabitacionSeedLike = TipoHabitacion & { id: string; codigo?: string; capacidadPersonas?: number; precioBaseNoche?: number };

const TIPOS_HAB_INICIALES: Array<TipoHabitacionSeedLike> = [
  { id: 'HAB-DOBLE-PISO2', codigo: 'HAB-DOBLE', nombre: 'Habitación Doble', capacidadAdultos: 2, capacidadNinos: 1, camas: [{ tipo: 'DOBLE', cantidad: 1 }], serviciosIncluidos: [], fotos: [], estado: 'ACTIVO', createdAt: nowIso, updatedAt: nowIso, capacidadPersonas: 3, precioBaseNoche: 180.00 },
  { id: 'TIPO-SUITE',        codigo: 'SUITE',     nombre: 'Suite Premium',     capacidadAdultos: 3, capacidadNinos: 1, camas: [{ tipo: 'KING', cantidad: 1 }],  serviciosIncluidos: [], fotos: [], estado: 'ACTIVO', createdAt: nowIso, updatedAt: nowIso, capacidadPersonas: 4, precioBaseNoche: 380.00 },
  { id: 'TIPO-CABANA',       codigo: 'CABANA',    nombre: 'Cabaña Madera',     capacidadAdultos: 3, capacidadNinos: 1, camas: [{ tipo: 'MATRIMONIAL', cantidad: 1 }], serviciosIncluidos: [], fotos: [], estado: 'ACTIVO', createdAt: nowIso, updatedAt: nowIso, capacidadPersonas: 4, precioBaseNoche: 260.00 },
];

const HAB_INICIALES: (Habitacion & { tipoNombre?: string; precioBaseNoche?: number })[] = [
  { id: 'HAB-H201', codigo: 'H201', nombre: 'Habitación H201', tipoHabitacionId: 'HAB-DOBLE-PISO2', tipoNombre: 'Habitación Doble', precioBaseNoche: 180, piso: 2, capacidadMaximaPersonas: 3, estado: 'DISPONIBLE', createdAt: nowIso, updatedAt: nowIso },
  { id: 'HAB-H202', codigo: 'H202', nombre: 'Habitación H202', tipoHabitacionId: 'HAB-DOBLE-PISO2', tipoNombre: 'Habitación Doble', precioBaseNoche: 180, piso: 2, capacidadMaximaPersonas: 3, estado: 'OCUPADA', createdAt: nowIso, updatedAt: nowIso },
  { id: 'HAB-H203', codigo: 'H203', nombre: 'Habitación H203', tipoHabitacionId: 'HAB-DOBLE-PISO2', tipoNombre: 'Habitación Doble', precioBaseNoche: 180, piso: 2, capacidadMaximaPersonas: 3, estado: 'DISPONIBLE', createdAt: nowIso, updatedAt: nowIso },
  { id: 'HAB-SUITE', codigo: 'SUITE', nombre: 'Suite Principal', tipoHabitacionId: 'TIPO-SUITE', tipoNombre: 'Suite Premium', precioBaseNoche: 380, piso: 1, capacidadMaximaPersonas: 4, estado: 'RESERVADA', createdAt: nowIso, updatedAt: nowIso },
  { id: 'HAB-CABANA', codigo: 'CABAÑA', nombre: 'Cabaña Independiente', tipoHabitacionId: 'TIPO-CABANA', tipoNombre: 'Cabaña Madera', precioBaseNoche: 260, piso: 0, capacidadMaximaPersonas: 4, estado: 'MANTENIMIENTO', createdAt: nowIso, updatedAt: nowIso },
];

type ProdConStock = ProductoFB & { _stock?: number; _stockMin?: number; estado?: string; };

const PRODS_INICIALES: ProdConStock[] = [
  { id: 'PROD-AGUA-MINERAL-1L', sku: 'BEB401', nombre: 'Agua Mineral 1L', categoriaId: 'CAT-BEBIDAS-FRIAS', precioVentaBase: 5, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 48, stockMinimo: 6, _stock: 48, _stockMin: 6, ...audit } as any,
  { id: 'PROD-AGUA-MINERAL-500ML', sku: 'BEB401B', nombre: 'Agua Mineral 500ml', categoriaId: 'CAT-BEBIDAS-FRIAS', precioVentaBase: 3.5, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 72, stockMinimo: 12, _stock: 72, _stockMin: 12, ...audit } as any,
  { id: 'PROD-GASEOSA-COCA-500ML', sku: 'BEB402A', nombre: 'Coca Cola 500ml', categoriaId: 'CAT-BEBIDAS-FRIAS', precioVentaBase: 7, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 24, stockMinimo: 6, _stock: 24, _stockMin: 6, ...audit } as any,
  { id: 'PROD-GASEOSA-INKA-500ML', sku: 'BEB402B', nombre: 'Inca Kola 500ml', categoriaId: 'CAT-BEBIDAS-FRIAS', precioVentaBase: 7, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 24, stockMinimo: 6, _stock: 24, _stockMin: 6, ...audit } as any,
  { id: 'PROD-GASEOSA-SPRITE-500ML', sku: 'BEB402C', nombre: 'Sprite 500ml', categoriaId: 'CAT-BEBIDAS-FRIAS', precioVentaBase: 7, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 12, stockMinimo: 4, _stock: 12, _stockMin: 4, ...audit } as any,
  { id: 'PROD-GATORADE', sku: 'BEB403', nombre: 'Gatorade 1L', categoriaId: 'CAT-BEBIDAS-FRIAS', precioVentaBase: 8, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 18, stockMinimo: 4, _stock: 18, _stockMin: 4, ...audit } as any,
  { id: 'PROD-CERVEZA-PILSEN-620ML', sku: 'BAR601A', nombre: 'Pilsen 620ml', categoriaId: 'CAT-BEBIDAS-ALCOHOL', precioVentaBase: 8, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 36, stockMinimo: 6, _stock: 36, _stockMin: 6, ...audit } as any,
  { id: 'PROD-CERVEZA-CUSQUENA-620ML', sku: 'BAR601B', nombre: 'Cusqueña 620ml', categoriaId: 'CAT-BEBIDAS-ALCOHOL', precioVentaBase: 9, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 24, stockMinimo: 6, _stock: 24, _stockMin: 6, ...audit } as any,
  { id: 'PROD-CERVEZA-ARTESANAL', sku: 'BAR601', nombre: 'Cerveza Artesanal', categoriaId: 'CAT-BEBIDAS-ALCOHOL', precioVentaBase: 15, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 12, stockMinimo: 3, _stock: 12, _stockMin: 3, ...audit } as any,
  { id: 'PROD-SNACK-GALLETA', sku: 'SNK-001', nombre: 'Snack / Galleta', categoriaId: 'CAT-BEBIDAS-FRIAS', precioVentaBase: 3, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 48, stockMinimo: 12, _stock: 48, _stockMin: 12, ...audit } as any,
  { id: 'PROD-SNACK-CHICHARRON', sku: 'SNK-002', nombre: 'Chicharrón Cancha', categoriaId: 'CAT-BEBIDAS-FRIAS', precioVentaBase: 4, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 36, stockMinimo: 8, _stock: 36, _stockMin: 8, ...audit } as any,
  { id: 'PROD-EXTRA-TOALLA', sku: 'EXT-001', nombre: 'Toalla Extra', categoriaId: 'CAT-BEBIDAS-FRIAS', precioVentaBase: 15, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 20, stockMinimo: 5, _stock: 20, _stockMin: 5, ...audit } as any,
  { id: 'PROD-EXTRA-SABANA', sku: 'EXT-002', nombre: 'Sábana Extra', categoriaId: 'CAT-BEBIDAS-FRIAS', precioVentaBase: 20, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 10, stockMinimo: 2, _stock: 10, _stockMin: 2, ...audit } as any,
  { id: 'PROD-EXTRA-BOTELLON-AGUA', sku: 'EXT-003', nombre: 'Botellón Agua 7.5L', categoriaId: 'CAT-BEBIDAS-FRIAS', precioVentaBase: 18, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 8, stockMinimo: 2, _stock: 8, _stockMin: 2, ...audit } as any,
];

// ===== Utils =====
const fmtSoles = (n: number | undefined) => `S/ ${Number(n || 0).toFixed(2)}`;

const CATEGORIAS_NOMBRE: Record<string, string> = {
  'CAT-BEBIDAS-FRIAS': 'Bebidas Frías / Snacks',
  'CAT-BEBIDAS-CALIENTES': 'Bebidas Calientes',
  'CAT-BEBIDAS-ALCOHOL': 'Bar / Alcohol',
  'CAT-DESAYUNOS': 'Desayunos',
  'CAT-JUGOS': 'Jugos',
  'CAT-SANDWICH': 'Sándwiches',
  'CAT-PLATOS': 'Platos Principales',
  'CAT-ENTRADAS': 'Entradas',
  'CAT-POSTRES': 'Postres',
};

// ============================= COMPONENTE =============================
const PerfilPage: React.FC = () => {
  const [tab, setTab] = useState<'inv' | 'prod' | 'hab'>('inv');
  const [habitaciones, setHabitaciones] = useState(HAB_INICIALES);
  const [productos, setProductos] = useState<ProdConStock[]>(PRODS_INICIALES);

  // Editar producto (abrir modal-like edit inline)
  const [editProd, setEditProd] = useState<{ nuevo: boolean; data: ProdConStock; stockReabastecer?: string; consumoManual?: string } | null>(null);
  const [editHab, setEditHab] = useState<{ nuevo: boolean; data: any } | null>(null);
  const [toast, setToast] = useState<string>('');

  const mostrarToast = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2200); };

  // ====================== INVENTARIO ======================
  const resumenInventario = useMemo(() => {
    let totalItems = 0;
    let bajoStock = 0;
    let agotados = 0;
    let valorizado = 0;
    productos.forEach(p => {
      const s = Number(p._stock ?? p.stockActual ?? 0);
      totalItems += s;
      if (s <= 0) agotados++;
      else if (s <= Number(p._stockMin ?? p.stockMinimo ?? 0)) bajoStock++;
      valorizado += s * Number((p as any).costoAproximado ?? (p.precioVentaBase * 0.4));
    });
    return { totalItems, bajoStock, agotados, valorizado };
  }, [productos]);

  const onReabastecer = () => {
    if (!editProd) return;
    const cantidad = Math.max(0, Number(editProd.stockReabastecer || 0));
    if (cantidad <= 0) { mostrarToast('Ingresa cantidad válida para reabastecer'); return; }
    const id = editProd.data.id;
    setProductos(ps => ps.map(p => p.id === id
      ? ({ ...p, _stock: (Number(p._stock ?? 0) + cantidad), stockActual: (Number(p.stockActual ?? 0) + cantidad), estadoProducto: ((Number(p._stock ?? 0) + cantidad) > 0 ? 'ACTIVO' : p.estadoProducto) })
      : p));
    mostrarToast(`✅ +${cantidad} unidades añadidas a inventario`);
    setEditProd(null);
  };

  const onConsumoManual = () => {
    if (!editProd) return;
    const cantidad = Math.max(0, Number(editProd.consumoManual || 0));
    if (cantidad <= 0) { mostrarToast('Ingresa cantidad válida'); return; }
    const id = editProd.data.id;
    const prodActual = productos.find(p => p.id === id);
    const stockActual = Number(prodActual?._stock ?? 0);
    if (!prodActual?.permiteInventarioNegativo && cantidad > stockActual) {
      mostrarToast(`Stock insuficiente. Disponible: ${stockActual}`); return;
    }
    setProductos(ps => ps.map(p => p.id === id
      ? ({ ...p, _stock: Math.max(0, Number(p._stock ?? 0) - cantidad), stockActual: Math.max(0, Number(p.stockActual ?? 0) - cantidad), estadoProducto: ((Number(p._stock ?? 0) - cantidad) <= 0 ? 'AGOTADO_TEMPORAL' : p.estadoProducto) })
      : p));
    mostrarToast(`✅ -${cantidad} unidades registradas (consumo manual)`);
    setEditProd(null);
  };

  const abrirInvProducto = (p: ProdConStock) => {
    setEditProd({ nuevo: false, data: { ...p }, stockReabastecer: '', consumoManual: '' });
  };

  // ====================== GESTIÓN PRODUCTOS ======================
  const onGuardarProducto = () => {
    if (!editProd) return;
    const d = editProd.data;
    if (!d.nombre || !d.precioVentaBase || Number(d.precioVentaBase) <= 0) {
      mostrarToast('Nombre y precio válido son obligatorios'); return;
    }
    if (editProd.nuevo) {
      const nuevo: ProdConStock = {
        ...d,
        id: 'PROD-' + uid8(),
        sku: d.sku || ('NEW-' + Date.now().toString(36).toUpperCase().slice(0, 5)),
        moneda: d.moneda || 'PEN',
        impuesto: d.impuesto || 'IGV',
        estadoProducto: d.estadoProducto || 'ACTIVO',
        estado: d.estado || 'ACTIVO',
        requierePreparacion: !!d.requierePreparacion,
        permiteInventarioNegativo: !!d.permiteInventarioNegativo,
        categoriaId: d.categoriaId || 'CAT-BEBIDAS-FRIAS',
        stockActual: Number(d._stock ?? d.stockActual ?? 0),
        stockMinimo: Number(d._stockMin ?? d.stockMinimo ?? 0),
        _stock: Number(d._stock ?? 0),
        _stockMin: Number(d._stockMin ?? 0),
        ...audit,
      } as any;
      setProductos(ps => [...ps, nuevo]);
      mostrarToast('✅ Producto nuevo creado');
    } else {
      setProductos(ps => ps.map(p => p.id === d.id
        ? { ...p, ...d, precioVentaBase: Number(d.precioVentaBase), stockMinimo: Number(d._stockMin ?? p.stockMinimo), _stockMin: Number(d._stockMin ?? p._stockMin) }
        : p));
      mostrarToast('✅ Producto actualizado');
    }
    setEditProd(null);
  };

  const onToggleProdInactivo = () => {
    if (!editProd || editProd.nuevo) return;
    const id = editProd.data.id;
    setProductos(ps => ps.map(p => p.id === id
      ? { ...p, estadoProducto: (p.estadoProducto === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'), estado: (p.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO') }
      : p));
    mostrarToast('✅ Estado de producto actualizado');
    setEditProd(null);
  };

  // ====================== GESTIÓN HABITACIONES ======================
  const onGuardarHabitacion = () => {
    if (!editHab) return;
    const d = editHab.data;
    if (!d.codigo || !d.nombre || !d.tipoHabitacionId) {
      mostrarToast('Código, nombre y tipo de habitación son obligatorios'); return;
    }
    if (editHab.nuevo) {
      const nueva: any = {
        ...d,
        id: 'HAB-' + uid8(),
        capacidadMaximaPersonas: Number(d.capacidadMaximaPersonas || TIPOS_HAB_INICIALES.find(t => t.id === d.tipoHabitacionId)?.capacidadPersonas || 2),
        precioBaseNoche: Number(d.precioBaseNoche || TIPOS_HAB_INICIALES.find(t => t.id === d.tipoHabitacionId)?.precioBaseNoche || 180),
        piso: Number(d.piso || 1),
        estado: d.estado || 'DISPONIBLE',
        tipoNombre: TIPOS_HAB_INICIALES.find(t => t.id === d.tipoHabitacionId)?.nombre,
      };
      setHabitaciones(hs => [...hs, nueva]);
      mostrarToast('✅ Habitación nueva creada');
    } else {
      setHabitaciones(hs => hs.map(h => h.id === d.id
        ? { ...h, ...d, capacidadMaximaPersonas: Number(d.capacidadMaximaPersonas || h.capacidadMaximaPersonas), precioBaseNoche: Number(d.precioBaseNoche || h.precioBaseNoche), piso: Number(d.piso ?? h.piso ?? 1), tipoNombre: TIPOS_HAB_INICIALES.find(t => t.id === d.tipoHabitacionId)?.nombre || h.tipoNombre }
        : h));
      mostrarToast('✅ Habitación actualizada');
    }
    setEditHab(null);
  };

  const onToggleHabInhabilitar = () => {
    if (!editHab || editHab.nuevo) return;
    const id = editHab.data.id;
    setHabitaciones(hs => hs.map(h => h.id === id ? { ...h, estado: (h.estado === 'MANTENIMIENTO' ? 'DISPONIBLE' : 'MANTENIMIENTO') } : h));
    mostrarToast('✅ Estado habitación actualizado');
    setEditHab(null);
  };

  // ====================== RENDER ======================
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>⚙️ Panel Admin</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as any)}>
            <IonSegmentButton value="inv"><IonIcon icon={cube} />&nbsp;Inventario</IonSegmentButton>
            <IonSegmentButton value="prod"><IonIcon icon={cart} />&nbsp;Productos</IonSegmentButton>
            <IonSegmentButton value="hab"><IonIcon icon={bed} />&nbsp;Habitaciones</IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="admin-page">
        {toast && <div className="toast-flash">{toast}</div>}

        <IonCard className="profile-card">
          <IonCardHeader className="profile-header">
            <IonAvatar className="profile-avatar"><div className="avatar-inner">{usuario.iniciales}</div></IonAvatar>
            <div className="profile-info">
              <IonCardTitle>{usuario.nombres} {usuario.apellidos}</IonCardTitle>
              <IonBadge color="tertiary">{String(usuario.rol?.nombre ?? 'ADMIN').replace(/_/g, ' ')}</IonBadge>
            </div>
          </IonCardHeader>
        </IonCard>

        {/* ============ TAB 1: INVENTARIO ============ */}
        {tab === 'inv' && (
          <>
            <IonGrid className="inv-kpis">
              <IonRow>
                <IonCol size="6"><IonCard className="kpi k-total"><IonCardHeader><IonCardSubtitle>Unidades totales</IonCardSubtitle><IonCardTitle>{resumenInventario.totalItems}</IonCardTitle></IonCardHeader></IonCard></IonCol>
                <IonCol size="6"><IonCard className="kpi k-val"><IonCardHeader><IonCardSubtitle>Valorizado (costo aprox)</IonCardSubtitle><IonCardTitle>{fmtSoles(resumenInventario.valorizado)}</IonCardTitle></IonCardHeader></IonCard></IonCol>
                <IonCol size="6"><IonCard className="kpi k-warn"><IonCardHeader><IonCardSubtitle>Stock bajo</IonCardSubtitle><IonCardTitle className="text-warn">{resumenInventario.bajoStock}</IonCardTitle></IonCardHeader></IonCard></IonCol>
                <IonCol size="6"><IonCard className="kpi k-bad"><IonCardHeader><IonCardSubtitle>Agotados</IonCardSubtitle><IonCardTitle className="text-bad">{resumenInventario.agotados}</IonCardTitle></IonCardHeader></IonCard></IonCol>
              </IonRow>
            </IonGrid>

            <IonCard>
              <IonCardHeader>
                <IonCardTitle>📦 Control de Stock</IonCardTitle>
                <IonNote color="medium">Toca cualquier producto para reabastecer o registrar consumo manual</IonNote>
              </IonCardHeader>
              <IonCardContent className="card-pad-0">
                <IonList lines="inset">
                  {productos.map(p => {
                    const st = Number(p._stock ?? p.stockActual ?? 0);
                    const min = Number(p._stockMin ?? p.stockMinimo ?? 0);
                    const bajo = st <= min;
                    const agotado = st <= 0;
                    return (
                      <IonItem key={p.id} button detail onClick={() => abrirInvProducto(p)} color={agotado ? 'danger' : (bajo ? 'warning' : undefined)}>
                        <IonLabel>
                          <h2>{p.nombre} <IonBadge color={agotado ? 'danger' : (bajo ? 'warning' : 'medium')} style={{ marginLeft: 6 }}>{CATEGORIAS_NOMBRE[p.categoriaId]?.slice(0, 12) || 'Prod'}</IonBadge></h2>
                          <p>SKU {p.sku} · {fmtSoles(p.precioVentaBase)}</p>
                        </IonLabel>
                        <div slot="end" style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: agotado ? '#dc2626' : (bajo ? '#d97706' : '#0f172a') }}>
                            {st} {agotado ? '⛔' : (bajo ? '⚠️' : '')}
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.8 }}>mín: {min}</div>
                        </div>
                      </IonItem>
                    );
                  })}
                </IonList>
              </IonCardContent>
            </IonCard>

            {/* Modal inline Producto Inventario */}
            {editProd && !editProd.nuevo && (
              <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setEditProd(null); }}>
                <div className="modal-card">
                  <h3>📦 {editProd.data.nombre}</h3>
                  <div style={{ fontSize: 14, marginBottom: 10 }}>
                    SKU: <b>{editProd.data.sku}</b> · Precio: <b>{fmtSoles(editProd.data.precioVentaBase)}</b><br />
                    Stock actual: <b style={{ fontSize: 18 }}>{Number(editProd.data._stock ?? 0)}</b> · Mín: {Number(editProd.data._stockMin ?? 0)}
                  </div>
                  <IonItem style={{ marginBottom: 6 }}>
                    <IonLabel position="stacked">➕ Reabastecer (añadir unidades)</IonLabel>
                    <IonInput type="number" value={editProd.stockReabastecer} onIonInput={e => setEditProd({ ...editProd!, stockReabastecer: e.detail.value || '' })} placeholder="Ej: 24" />
                  </IonItem>
                  <IonButton expand="block" fill="solid" color="success" onClick={onReabastecer} style={{ marginBottom: 14 }}>
                    <IonIcon slot="start" icon={arrowDown} />Confirmar Reabastecimiento
                  </IonButton>

                  <hr style={{ opacity: 0.2, margin: '6px 0 14px 0' }} />

                  <IonItem style={{ marginBottom: 6 }}>
                    <IonLabel position="stacked">➖ Consumo manual / merma / perdida (quitar)</IonLabel>
                    <IonInput type="number" value={editProd.consumoManual} onIonInput={e => setEditProd({ ...editProd!, consumoManual: e.detail.value || '' })} placeholder="Ej: 2" />
                  </IonItem>
                  <IonButton expand="block" fill="solid" color="warning" onClick={onConsumoManual} style={{ marginBottom: 14 }}>
                    <IonIcon slot="start" icon={arrowUp} />Registrar Consumo Manual
                  </IonButton>
                  <IonButton expand="block" fill="outline" onClick={() => setEditProd(null)}>Cerrar</IonButton>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============ TAB 2: GESTIÓN PRODUCTOS ============ */}
        {tab === 'prod' && (
          <>
            <div style={{ padding: '0 10px 8px 10px' }}>
              <IonButton expand="block" color="success" onClick={() => {
                setEditProd({
                  nuevo: true,
                  data: {
                    id: '', sku: '', codigo: '', nombre: '', descripcion: '', categoriaId: 'CAT-BEBIDAS-FRIAS',
                    precioVentaBase: 0, moneda: 'PEN', impuesto: 'IGV', requierePreparacion: false, permiteInventarioNegativo: false,
                    estadoProducto: 'ACTIVO', estado: 'ACTIVO', stockActual: 0, stockMinimo: 0, _stock: 0, _stockMin: 0,
                  } as any,
                  stockReabastecer: '', consumoManual: '',
                });
              }}><IonIcon slot="start" icon={add} />Nuevo Producto</IonButton>
            </div>

            <IonCard>
              <IonCardHeader><IonCardTitle>🛒 Productos del Sistema</IonCardTitle></IonCardHeader>
              <IonCardContent className="card-pad-0">
                <IonList lines="inset">
                  {productos.map(p => (
                    <IonItem key={p.id} button detail onClick={() => setEditProd({ nuevo: false, data: { ...p }, stockReabastecer: String(p._stock ?? 0), consumoManual: '' })}>
                      <IonLabel>
                        <h2>{p.nombre} {p.estadoProducto !== 'ACTIVO' && <IonBadge color="medium" style={{ marginLeft: 6 }}>INACTIVO</IonBadge>}</h2>
                        <p style={{ fontSize: 13 }}>
                          {CATEGORIAS_NOMBRE[p.categoriaId] || 'General'} · {p.requierePreparacion ? 'prepara' : 'directo'}
                          {typeof p._stock === 'number' && ` · stock: ${p._stock}`}
                        </p>
                      </IonLabel>
                      <IonLabel slot="end" style={{ textAlign: 'right' }}>
                        <b style={{ fontSize: 18 }}>{fmtSoles(p.precioVentaBase)}</b>
                      </IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              </IonCardContent>
            </IonCard>

            {editProd && (
              <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setEditProd(null); }}>
                <div className="modal-card">
                  <h3>{editProd.nuevo ? '➕ Nuevo Producto' : '✏️ Editar Producto'}</h3>
                  <IonGrid>
                    <IonRow>
                      <IonCol size="12"><IonItem><IonLabel position="stacked">Nombre *</IonLabel><IonInput value={editProd.data.nombre} onIonInput={e => setEditProd({ ...editProd!, data: { ...editProd!.data, nombre: String(e.detail.value || '') } })} /></IonItem></IonCol>
                      <IonCol size="6"><IonItem><IonLabel position="stacked">SKU / Código</IonLabel><IonInput value={editProd.data.sku} onIonInput={e => setEditProd({ ...editProd!, data: { ...editProd!.data, sku: String(e.detail.value || '') } })} /></IonItem></IonCol>
                      <IonCol size="6"><IonItem><IonLabel position="stacked">Precio S/ *</IonLabel><IonInput type="number" value={editProd.data.precioVentaBase || ''} onIonInput={e => setEditProd({ ...editProd!, data: { ...editProd!.data, precioVentaBase: Number(e.detail.value || 0) } })} /></IonItem></IonCol>
                      <IonCol size="6"><IonItem><IonLabel position="stacked">Categoría</IonLabel>
                        <IonSelect value={editProd.data.categoriaId || 'CAT-BEBIDAS-FRIAS'} onIonChange={e => setEditProd({ ...editProd!, data: { ...editProd!.data, categoriaId: e.detail.value } })}>
                          {Object.keys(CATEGORIAS_NOMBRE).map(k => <IonSelectOption key={k} value={k}>{CATEGORIAS_NOMBRE[k]}</IonSelectOption>)}
                          <IonSelectOption value="CAT-OTROS">Otros</IonSelectOption>
                        </IonSelect>
                      </IonItem></IonCol>
                      <IonCol size="6"><IonItem><IonLabel position="stacked">Estado</IonLabel>
                        <IonSelect value={editProd.data.estadoProducto || 'ACTIVO'} onIonChange={e => setEditProd({ ...editProd!, data: { ...editProd!.data, estadoProducto: e.detail.value, estado: e.detail.value === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO' } })}>
                          <IonSelectOption value="ACTIVO">Activo</IonSelectOption>
                          <IonSelectOption value="AGOTADO_TEMPORAL">Agotado Temporal</IonSelectOption>
                          <IonSelectOption value="INACTIVO">Inactivo (no aparece)</IonSelectOption>
                        </IonSelect>
                      </IonItem></IonCol>
                      <IonCol size="6"><IonItem><IonLabel position="stacked">¿Controla stock?</IonLabel>
                        <IonSelect value={!editProd.data.permiteInventarioNegativo && typeof editProd.data._stock === 'number' ? 'SI' : 'NO'} onIonChange={e => setEditProd({ ...editProd!, data: { ...editProd!.data, permiteInventarioNegativo: e.detail.value === 'SI' ? false : true, _stock: e.detail.value === 'SI' ? (Number(editProd!.data._stock ?? 0)) : undefined } })}>
                          <IonSelectOption value="SI">Sí (descuenta al vender)</IonSelectOption>
                          <IonSelectOption value="NO">No (alimentos preparados)</IonSelectOption>
                        </IonSelect>
                      </IonItem></IonCol>
                      <IonCol size="6"><IonItem><IonLabel position="stacked">Requiere preparación?</IonLabel>
                        <IonSelect value={editProd.data.requierePreparacion ? 'SI' : 'NO'} onIonChange={e => setEditProd({ ...editProd!, data: { ...editProd!.data, requierePreparacion: e.detail.value === 'SI' } })}>
                          <IonSelectOption value="SI">Sí (va a cocina/bar)</IonSelectOption>
                          <IonSelectOption value="NO">No (venta directa)</IonSelectOption>
                        </IonSelect>
                      </IonItem></IonCol>
                      {(!editProd.data.permiteInventarioNegativo || typeof editProd.data._stock === 'number') && (
                        <>
                          <IonCol size="6"><IonItem><IonLabel position="stacked">Stock inicial / actual</IonLabel><IonInput type="number" value={String(editProd.data._stock ?? editProd.data.stockActual ?? 0)} onIonInput={e => setEditProd({ ...editProd!, data: { ...editProd!.data, _stock: Number(e.detail.value || 0), stockActual: Number(e.detail.value || 0) } })} /></IonItem></IonCol>
                          <IonCol size="6"><IonItem><IonLabel position="stacked">Stock mínimo (aviso)</IonLabel><IonInput type="number" value={String(editProd.data._stockMin ?? editProd.data.stockMinimo ?? 0)} onIonInput={e => setEditProd({ ...editProd!, data: { ...editProd!.data, _stockMin: Number(e.detail.value || 0), stockMinimo: Number(e.detail.value || 0) } })} /></IonItem></IonCol>
                        </>
                      )}
                      <IonCol size="12"><IonItem><IonLabel position="stacked">Descripción</IonLabel><IonTextarea rows={2} value={editProd.data.descripcion} onIonInput={e => setEditProd({ ...editProd!, data: { ...editProd!.data, descripcion: String(e.detail.value || '') } })} /></IonItem></IonCol>
                    </IonRow>
                  </IonGrid>
                  <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <IonButton color="primary" onClick={onGuardarProducto}><IonIcon slot="start" icon={save} />Guardar</IonButton>
                    {!editProd.nuevo && <IonButton color="danger" fill="outline" onClick={onToggleProdInactivo}>{editProd.data.estadoProducto === 'ACTIVO' ? 'Deshabilitar' : 'Habilitar'}</IonButton>}
                    <IonButton color="medium" fill="outline" onClick={() => setEditProd(null)}>Cancelar</IonButton>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============ TAB 3: GESTIÓN HABITACIONES ============ */}
        {tab === 'hab' && (
          <>
            <div style={{ padding: '0 10px 8px 10px' }}>
              <IonButton expand="block" color="success" onClick={() => {
                setEditHab({
                  nuevo: true,
                  data: {
                    id: '', codigo: '', nombre: '', tipoHabitacionId: 'HAB-DOBLE-PISO2', piso: 2,
                    capacidadMaximaPersonas: 3, precioBaseNoche: 180,
                    estado: 'DISPONIBLE', tipoNombre: 'Habitación Doble',
                  },
                });
              }}><IonIcon slot="start" icon={add} />Nueva Habitación</IonButton>
            </div>

            <IonCard>
              <IonCardHeader>
                <IonCardTitle>🛏️ Habitaciones ({habitaciones.length})</IonCardTitle>
                <IonNote color="medium">Toca para editar. Mantenimiento/inhabilitación no borra datos históricos.</IonNote>
              </IonCardHeader>
              <IonCardContent className="card-pad-0">
                <IonList lines="inset">
                  {habitaciones.map(h => (
                    <IonItem key={h.id} button detail onClick={() => setEditHab({ nuevo: false, data: { ...h } })}>
                      <IonLabel>
                        <h2>
                          <b style={{ fontSize: 18 }}>{h.codigo}</b> — {h.nombre}
                          <IonBadge
                            color={h.estado === 'DISPONIBLE' ? 'success' : (h.estado === 'OCUPADA' ? 'danger' : (h.estado === 'RESERVADA' ? 'warning' : 'medium'))}
                            style={{ marginLeft: 8 }}
                          >{h.estado}</IonBadge>
                        </h2>
                        <p style={{ fontSize: 13 }}>
                          {h.tipoNombre || 'Tipo ?'} · Cap: {h.capacidadMaximaPersonas} pax · Piso {h.piso} · Tarifa base <b>{fmtSoles(h.precioBaseNoche)}</b>
                        </p>
                      </IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              </IonCardContent>
            </IonCard>

            {editHab && (
              <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setEditHab(null); }}>
                <div className="modal-card">
                  <h3>{editHab.nuevo ? '➕ Nueva Habitación' : '✏️ Editar Habitación'}</h3>
                  <IonGrid>
                    <IonRow>
                      <IonCol size="6"><IonItem><IonLabel position="stacked">Código único *</IonLabel><IonInput value={editHab.data.codigo} onIonInput={e => setEditHab({ ...editHab!, data: { ...editHab!.data, codigo: String(e.detail.value || '').toUpperCase() } })} placeholder="Ej: H204" /></IonItem></IonCol>
                      <IonCol size="6"><IonItem><IonLabel position="stacked">Piso</IonLabel><IonInput type="number" value={String(editHab.data.piso ?? '')} onIonInput={e => setEditHab({ ...editHab!, data: { ...editHab!.data, piso: Number(e.detail.value || 1) } })} /></IonItem></IonCol>
                      <IonCol size="12"><IonItem><IonLabel position="stacked">Nombre completo *</IonLabel><IonInput value={editHab.data.nombre} onIonInput={e => setEditHab({ ...editHab!, data: { ...editHab!.data, nombre: String(e.detail.value || '') } })} placeholder="Ej: Habitación Doble H204" /></IonItem></IonCol>
                      <IonCol size="6"><IonItem><IonLabel position="stacked">Tipo Habitación *</IonLabel>
                        <IonSelect value={editHab.data.tipoHabitacionId} onIonChange={e => {
                          const id = e.detail.value;
                          const tipo = TIPOS_HAB_INICIALES.find(t => t.id === id);
                          setEditHab({
                            ...editHab!,
                            data: {
                              ...editHab!.data,
                              tipoHabitacionId: id,
                              tipoNombre: tipo?.nombre,
                              capacidadMaximaPersonas: tipo?.capacidadPersonas ?? editHab!.data.capacidadMaximaPersonas,
                              precioBaseNoche: tipo?.precioBaseNoche ?? editHab!.data.precioBaseNoche,
                            },
                          });
                        }}>
                          {TIPOS_HAB_INICIALES.map(t => <IonSelectOption key={t.id} value={t.id}>{t.nombre}</IonSelectOption>)}
                        </IonSelect>
                      </IonItem></IonCol>
                      <IonCol size="6"><IonItem><IonLabel position="stacked">Capacidad (pax)</IonLabel><IonInput type="number" value={String(editHab.data.capacidadMaximaPersonas || '')} onIonInput={e => setEditHab({ ...editHab!, data: { ...editHab!.data, capacidadMaximaPersonas: Number(e.detail.value || 1) } })} /></IonItem></IonCol>
                      <IonCol size="6"><IonItem><IonLabel position="stacked">Tarifa Base Noche (S/) *</IonLabel><IonInput type="number" value={String(editHab.data.precioBaseNoche || '')} onIonInput={e => setEditHab({ ...editHab!, data: { ...editHab!.data, precioBaseNoche: Number(e.detail.value || 0) } })} /></IonItem></IonCol>
                      <IonCol size="6"><IonItem><IonLabel position="stacked">Estado</IonLabel>
                        <IonSelect value={editHab.data.estado || 'DISPONIBLE'} onIonChange={e => setEditHab({ ...editHab!, data: { ...editHab!.data, estado: e.detail.value } })}>
                          <IonSelectOption value="DISPONIBLE">Disponible (Libre)</IonSelectOption>
                          <IonSelectOption value="MANTENIMIENTO">Mantenimiento / Inhabilitada</IonSelectOption>
                        </IonSelect>
                      </IonItem></IonCol>
                    </IonRow>
                  </IonGrid>
                  <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <IonButton color="primary" onClick={onGuardarHabitacion}><IonIcon slot="start" icon={save} />Guardar</IonButton>
                    {!editHab.nuevo && <IonButton color="danger" fill="outline" onClick={onToggleHabInhabilitar}>Marcar {editHab.data.estado === 'MANTENIMIENTO' ? 'Disponible' : 'Mantenimiento'}</IonButton>}
                    <IonButton color="medium" fill="outline" onClick={() => setEditHab(null)}>Cancelar</IonButton>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ height: 28 }} />
      </IonContent>
    </IonPage>
  );
};

export default PerfilPage;
