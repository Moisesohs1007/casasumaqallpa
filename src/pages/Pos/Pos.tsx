import React, { useMemo, useState } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonBadge, IonLabel, IonChip, IonIcon, IonSkeletonText, IonSegment, IonSegmentButton,
  IonButton, IonInput, IonTextarea, IonSelect, IonSelectOption, IonList, IonItem, IonNote,
  useIonViewWillEnter,
} from '@ionic/react';
import type { Color } from '@ionic/core';
import { add, remove, cart, cash, pricetag, checkmarkCircle, receiptOutline, close, person } from 'ionicons/icons';
import TomarComanda from '../../components/modals/TomarComanda';
import PagoForm, { PagoFormValue } from '../../components/PagoForm';
import { METODOS_PAGO_LISTA } from '../../types/etapa2';
import { Mesa, Comanda, ProductoFB } from '../../types';
import { MesaService, ComandaService } from '../../services';
import './Pos.css';

type EstadoMesaLabel = 'libre' | 'ocupada' | 'sucia';
type EstadoComandaLabel = 'abierta' | 'cocina' | 'lista' | 'cerrada';
interface PosVistaMesaRow {
  id: string; nombre: string; capacidad: number; estado: EstadoMesaLabel;
  habitacionVinculada?: string;
  comanda?: { id: string; numero: number; estado: EstadoComandaLabel; itemsCantidad: number; mozoNombre: string; total: number };
}
const mesaColor: Record<EstadoMesaLabel, Color> = { libre: 'success', ocupada: 'danger', sucia: 'warning' };
interface ComandaBadgeCfg { color: Color; label: string; }
const comandaBadge: Record<EstadoComandaLabel, ComandaBadgeCfg> = {
  abierta: { color: 'warning', label: 'ABIERTA' }, cocina: { color: 'tertiary', label: 'EN COCINA' },
  lista: { color: 'success', label: 'LISTA' }, cerrada: { color: 'medium', label: 'CERRADA' },
};
const estadoMesaToLabel = (e: any): EstadoMesaLabel => {
  const s = String(e || '').toUpperCase();
  if (s === 'OCUPADA' || s === 'EN_USO') return 'ocupada';
  if (s === 'SUCIA' || s === 'EN_LIMPIEZA' || s === 'LIMPIEZA') return 'sucia';
  return 'libre';
};
const estadoComandaToLabel = (e: any): EstadoComandaLabel => {
  const s = String(e || '').toUpperCase();
  if (s.includes('COCINA') || s === 'EN_PREPARACION') return 'cocina';
  if (s.includes('LISTA') || s.includes('ENTREGAR') || s.includes('ENTREGADA')) return 'lista';
  if (s.includes('CERRADA') || s.includes('COBRADA') || s.includes('CARGADA')) return 'cerrada';
  return 'abierta';
};

// ---------- Datos demo ----------
const PRODUCTOS_STOCK_DEMO: Array<ProductoFB & { _stock?: number; _stockMin?: number; categoriaNombre?: string }> = [
  { id: 'PROD-AGUA-MINERAL-1L', sku: 'BEB401', nombre: 'Agua Mineral 1L', categoriaId: 'CAT-BEBIDAS-FRIAS', categoriaNombre: 'Bebidas Frías', precioVentaBase: 5, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 48, stockMinimo: 6, _stock: 48 } as any,
  { id: 'PROD-AGUA-MINERAL-500ML', sku: 'BEB401B', nombre: 'Agua Mineral 500ml', categoriaId: 'CAT-BEBIDAS-FRIAS', categoriaNombre: 'Bebidas Frías', precioVentaBase: 3.5, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 72, stockMinimo: 12, _stock: 72 } as any,
  { id: 'PROD-GASEOSA-COCA-500ML', sku: 'BEB402A', nombre: 'Coca Cola 500ml', categoriaId: 'CAT-BEBIDAS-FRIAS', categoriaNombre: 'Bebidas Frías', precioVentaBase: 7, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 24, stockMinimo: 6, _stock: 24 } as any,
  { id: 'PROD-GASEOSA-INKA-500ML', sku: 'BEB402B', nombre: 'Inca Kola 500ml', categoriaId: 'CAT-BEBIDAS-FRIAS', categoriaNombre: 'Bebidas Frías', precioVentaBase: 7, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 24, stockMinimo: 6, _stock: 24 } as any,
  { id: 'PROD-GASEOSA-SPRITE-500ML', sku: 'BEB402C', nombre: 'Sprite 500ml', categoriaId: 'CAT-BEBIDAS-FRIAS', categoriaNombre: 'Bebidas Frías', precioVentaBase: 7, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 12, stockMinimo: 4, _stock: 12 } as any,
  { id: 'PROD-GATORADE', sku: 'BEB403', nombre: 'Gatorade 1L', categoriaId: 'CAT-BEBIDAS-FRIAS', categoriaNombre: 'Bebidas Frías', precioVentaBase: 8, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 18, stockMinimo: 4, _stock: 18 } as any,
  { id: 'PROD-CERVEZA-PILSEN-620ML', sku: 'BAR601A', nombre: 'Pilsen 620ml', categoriaId: 'CAT-BEBIDAS-ALCOHOL', categoriaNombre: 'Bar / Alcohol', precioVentaBase: 8, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 36, stockMinimo: 6, _stock: 36 } as any,
  { id: 'PROD-CERVEZA-CUSQUENA-620ML', sku: 'BAR601B', nombre: 'Cusqueña 620ml', categoriaId: 'CAT-BEBIDAS-ALCOHOL', categoriaNombre: 'Bar / Alcohol', precioVentaBase: 9, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 24, stockMinimo: 6, _stock: 24 } as any,
  { id: 'PROD-SNACK-GALLETA', sku: 'SNK-001', nombre: 'Snack / Galleta', categoriaId: 'CAT-BEBIDAS-FRIAS', categoriaNombre: 'Snacks / Extras', precioVentaBase: 3, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 48, stockMinimo: 12, _stock: 48 } as any,
  { id: 'PROD-EXTRA-TOALLA', sku: 'EXT-001', nombre: 'Toalla Extra', categoriaId: 'CAT-BEBIDAS-FRIAS', categoriaNombre: 'Snacks / Extras', precioVentaBase: 15, moneda: 'PEN', impuesto: 'IGV', estadoProducto: 'ACTIVO', estado: 'ACTIVO', requierePreparacion: false, permiteInventarioNegativo: false, stockActual: 20, stockMinimo: 5, _stock: 20 } as any,
];

// Carta alimentos preparados (sin stock estricto)
const PRODUCTOS_CARTA_DEMO: any[] = [
  { id: 'C-DESAY-AMER', nombre: 'Desayuno Americano', categoria: 'Desayunos', precio: 15, icon: '🥞' },
  { id: 'C-DESAY-CONTI', nombre: 'Desayuno Continental', categoria: 'Desayunos', precio: 20, icon: '🍳' },
  { id: 'C-DESAY-YUNGA', nombre: 'Desayuno Regional Yungaino', categoria: 'Desayunos', precio: 20, icon: '🌽' },
  { id: 'C-JUG-PAPAYA', nombre: 'Jugo de Papaya', categoria: 'Jugos', precio: 6, icon: '🧃' },
  { id: 'C-JUG-NARANJA', nombre: 'Jugo de Naranja', categoria: 'Jugos', precio: 7, icon: '🍊' },
  { id: 'C-CAFE', nombre: 'Café Tostado', categoria: 'Bebidas Calientes', precio: 5, icon: '☕' },
  { id: 'C-CAPPUCCINO', nombre: 'Cappuccino', categoria: 'Bebidas Calientes', precio: 8.5, icon: '☕' },
  { id: 'C-INFUSION', nombre: 'Infusión (7 variedades)', categoria: 'Bebidas Calientes', precio: 3, icon: '🍵' },
  { id: 'C-SW-QUESO', nombre: 'Sándwich Queso', categoria: 'Sándwiches', precio: 5, icon: '🥪' },
  { id: 'C-SW-POLLO', nombre: 'Sándwich Pollo a la Plancha', categoria: 'Sándwiches', precio: 12, icon: '🥪' },
  { id: 'C-ENS-PRINCESA', nombre: 'Ensalada Fresca (Palta)', categoria: 'Entradas', precio: 15, icon: '🥗' },
  { id: 'C-PAPA-HUANCAINA', nombre: 'Papa a la Huancaína', categoria: 'Entradas', precio: 12, icon: '🥔' },
  { id: 'C-PLATO-LOMO-SALTADO', nombre: 'Lomo Saltado', categoria: 'Platos Principales', precio: 30, icon: '🍲' },
  { id: 'C-PLATO-TRUCHA-PLANCHA', nombre: 'Trucha a la Plancha', categoria: 'Platos Principales', precio: 30, icon: '🐟' },
  { id: 'C-PLATO-POLLO-PLANCHA', nombre: 'Pollo a la Plancha', categoria: 'Platos Principales', precio: 28, icon: '🍗' },
  { id: 'C-PIZZA-AMERICANA', nombre: 'Pizza Americana (Personal)', categoria: 'Pizzas', precio: 29, icon: '🍕' },
  { id: 'C-POSTRE-ENSALADA-FRUTAS', nombre: 'Ensalada de Frutas', categoria: 'Postres', precio: 15, icon: '🍓' },
  { id: 'C-POSTRE-HELADO', nombre: 'Helado 1 bola', categoria: 'Postres', precio: 7, icon: '🍨' },
];

const CATEGORIAS_CARTA = ['Desayunos', 'Jugos', 'Bebidas Calientes', 'Sándwiches', 'Entradas', 'Platos Principales', 'Pizzas', 'Postres'];

// Helpers
const fmtSoles = (n: number) => `S/ ${Number(n || 0).toFixed(2)}`;
const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const fechaHoy = () => new Date().toLocaleString('es-PE');

interface LineaVenta {
  id: string;
  tipo: 'CARTA' | 'STOCK' | 'SERVICIO_EXTRA';
  productoId?: string;
  nombre: string;
  cantidad: number;
  precioUnit: number;
  observaciones?: string;
  icon?: string;
}

interface VentaHistorialItem {
  id: string;
  fecha: string;
  cliente: string;
  lineas: LineaVenta[];
  total: number;
  metodoPago: string;
  montoPagado: number;
  referencia?: string;
  estado: 'PAGADA' | 'ANULADA';
}

const PosPage: React.FC = () => {
  const [tab, setTab] = useState<'walkin' | 'mesas' | 'historial'>('walkin');

  const [tomarComandaOpen, setTomarComandaOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vistaMesas, setVistaMesas] = useState<PosVistaMesaRow[]>([]);
  const [preMesaId, setPreMesaId] = useState<string | undefined>(undefined);
  const [preHabitacionId, setPreHabitacionId] = useState<string | undefined>(undefined);
  const [preTipoConsumo, setPreTipoConsumo] = useState<'MESA' | 'CARGO_A_HABITACION' | undefined>(undefined);
  const [comandaAEditarId, setComandaAEditarId] = useState<string | undefined>(undefined);

  // ============== WALK-IN ==============
  const [categoriaCartaSel, setCategoriaCartaSel] = useState<string>('Todos');
  const [carrito, setCarrito] = useState<LineaVenta[]>([]);
  const [prodStockLocal, setProdStockLocal] = useState(PRODUCTOS_STOCK_DEMO);
  const [clienteForm, setClienteForm] = useState({ nombre: 'Cliente Eventual', dni: '', telefono: '' });
  const [servExtraForm, setServExtraForm] = useState({ nombre: '', precio: 0, cantidad: 1, observaciones: '' });
  const [modalServExtra, setModalServExtra] = useState(false);
  const [modalCliente, setModalCliente] = useState(false);
  const [modalCobrar, setModalCobrar] = useState(false);
  const [modalNotaVenta, setModalNotaVenta] = useState<VentaHistorialItem | null>(null);
  const [pagoForm, setPagoForm] = useState<PagoFormValue>();
  const [historial, setHistorial] = useState<VentaHistorialItem[]>([]);
  const [toast, setToast] = useState('');
  const mostrarToast = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2200); };

  const openNuevoRoomService = () => {
    setPreMesaId(undefined); setPreHabitacionId(undefined); setPreTipoConsumo('MESA');
    setComandaAEditarId(undefined); setTomarComandaOpen(true);
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const [mesas, comandas] = await Promise.all([
        MesaService.listarTodas(),
        ComandaService.listarTodas({ estado: 'ABIERTA' as any }),
      ]);
      const comandasAbiertas = comandas.filter((c) => c.estado !== 'CERRADA_COBRADA');
      const comandasPorMesa = new Map<string, Comanda>();
      for (const c of comandasAbiertas) {
        const key = (c as any).mesaId;
        if (key && !comandasPorMesa.has(key)) comandasPorMesa.set(key, c);
      }
      const rows: PosVistaMesaRow[] = mesas.map((m: Mesa) => {
        const nombre = (m as any).nombreVisible || (m as any).nombre || (m as any).codigo || `Mesa ${m.id.slice(-3)}`;
        const capacidad = (m as any).capacidadMaxPax || (m as any).capacidadPersonas || (m as any).capacidad || 4;
        const est = estadoMesaToLabel((m as any).estado);
        const habitacionVinculada = (m as any).habitacionAsignadaId || (m as any).habitacionVinculada || undefined;
        let comanda: PosVistaMesaRow['comanda'] | undefined;
        const c = comandasPorMesa.get(m.id);
        if (c) {
          const detalles = (c as any).detalles || [];
          const numStr = String(c.numeroCorrelativo || (c as any).numero || '');
          const num = parseInt(numStr.replace(/\D/g, ''), 10) || 1000;
          comanda = {
            id: c.id, numero: num, estado: estadoComandaToLabel(c.estado),
            itemsCantidad: detalles.length || Math.round(((c as any).totalComanda || (c as any).total || 0) / 20),
            mozoNombre: (c as any).mozoAsignadoNombre || (c as any).usuarioIdMozoApertura || 'Mozo',
            total: Number((c as any).totalComanda || (c as any).total || 0),
          };
          if (comanda.itemsCantidad === 0 && comanda.total > 0) comanda.itemsCantidad = 1;
        }
        return { id: m.id, nombre, capacidad, estado: est, habitacionVinculada, comanda };
      });
      setVistaMesas(rows);
    } catch { setVistaMesas([]); } finally { setLoading(false); }
  };
  useIonViewWillEnter(() => { cargar(); });

  // --- Cart helpers ---
  const agregarCarta = (p: typeof PRODUCTOS_CARTA_DEMO[number]) => {
    setCarrito(c => {
      const existente = c.find(l => l.productoId === p.id);
      if (existente) return c.map(l => l.id === existente.id ? { ...l, cantidad: l.cantidad + 1 } : l);
      return [...c, { id: uid(), tipo: 'CARTA', productoId: p.id, nombre: p.nombre, cantidad: 1, precioUnit: p.precio, icon: p.icon }];
    });
  };
  const agregarStock = (p: typeof PRODUCTOS_STOCK_DEMO[number]) => {
    const stk = Number(p._stock ?? 0);
    if (stk <= 0 && !p.permiteInventarioNegativo) { mostrarToast(`${p.nombre}: sin stock disponible`); return; }
    setProdStockLocal(ps => ps.map(x => x.id === p.id ? { ...x, _stock: Math.max(0, Number(x._stock ?? 0) - 1) } : x));
    setCarrito(c => {
      const existente = c.find(l => l.productoId === p.id);
      if (existente) return c.map(l => l.id === existente.id ? { ...l, cantidad: l.cantidad + 1 } : l);
      return [...c, { id: uid(), tipo: 'STOCK', productoId: p.id, nombre: p.nombre, cantidad: 1, precioUnit: Number(p.precioVentaBase || 0) }];
    });
  };
  const modificarCantidad = (id: string, delta: number) => {
    setCarrito(c => {
      const linea = c.find(l => l.id === id);
      if (!linea) return c;
      const nuevaCant = linea.cantidad + delta;
      if (nuevaCant <= 0) {
        // si era stock, devolvemos el stock
        if (linea.tipo === 'STOCK' && linea.productoId) {
          setProdStockLocal(ps => ps.map(p => p.id === linea.productoId ? { ...p, _stock: Number(p._stock ?? 0) + linea.cantidad } : p));
        }
        return c.filter(l => l.id !== id);
      }
      // si es stock y aumentamos, validar
      if (delta > 0 && linea.tipo === 'STOCK' && linea.productoId) {
        const p = prodStockLocal.find(pp => pp.id === linea.productoId);
        if (p && !p.permiteInventarioNegativo && Number(p._stock ?? 0) <= 0) { mostrarToast(`${p.nombre}: sin stock`); return c; }
        if (p && !p.permiteInventarioNegativo) setProdStockLocal(ps => ps.map(pp => pp.id === linea.productoId ? { ...pp, _stock: Math.max(0, Number(pp._stock ?? 0) - 1) } : pp));
      }
      if (delta < 0 && linea.tipo === 'STOCK' && linea.productoId) {
        setProdStockLocal(ps => ps.map(pp => pp.id === linea.productoId ? { ...pp, _stock: Number(pp._stock ?? 0) + 1 } : pp));
      }
      return c.map(l => l.id === id ? { ...l, cantidad: nuevaCant } : l);
    });
  };

  const confirmarServicioExtra = () => {
    const { nombre, precio, cantidad, observaciones } = servExtraForm;
    if (!nombre.trim() || Number(precio) <= 0 || Number(cantidad) <= 0) {
      mostrarToast('Nombre, precio y cantidad son obligatorios'); return;
    }
    setCarrito(c => [...c, {
      id: uid(), tipo: 'SERVICIO_EXTRA', nombre: nombre.trim(),
      cantidad: Number(cantidad), precioUnit: Number(precio),
      observaciones: observaciones?.trim() || undefined,
      icon: '🚕',
    }]);
    setModalServExtra(false);
    setServExtraForm({ nombre: '', precio: 0, cantidad: 1, observaciones: '' });
    mostrarToast(`✅ Servicio "${nombre}" añadido al carrito`);
  };

  const { subtotal, igv, total } = useMemo(() => {
    let s = 0;
    carrito.forEach(l => { s += l.cantidad * l.precioUnit; });
    const igvCalc = Number((s * 18 / 118).toFixed(2));
    return { subtotal: s, igv: igvCalc, total: s };
  }, [carrito]);

  const totalItems = useMemo(() => carrito.reduce((ac, l) => ac + l.cantidad, 0), [carrito]);

  const irACobrar = () => {
    if (carrito.length === 0) { mostrarToast('Agrega al menos 1 producto para cobrar'); return; }
    setPagoForm({ metodoPago: 'EFECTIVO_PEN', monto: total, moneda: 'PEN', referencia: '', observaciones: '', codigoAutorizacion: '' });
    setModalCobrar(true);
  };

  const confirmarVenta = () => {
    if (!pagoForm || Number(pagoForm.monto) <= 0) { mostrarToast('Monto inválido'); return; }
    const nuevaVenta: VentaHistorialItem = {
      id: 'V-' + Date.now().toString().slice(-6),
      fecha: fechaHoy(),
      cliente: clienteForm.nombre?.trim() || 'Cliente Eventual',
      lineas: JSON.parse(JSON.stringify(carrito)),
      total,
      metodoPago: pagoForm.metodoPago,
      montoPagado: Number(pagoForm.monto),
      referencia: pagoForm.referencia || pagoForm.codigoAutorizacion || pagoForm.observaciones || undefined,
      estado: 'PAGADA',
    };
    setHistorial(h => [nuevaVenta, ...h]);
    // limpiar
    setCarrito([]);
    setClienteForm({ ...clienteForm, dni: '', telefono: '' });
    setModalCobrar(false);
    mostrarToast('✅ Venta cobrada exitosamente');
    setTimeout(() => { setModalNotaVenta(nuevaVenta); }, 300);
  };

  const imprimirNota = (v: VentaHistorialItem) => {
    setModalNotaVenta(v);
  };
  const doWindowPrint = () => {
    setTimeout(() => window.print(), 60);
  };

  // ========== Categorias memo ==========
  const categoriasCartaFull = useMemo(() => ['Todos', ...CATEGORIAS_CARTA], []);

  // ============ RENDER ============
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>POS · Comida y Bebida</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as any)}>
            <IonSegmentButton value="walkin"><IonIcon icon={cart} />&nbsp;Walk-in (Eventual)</IonSegmentButton>
            <IonSegmentButton value="mesas"><IonIcon icon={receiptOutline} />&nbsp;Mesas / Room Service</IonSegmentButton>
            <IonSegmentButton value="historial"><IonIcon icon={checkmarkCircle} />&nbsp;Historial</IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="pos-page">
        {toast && <div className="toast-flash">{toast}</div>}

        {/* =============== WALK-IN =============== */}
        {tab === 'walkin' && (
          <IonGrid className="walkin-grid">
            <IonRow>
              {/* ===== Columna 1: Productos ===== */}
              <IonCol size="12" sizeMd="8">
                {/* Cliente */}
                <IonCard className="card-cliente">
                  <IonCardContent style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#2dd36f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                          {String(clienteForm.nombre || 'C').trim().charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{clienteForm.nombre || 'Cliente Eventual'}</div>
                          <div style={{ fontSize: 12, opacity: 0.8 }}>
                            {clienteForm.dni && `DNI ${clienteForm.dni} · `}
                            {clienteForm.telefono || 'Cliente eventual sin reserva'}
                          </div>
                        </div>
                      </div>
                      <IonButton size="small" fill="outline" onClick={() => setModalCliente(true)}><IonIcon icon={person} slot="start" />&nbsp;Cliente</IonButton>
                    </div>
                  </IonCardContent>
                </IonCard>

                {/* Categorías Filtro */}
                <div className="chips-filtro">
                  {categoriasCartaFull.map(c => (
                    <IonChip
                      key={c}
                      color={categoriaCartaSel === c ? 'success' : 'outline'}
                      onClick={() => setCategoriaCartaSel(c)}
                      style={{ cursor: 'pointer' }}
                    >{c}</IonChip>
                  ))}
                </div>

                {/* Stock (Bebidas, Snacks con inventario) */}
                <div className="seccion-prod">
                  <h4 className="tit-seccion">🥤 Productos con Stock (bebidas / snacks / extras)</h4>
                  <div className="grid-prod-sm">
                    {prodStockLocal.filter(p => p.estadoProducto !== 'INACTIVO' && p.estadoProducto !== 'DESCONTINUADO').map(p => {
                      const stk = Number(p._stock ?? 0);
                      const min = Number(p._stockMin ?? p.stockMinimo ?? 0);
                      const agotado = stk <= 0;
                      const bajo = stk <= min;
                      return (
                        <IonCard className={`prod-card ${agotado ? 'prod-agotado' : ''}`} key={p.id} button onClick={() => agregarStock(p)}>
                          <IonCardContent style={{ padding: '10px 10px 12px 10px' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.1, minHeight: 36 }}>{p.nombre}</div>
                            <div style={{ fontSize: 11, opacity: 0.85, margin: '3px 0 8px 0' }}>{p.categoriaNombre || 'General'} · Disp: <b>{stk}</b></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <div style={{ fontSize: 11, color: agotado ? '#dc2626' : (bajo ? '#d97706' : 'inherit') }}>{agotado ? '⛔ AGOTADO' : (bajo ? '⚠️ STOCK BAJO' : '')}</div>
                              <div style={{ fontWeight: 900, fontSize: 17 }}>{fmtSoles(Number(p.precioVentaBase || 0))}</div>
                            </div>
                          </IonCardContent>
                        </IonCard>
                      );
                    })}
                  </div>
                </div>

                {/* Carta */}
                <div className="seccion-prod">
                  <h4 className="tit-seccion">🍽️ Carta · Alimentos preparados</h4>
                  {(() => {
                    const lista = categoriaCartaSel === 'Todos'
                      ? PRODUCTOS_CARTA_DEMO
                      : PRODUCTOS_CARTA_DEMO.filter(p => p.categoria === categoriaCartaSel);
                    return (
                      <div className="grid-prod-md">
                        {lista.map(p => (
                          <IonCard className="prod-card" key={p.id} button onClick={() => agregarCarta(p)}>
                            <IonCardContent style={{ padding: '10px 10px 12px 10px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <div style={{ fontSize: 24 }}>{p.icon || '🍴'}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 800, fontSize: 14 }}>{p.nombre}</div>
                                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{p.categoria}</div>
                                </div>
                                <div style={{ fontWeight: 900, fontSize: 17, whiteSpace: 'nowrap' }}>{fmtSoles(p.precio)}</div>
                              </div>
                            </IonCardContent>
                          </IonCard>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Servicio extra */}
                <div style={{ padding: '0 2px 14px 2px' }}>
                  <IonButton expand="block" color="primary" onClick={() => setModalServExtra(true)}>
                    <IonIcon slot="start" icon={pricetag} />
                    Añadir Servicio Extra (Taxi · Tour · Lavandería · manual)
                  </IonButton>
                </div>
              </IonCol>

              {/* ===== Columna 2: Carrito + Cobrar ===== */}
              <IonCol size="12" sizeMd="4">
                <div className="carrito-sticky">
                  <IonCard>
                    <IonCardHeader>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <IonCardTitle>🛒 Carrito</IonCardTitle>
                        <span style={{ fontSize: 13, opacity: 0.8 }}>{totalItems} item(s)</span>
                      </div>
                    </IonCardHeader>
                    <IonCardContent style={{ padding: '8px 12px 12px' }}>
                      {carrito.length === 0 && <IonNote color="medium" style={{ display: 'block', textAlign: 'center', padding: '32px 0' }}>Carrito vacío. Toca productos del lado izquierdo.</IonNote>}
                      <IonList lines="full">
                        {carrito.map(l => {
                          const subt = l.cantidad * l.precioUnit;
                          return (
                            <IonItem key={l.id}>
                              <IonLabel>
                                <h2 style={{ margin: 0 }}>
                                  {l.tipo === 'SERVICIO_EXTRA' ? '🚕' : (l.icon || '')} {l.nombre}
                                  <IonBadge color={l.tipo === 'STOCK' ? 'tertiary' : (l.tipo === 'CARTA' ? 'warning' : 'primary')} style={{ marginLeft: 6, fontSize: 11 }}>{l.tipo.replace('_', ' ')}</IonBadge>
                                </h2>
                                <p style={{ margin: '3px 0 0 0', opacity: 0.85, fontSize: 12 }}>
                                  {l.cantidad} x {fmtSoles(l.precioUnit)} = <b>{fmtSoles(subt)}</b>
                                  {l.observaciones && <span> · Obs: {l.observaciones}</span>}
                                </p>
                              </IonLabel>
                              <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <IonButton size="small" color="medium" fill="solid" onClick={() => modificarCantidad(l.id, -1)}><IonIcon icon={remove} /></IonButton>
                                <div style={{ minWidth: 24, textAlign: 'center', fontWeight: 800 }}>{l.cantidad}</div>
                                <IonButton size="small" color="success" fill="solid" onClick={() => modificarCantidad(l.id, +1)}><IonIcon icon={add} /></IonButton>
                              </div>
                            </IonItem>
                          );
                        })}
                      </IonList>
                      {carrito.length > 0 && (
                        <>
                          <IonCard color="primary" style={{ margin: '14px 0 10px 0' }}>
                            <IonCardContent style={{ padding: '12px 16px' }}>
                              <IonGrid style={{ margin: 0, padding: 0 }}>
                                <IonRow>
                                  <IonCol size="6" style={{ padding: '2px 6px' }}>Subtotal</IonCol>
                                  <IonCol size="6" style={{ padding: '2px 6px', textAlign: 'right' }}>{fmtSoles(subtotal)}</IonCol>
                                </IonRow>
                                <IonRow>
                                  <IonCol size="6" style={{ padding: '2px 6px' }}>IGV (18%)</IonCol>
                                  <IonCol size="6" style={{ padding: '2px 6px', textAlign: 'right' }}>{fmtSoles(igv)}</IonCol>
                                </IonRow>
                              </IonGrid>
                              <hr style={{ opacity: 0.25, margin: '8px 0' }} />
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <div style={{ fontSize: 17, fontWeight: 800 }}>TOTAL</div>
                                <div style={{ fontSize: 28, fontWeight: 900 }}>{fmtSoles(total)}</div>
                              </div>
                            </IonCardContent>
                          </IonCard>
                          <IonButton expand="block" color="success" size="large" onClick={irACobrar}>
                            <IonIcon slot="start" icon={cash} />COBRAR
                          </IonButton>
                        </>
                      )}
                    </IonCardContent>
                  </IonCard>
                </div>
              </IonCol>
            </IonRow>
          </IonGrid>
        )}

        {/* =============== MESAS / ROOM SERVICE =============== */}
        {tab === 'mesas' && (
          <div style={{ padding: '10px 8px' }}>
            <div className="pos-legend">
              <IonChip color="success">Libre</IonChip>
              <IonChip color="danger">Ocupada</IonChip>
              <IonChip color="warning">En limpieza</IonChip>
              <IonChip color="tertiary">En cocina</IonChip>
              <IonChip color="success">Lista</IonChip>
            </div>

            <IonGrid className="table-grid ion-margin-top">
              <IonRow>
                {loading && [0,1,2,3,4,5].map(i => (
                  <IonCol key={i} size="12" size-sm="6" size-md="4" size-lg="4" size-xl="3">
                    <IonCard>
                      <IonCardHeader><IonSkeletonText animated style={{ width: '40%' }} /><IonCardSubtitle><IonSkeletonText animated style={{ width: '70%' }} /></IonCardSubtitle></IonCardHeader>
                      <IonCardContent><IonSkeletonText animated style={{ width: '90%' }} /><p><IonSkeletonText animated style={{ width: '70%' }} /></p></IonCardContent>
                    </IonCard>
                  </IonCol>
                ))}
                {!loading && vistaMesas.length === 0 && (
                  <IonCol size="12">
                    <IonCard>
                      <IonCardContent style={{ textAlign: 'center', padding: '32px 16px' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
                        <strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                          Restaurante operando solo en modo Room Service
                        </strong>
                        <p style={{ margin: '4px 0', color: 'var(--ion-color-medium)' }}>No hay mesas físicas de salón habilitadas.</p>
                        <p style={{ margin: '8px 0 0', fontWeight: 500 }}>Para agregar consumo:</p>
                        <ol style={{ textAlign: 'left', display: 'inline-block', margin: '8px auto 0', paddingLeft: 22, color: 'var(--ion-color-medium-shade)' }}>
                          <li>Ir a la pantalla <strong>Habitaciones</strong></li>
                          <li>Hacer clic en una habitación <strong>OCUPADA</strong></li>
                          <li>Elegir opción <strong>Agregar Consumo / Room Service</strong> o <strong>Vender Productos</strong></li>
                        </ol>
                        <p style={{ marginTop: 16 }}>
                          <IonButton color="primary" routerLink="/habitaciones"><IonIcon slot="start" icon={receiptOutline} />Ir a Habitaciones</IonButton>
                        </p>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                )}
                {!loading && vistaMesas.map((m) => {
                  const openParaMesa = (mesa: PosVistaMesaRow) => {
                    setPreMesaId(mesa.id); setPreHabitacionId(undefined); setPreTipoConsumo('MESA');
                    setComandaAEditarId(mesa.comanda?.id); setTomarComandaOpen(true);
                  };
                  return (
                    <IonCol key={m.id} size="12" size-sm="6" size-md="4" size-lg="4" size-xl="3">
                      <IonCard button className={`pos-mesa pos-${m.estado}`} onClick={() => openParaMesa(m)}>
                        <IonCardHeader>
                          <div className="pos-row">
                            <IonCardTitle>{m.nombre}</IonCardTitle>
                            <IonBadge color={mesaColor[m.estado]}>{m.estado.toUpperCase()}</IonBadge>
                          </div>
                          <IonCardSubtitle>Capacidad: {m.capacidad} pax</IonCardSubtitle>
                          {m.habitacionVinculada && <IonLabel className="hab-ref">Vinculada a habitación: {m.habitacionVinculada}</IonLabel>}
                        </IonCardHeader>
                        <IonCardContent>
                          {m.comanda ? (
                            <>
                              <div className="comanda-row">
                                <span><strong>#{m.comanda.numero}</strong> — {comandaBadge[m.comanda.estado].label}</span>
                                <IonBadge color={comandaBadge[m.comanda.estado].color}>{comandaBadge[m.comanda.estado].label}</IonBadge>
                              </div>
                              <p className="ion-no-margin">{m.comanda.itemsCantidad} platos · Mozo: {m.comanda.mozoNombre}</p>
                              <p className="ion-no-margin total">Total: <strong>{fmtSoles(m.comanda.total || 0)}</strong></p>
                            </>
                          ) : <p className="sin-comanda">Sin comanda activa</p>}
                        </IonCardContent>
                      </IonCard>
                    </IonCol>
                  );
                })}
              </IonRow>
            </IonGrid>

            <div style={{ position: 'fixed', right: 24, bottom: 90, zIndex: 999 }}>
              <button
                onClick={openNuevoRoomService}
                title="🧾 Nueva comanda / Room Service"
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: '#2dd36f',
                  color: '#fff',
                  fontSize: 26,
                  fontWeight: 900,
                  border: 'none',
                  boxShadow: '0 8px 20px rgba(45,211,111,.35), 0 4px 12px rgba(0,0,0,.18)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* =============== HISTORIAL =============== */}
        {tab === 'historial' && (
          <div style={{ padding: '8px 6px 80px 6px' }}>
            {historial.length === 0 && (
              <IonCard><IonCardContent style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🧾</div>
                <strong>Sin ventas aún.</strong>
                <p style={{ color: 'var(--ion-color-medium)', margin: '6px 0 0' }}>Realiza tu primera venta Walk-in Eventual desde la pestaña "Walk-in".</p>
              </IonCardContent></IonCard>
            )}
            {historial.map(v => (
              <IonCard key={v.id}>
                <IonCardHeader>
                  <div className="pos-row">
                    <div>
                      <IonCardTitle style={{ fontSize: 15 }}>
                        {v.cliente} <IonBadge style={{ marginLeft: 6 }} color={v.estado === 'PAGADA' ? 'success' : 'danger'}>{v.estado}</IonBadge>
                      </IonCardTitle>
                      <IonCardSubtitle>{v.id} · {v.fecha} · Método: {METODOS_PAGO_LISTA.find(m => m.id === v.metodoPago)?.label || v.metodoPago}</IonCardSubtitle>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 900 }}>{fmtSoles(v.total)}</div>
                    </div>
                  </div>
                </IonCardHeader>
                <IonCardContent style={{ padding: '4px 16px 16px' }}>
                  <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
                    {v.lineas.map((l, i) => (
                      <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, padding: '2px 0', borderBottom: i < v.lineas.length - 1 ? '1px dashed #e5e7eb' : 'none' }}>
                        <span>{l.cantidad}x {l.nombre}</span>
                        <span style={{ flexShrink: 0, fontWeight: 600 }}>{fmtSoles(l.cantidad * l.precioUnit)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <IonButton size="small" fill="solid" color="primary" onClick={() => imprimirNota(v)}><IonIcon slot="start" icon={receiptOutline} />Ver / Imprimir Nota</IonButton>
                  </div>
                </IonCardContent>
              </IonCard>
            ))}
          </div>
        )}

        {/* ===== MODAL: DATOS CLIENTE ===== */}
        {modalCliente && (
          <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModalCliente(false); }}>
            <div className="modal-card">
              <div className="modal-head"><h3>👥 Datos del Cliente</h3><IonButton fill="clear" size="small" onClick={() => setModalCliente(false)}><IonIcon icon={close} /></IonButton></div>
              <IonGrid>
                <IonRow>
                  <IonCol size="12"><IonItem><IonLabel position="stacked">Nombre / Razón Social *</IonLabel><IonInput value={clienteForm.nombre} onIonInput={e => setClienteForm({ ...clienteForm, nombre: String(e.detail.value || '') })} placeholder="Ej: Turistas grupo bus 4 pax" /></IonItem></IonCol>
                  <IonCol size="6"><IonItem><IonLabel position="stacked">DNI / RUC / Doc</IonLabel><IonInput value={clienteForm.dni} onIonInput={e => setClienteForm({ ...clienteForm, dni: String(e.detail.value || '') })} /></IonItem></IonCol>
                  <IonCol size="6"><IonItem><IonLabel position="stacked">Teléfono</IonLabel><IonInput value={clienteForm.telefono} onIonInput={e => setClienteForm({ ...clienteForm, telefono: String(e.detail.value || '') })} /></IonItem></IonCol>
                </IonRow>
              </IonGrid>
              <div className="modal-foot">
                <IonButton color="primary" onClick={() => { if (!clienteForm.nombre?.trim()) { mostrarToast('Ingresa al menos un nombre'); return; } setModalCliente(false); }}>Guardar</IonButton>
                <IonButton color="medium" fill="outline" onClick={() => setModalCliente(false)}>Cancelar</IonButton>
              </div>
            </div>
          </div>
        )}

        {/* ===== MODAL: SERVICIO EXTRA ===== */}
        {modalServExtra && (
          <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModalServExtra(false); }}>
            <div className="modal-card">
              <div className="modal-head"><h3>🚕 + Servicio Extra (Manual)</h3><IonButton fill="clear" size="small" onClick={() => setModalServExtra(false)}><IonIcon icon={close} /></IonButton></div>
              <IonGrid>
                <IonRow>
                  <IonCol size="12"><IonItem><IonLabel position="stacked">Nombre servicio *</IonLabel><IonInput placeholder="Ej: Taxi aeropuerto salida 6am" value={servExtraForm.nombre} onIonInput={e => setServExtraForm({ ...servExtraForm, nombre: String(e.detail.value || '') })} /></IonItem></IonCol>
                  <IonCol size="6"><IonItem><IonLabel position="stacked">Precio S/ *</IonLabel><IonInput type="number" value={servExtraForm.precio || ''} onIonInput={e => setServExtraForm({ ...servExtraForm, precio: Number(e.detail.value || 0) })} /></IonItem></IonCol>
                  <IonCol size="6"><IonItem><IonLabel position="stacked">Cantidad</IonLabel><IonInput type="number" value={servExtraForm.cantidad || ''} onIonInput={e => setServExtraForm({ ...servExtraForm, cantidad: Math.max(1, Number(e.detail.value || 1)) })} /></IonItem></IonCol>
                  <IonCol size="12"><IonItem><IonLabel position="stacked">Observaciones</IonLabel><IonTextarea rows={2} placeholder="Ej: Maleta x2, 1 adulto + 1 niño" value={servExtraForm.observaciones} onIonInput={e => setServExtraForm({ ...servExtraForm, observaciones: String(e.detail.value || '') })} /></IonItem></IonCol>
                </IonRow>
              </IonGrid>
              {Number(servExtraForm.precio) > 0 && (
                <IonCard color="tertiary" style={{ margin: '10px 0' }}><IonCardContent style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div>Total</div>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{fmtSoles(Number(servExtraForm.precio) * Number(servExtraForm.cantidad))}</div>
                </IonCardContent></IonCard>
              )}
              <div className="modal-foot">
                <IonButton color="primary" onClick={confirmarServicioExtra}>Agregar al Carrito</IonButton>
                <IonButton color="medium" fill="outline" onClick={() => setModalServExtra(false)}>Cancelar</IonButton>
              </div>
            </div>
          </div>
        )}

        {/* ===== MODAL: COBRO ===== */}
        {modalCobrar && (
          <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModalCobrar(false); }}>
            <div className="modal-card">
              <div className="modal-head"><h3>💳 Cobrar · {totalItems} item(s)</h3><IonButton fill="clear" size="small" onClick={() => setModalCobrar(false)}><IonIcon icon={close} /></IonButton></div>
              <IonCard color="warning" style={{ margin: '4px 0 12px 0' }}>
                <IonCardContent style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div><b>Total a cobrar</b></div>
                  <div style={{ fontSize: 26, fontWeight: 900 }}>{fmtSoles(total)}</div>
                </IonCardContent>
              </IonCard>
              <PagoForm value={pagoForm} onChange={setPagoForm} totalSugeridoSoles={total} />
              <div className="modal-foot">
                <IonButton color="success" onClick={confirmarVenta}><IonIcon slot="start" icon={cash} />Confirmar Venta</IonButton>
                <IonButton color="medium" fill="outline" onClick={() => setModalCobrar(false)}>Cancelar</IonButton>
              </div>
            </div>
          </div>
        )}

        {/* ===== MODAL: NOTA DE VENTA (80mm) ===== */}
        {modalNotaVenta && (
          <div className="modal-backdrop modal-wide no-print-bg" onClick={e => { if (e.target === e.currentTarget) setModalNotaVenta(null); }}>
            <div className="modal-card print-area-wrap">
              <div className="modal-head no-print">
                <h3>🧾 Nota de Venta · {modalNotaVenta.id}</h3>
                <IonButton fill="clear" size="small" onClick={() => setModalNotaVenta(null)}><IonIcon icon={close} /></IonButton>
              </div>
              <div className="nota-venta">
                <div className="nv-header">
                  <div className="nv-logo">Sumaq Allpa</div>
                  <div className="nv-nombre-empresa">Casa Sumaq Allpa</div>
                  <div className="nv-linea-uno">Nota de Venta · {modalNotaVenta.id}</div>
                  <div className="nv-linea">{modalNotaVenta.fecha}</div>
                </div>
                <div className="nv-cliente">
                  <div><b>Cliente:</b> {modalNotaVenta.cliente}</div>
                  <div><b>Método de pago:</b> {METODOS_PAGO_LISTA.find(m => m.id === modalNotaVenta.metodoPago)?.label || modalNotaVenta.metodoPago}</div>
                  {modalNotaVenta.referencia && <div><b>Referencia:</b> {modalNotaVenta.referencia}</div>}
                </div>
                <table className="nv-tabla">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>DESCRIPCIÓN</th>
                      <th style={{ textAlign: 'center' }}>CANT</th>
                      <th style={{ textAlign: 'right' }}>P.U.</th>
                      <th style={{ textAlign: 'right' }}>SUBTOT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalNotaVenta.lineas.map(l => (
                      <tr key={l.id}>
                        <td style={{ textAlign: 'left' }}>{l.nombre}{l.tipo === 'SERVICIO_EXTRA' ? ' (Servicio Extra)' : ''}</td>
                        <td style={{ textAlign: 'center' }}>{l.cantidad}</td>
                        <td style={{ textAlign: 'right' }}>{fmtSoles(l.precioUnit)}</td>
                        <td style={{ textAlign: 'right' }}>{fmtSoles(l.cantidad * l.precioUnit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="nv-totales">
                  <div className="nv-total-row"><span>SUBTOTAL:</span><span>{fmtSoles(modalNotaVenta.total)}</span></div>
                  <div className="nv-total-row"><span>IGV (incluido 18%):</span><span>{fmtSoles(Number((modalNotaVenta.total * 18 / 118).toFixed(2)))}</span></div>
                  <div className="nv-total-row nv-total-final"><span>TOTAL:</span><span>{fmtSoles(modalNotaVenta.total)}</span></div>
                  <div className="nv-total-row nv-pagado"><span>MONTO PAGADO:</span><span>{fmtSoles(modalNotaVenta.montoPagado)}</span></div>
                </div>
                <div className="nv-footer">
                  Gracias por su visita. Esperamos volver a verle pronto.
                </div>
                <div className="nv-corte">-- corte ticket --</div>
              </div>
              <div className="modal-foot no-print">
                <IonButton color="primary" onClick={doWindowPrint}><IonIcon slot="start" icon={receiptOutline} />Imprimir (Ticket 80mm)</IonButton>
                <IonButton color="medium" fill="outline" onClick={() => setModalNotaVenta(null)}>Cerrar</IonButton>
              </div>
            </div>
          </div>
        )}

        {/* TomarComanda modal (para mesas) */}
        <TomarComanda
          isOpen={tomarComandaOpen}
          onDismiss={() => {
            setTomarComandaOpen(false);
            setPreMesaId(undefined); setPreHabitacionId(undefined); setPreTipoConsumo(undefined);
            setComandaAEditarId(undefined);
            cargar();
          }}
          preMesaId={preMesaId}
          preHabitacionId={preHabitacionId}
          preTipoConsumo={preTipoConsumo}
          comandaAEditarId={comandaAEditarId}
        />
      </IonContent>
    </IonPage>
  );
};

export default PosPage;
