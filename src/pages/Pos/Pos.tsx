import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonBadge, IonLabel, IonChip, IonIcon, IonSkeletonText, IonSegment, IonSegmentButton,
  IonButton, IonInput, IonTextarea, IonSelect, IonSelectOption, IonList, IonItem, IonNote, IonText, IonButtons,
  useIonViewWillEnter,
} from '@ionic/react';
import type { Color } from '@ionic/core';
import { add, remove, cart, cash, pricetag, checkmarkCircle, receiptOutline, close, person, refresh } from 'ionicons/icons';
import TomarComanda from '../../components/modals/TomarComanda';
import PagoForm, { PagoFormValue } from '../../components/PagoForm';
import { METODOS_PAGO_LISTA } from '../../types/etapa2';
import { Mesa, Comanda, ProductoFB } from '../../types';
import { MesaService, ComandaService, CatalogoFBService, InventarioService, seedProductos, PosService, pendingSync } from '../../services';
import { supabase } from '../../services/__supabase_db__';
import './Pos.css';

const EVENTO_REFRESCAR = 'lodge:refrescarAhora' as const;

// Helper anti-parpadeo: JSON.stringify determinista
const stableStringify = (obj: any): string => {
  try {
    if (obj == null) return String(obj);
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) {
      return '[' + obj.map((v) => stableStringify(v)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const k of keys) {
      parts.push(JSON.stringify(k) + ':' + stableStringify((obj as any)[k]));
    }
    return '{' + parts.join(',') + '}';
  } catch {
    try { return JSON.stringify(obj); } catch { return String(obj); }
  }
};

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

// Helpers
const fmtSoles = (n: number) => `S/ ${Number(n || 0).toFixed(2)}`;
const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const fechaHoy = () => new Date().toLocaleString('es-PE');
const _planoStockProducto = (p: any): { stockControl: boolean; stockActual: number; stockMinimo: number } => {
  const sC = typeof p?.stockControl === 'boolean' ? p.stockControl : (p?.payload?.stockControl ?? false);
  const sA = typeof p?.stockActual === 'number' ? p.stockActual : Number(p?.payload?.stockActual ?? 0);
  const sM = typeof p?.stockMinimo === 'number' ? p.stockMinimo : Number(p?.payload?.stockMinimo ?? 0);
  return { stockControl: !!sC, stockActual: sA, stockMinimo: sM };
};

// PREVIEW: mismo helper emoji categoría que TomarComanda (coherencia visual)
const emojiCategoria = (catId: string) => {
  if (!catId) return '🍴';
  const c = String(catId).toUpperCase();
  if (c.includes('DESAYUNO')) return '🥣';
  if (c.includes('JUGO')) return '🥤';
  if (c.includes('SANDWICH') || c.includes('TRIPLE') || c.includes('SANGUCH')) return '🥪';
  if (c.includes('ENTRADA')) return '🥗';
  if (c.includes('SOPA') || c.includes('CALDO') || c.includes('CREMA')) return '🍲';
  if (c.includes('PLATO') || c.includes('PRINCIPAL')) return '🍽️';
  if (c.includes('PIZZA')) return '🍕';
  if (c.includes('BEBIDAS-FRIAS') || c === 'CAT-BEBIDAS-FRIAS' || c.includes('BEBIDA FRIA')) return '🧊';
  if (c.includes('BEBIDAS-CALIENTES') || c === 'CAT-BEBIDAS-CALIENTES' || c.includes('BEBIDA CALIENTE')) return '☕';
  if (c.includes('ALCOHOL') || c.includes('BAR') || c.includes('CERVE') || c.includes('VINO')) return '🍻';
  if (c.includes('POSTRE') || c.includes('HELADO') || c.includes('WAFFLE') || c.includes('CREPE') || c.includes('CORCHO')) return '🍰';
  if (c.includes('MINIBAR') || c.includes('SNACK') || c.includes('EXTRAS') || c.includes('SERVICIO')) return '🧃';
  return '🍴';
};

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
  const [refreshTick, setRefreshTick] = useState<number>(0);
  const refreshingRef = useRef(false);
  // Snapshots anti-parpadeo
  const snapshotMesas = useRef<string>('');
  const snapshotTick = useRef<number>(0);

  // ============== WALK-IN ==============
  const [categoriaCartaSel, setCategoriaCartaSel] = useState<string>('Todos');
  const [carrito, setCarrito] = useState<LineaVenta[]>([]);
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

  const refrescarFuerza = useCallback(async (postFlush = false) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    let huboCambioReal = false;
    try {
      setLoading(true);
      try {
        await Promise.all([
          PosService.hidratarDesdeSupabase?.(true),
        ]);
      } catch (_) {}
      try { pendingSync.applyPendingLocal?.(); } catch (_) {}
      try {
        await cargar();
      } catch (_) {}
      // postFlush también usa snapshot
    } finally {
      setLoading(false);
      refreshingRef.current = false;
      if (postFlush) {
        try { await pendingSync.processQueue?.(false); } catch (_) {}
        try { await cargar(); } catch (_) {}
      }
      // Incrementar refreshTick SÓLO si hubo un cambio real de snapshot
      if (snapshotMesas.current !== '' && huboCambioReal) {
        snapshotTick.current++;
        setRefreshTick(snapshotTick.current);
      } else if (snapshotMesas.current === '') {
        snapshotTick.current++;
        setRefreshTick(snapshotTick.current);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useIonViewWillEnter(() => {
    const catalogoVACIO_TOTAL = (() => {
      try {
        const cats = CatalogoFBService.listarCategorias?.() || [];
        const prods = CatalogoFBService.listarProductos?.({ soloActivos: false }) || [];
        return cats.length === 0 && prods.length === 0;
      } catch { return false; }
    })();
    if (catalogoVACIO_TOTAL) {
      try {
        const semilla = seedProductos as any;
        semilla?.ensureSeedInicialCompleto?.(true);
        setTimeout(() => mostrarToast('🔄 Instalando catálogo oficial por primera vez...'), 200);
      } catch (_) {}
    }
    refrescarFuerza();
  });

  // Listener evento global refresh
  useEffect(() => {
    const handler = (e: any) => {
      const quien = (e as any)?.detail?.page;
      if (!quien || quien === 'POS' || quien === 'TODAS') refrescarFuerza();
    };
    window.addEventListener(EVENTO_REFRESCAR, handler as any);
    return () => window.removeEventListener(EVENTO_REFRESCAR, handler as any);
  }, [refrescarFuerza]);

  // Realtime channels debounce 500ms (sin guard clause) — solo cuando hay cambios remotos reales
  useEffect(() => {
    let alive = true;
    let debounceId: any;
    const TABLAS = ['comandas', 'comandas_detalles', 'mesas', 'categorias_fb', 'productos_fb', 'presentaciones_fb', 'puntos_venta', 'habitaciones'];

    const recargarDebounced = () => {
      if (!alive) return;
      clearTimeout(debounceId);
      debounceId = setTimeout(async () => {
        if (!alive) return;
        try {
          await Promise.all([ PosService.hidratarDesdeSupabase?.(true) ]);
        } catch (_) {}
        try { pendingSync.applyPendingLocal?.(); } catch (_) {}
        try { cargar(); } catch (_) {}
        try { setRefreshTick(t => t + 1); } catch (_) {}
      }, 500);
    };

    const canales: any[] = [];
    try {
      const sb = (supabase as any)?.channel ? (supabase as any) : null;
      if (sb) {
        for (const t of TABLAS) {
          try {
            const ch = sb.channel(`rt-pos-${t}-${Math.random().toString(36).slice(2,7)}`)
              .on('postgres_changes', { event: '*' as any, schema: 'public', table: t }, recargarDebounced)
              .subscribe();
            canales.push(ch);
          } catch (_) {}
        }
      }
    } catch (_) {}
    return () => {
      alive = false;
      clearTimeout(debounceId);
      try {
        const sb = (supabase as any);
        Promise.all(canales.map(c => sb?.removeChannel?.(c))).catch(()=>{});
      } catch (_) {}
    };
  }, [refrescarFuerza]);
  // ===== DATOS DESDE CATÁLOGO OFICIAL (seed o Supabase) =====
  const categoriasObjList = useMemo(() => {
    try {
      return (CatalogoFBService.listarCategorias?.() || [])
        .filter(x => x.estado === 'ACTIVO' || x.estado === undefined)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    } catch {
      return [] as any[];
    }
  }, [refreshTick]);

  const categoriasCartaList = useMemo(() => {
    const nombres = categoriasObjList.map((c: any) => c.nombre);
    return ['Todos', ...Array.from(new Set(nombres))];
  }, [categoriasObjList]);

  const catMapById = useMemo(() => {
    const map = new Map<string, any>();
    for (const c of categoriasObjList) map.set(c.id, c);
    return map;
  }, [categoriasObjList]);

  const catOrdenById = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categoriasObjList) map.set(c.id, Number(c.orden ?? 0));
    return map;
  }, [categoriasObjList]);

  const productosTodos = useMemo(() => {
    try {
      let lista = (CatalogoFBService.listarProductos?.({ soloActivos: true }) || []) as any[];
      if (!lista || lista.length === 0) {
        const seed = seedProductos as any;
        if (seed?.ensureSeedInicialCompleto) seed.ensureSeedInicialCompleto(false);
        lista = (CatalogoFBService.listarProductos?.({ soloActivos: true }) || []) as any[];
      }
      // FIX CACHE: Recargar categorías al vuelo para MAPEAR POR NOMBRE si categoriaId es huérfano (muy común después wipe force)
      let categoriasVuelo: any[] = [];
      try { categoriasVuelo = CatalogoFBService.listarCategorias?.() || []; } catch {}
      const catNombreToOrden = new Map<string, number>();
      for (const cc of categoriasVuelo) catNombreToOrden.set(String(cc.nombre || '').toUpperCase().trim(), Number(cc.orden ?? 9000));

      return lista.map((p: any) => {
        const plano = _planoStockProducto(p);
        const catId = p.categoriaId;
        let cat = catMapById.get(catId);
        let ordenCat = catOrdenById.get(catId);

        // FALLBACK ROBUSTO: Si categoriaId no existe en mapa (id huérfano o borrado), buscar categoría POR NOMBRE DEL PRODUCTO / catNombre anterior
        if (!cat || ordenCat === undefined) {
          const catNameGuess = (p.categoriaNombre || p.categoria || '').toString().toUpperCase().trim();
          if (catNameGuess && catNombreToOrden.has(catNameGuess)) {
            ordenCat = catNombreToOrden.get(catNameGuess) as number;
          }
          // Intento 2: buscar categoría más probable por nombre producto
          if (ordenCat === undefined) {
            const nombreProducto = String(p.nombre || '').toUpperCase();
            for (const [nom, ord] of catNombreToOrden.entries()) {
              if (nom && (nombreProducto.includes(nom.slice(0, 4)) || nom.includes(nombreProducto.slice(0, 4)))) {
                ordenCat = ord; break;
              }
            }
          }
          if (ordenCat === undefined) ordenCat = 9999;
        }
        const catNombreFinal = cat?.nombre
          || (Array.from(catNombreToOrden.entries()).find(([, o]) => o === ordenCat)?.[0])
          || 'Sin categoría';

        return {
          id: p.id,
          sku: p.codigo,
          nombre: p.nombre,
          descripcion: p.descripcion || '',
          categoriaId: catId,
          categoriaNombre: catNombreFinal,
          categoriaOrden: ordenCat,
          precioVentaBase: Number(p.precioVentaBase || 0),
          moneda: 'PEN',
          impuesto: 'IGV',
          estadoProducto: p.estado || 'ACTIVO',
          estado: p.estado || 'ACTIVO',
          requierePreparacion: !plano.stockControl,
          permiteInventarioNegativo: false,
          stockActual: plano.stockActual,
          stockMinimo: plano.stockMinimo,
          stockControl: plano.stockControl,
          orden: p.orden ?? 0,
          _stock: plano.stockActual,
          _stockMin: plano.stockMinimo,
        } as unknown as (ProductoFB & { _stock?: number; _stockMin?: number; categoriaNombre?: string; categoriaOrden?: number; stockControl?: boolean; orden?: number });
      }).sort((a: any, b: any) => {
        // NIVEL 1: Prioridad categoriaOrden (10 Desayunos, 20 Jugos... 9999 Sin categoría)
        const cA = Number(a.categoriaOrden ?? 9999);
        const cB = Number(b.categoriaOrden ?? 9999);
        if (cA !== cB) return cA - cB;
        // NIVEL 2 (FALLBACK): Si ambos tienen =9999 → ordenar POR categoriaNombre ALFABETICO para agrupar iguales
        const nA = String(a.categoriaNombre || '').toUpperCase();
        const nB = String(b.categoriaNombre || '').toUpperCase();
        if (nA !== nB) return nA < nB ? -1 : 1;
        // NIVEL 3: Orden producto dentro de la misma categoría
        return Number(a.orden ?? 0) - Number(b.orden ?? 0);
      });
    } catch {
      return [] as any[];
    }
  }, [refreshTick, catMapById, catOrdenById]);

  const cantidadesCarritoPorProducto = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of carrito) {
      if (l.productoId) {
        map.set(l.productoId, (map.get(l.productoId) || 0) + Number(l.cantidad || 0));
      }
    }
    return map;
  }, [carrito]);

  const productosFiltradosVisual = useMemo(() => {
    let lista = productosTodos.filter(p =>
      (p as any).estadoProducto !== 'INACTIVO' &&
      (p as any).estadoProducto !== 'DESCONTINUADO'
    );
    if (categoriaCartaSel !== 'Todos') {
      lista = lista.filter(p => (p as any).categoriaNombre === categoriaCartaSel);
    }
    return lista.map(p => {
      const reservado = cantidadesCarritoPorProducto.get(p.id) || 0;
      return {
        ...p,
        _stock: Math.max(0, Number((p as any)._stock ?? 0) - reservado),
        _reservadoEnCarrito: reservado,
      };
    });
  }, [productosTodos, categoriaCartaSel, cantidadesCarritoPorProducto]);

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
      const snap = stableStringify(rows);
      if (snap !== snapshotMesas.current) {
        snapshotMesas.current = snap;
        setVistaMesas(rows);
        snapshotTick.current++;
        setRefreshTick(snapshotTick.current);
      }
    } catch {
      if (snapshotMesas.current !== '[]') {
        snapshotMesas.current = '[]';
        setVistaMesas([]);
        snapshotTick.current++;
        setRefreshTick(snapshotTick.current);
      }
    } finally { setLoading(false); }
  };

  // Realtime channels debounce 500ms (sin guard clause) — solo cuando hay cambios remotos reales
  useEffect(() => {
    let alive = true;
    let debounceId: any;
    const TABLAS = ['comandas', 'comandas_detalles', 'mesas', 'categorias_fb', 'productos_fb', 'presentaciones_fb', 'puntos_venta', 'habitaciones'];

    const recargarDebounced = () => {
      if (!alive) return;
      clearTimeout(debounceId);
      debounceId = setTimeout(async () => {
        if (!alive) return;
        try {
          await Promise.all([ PosService.hidratarDesdeSupabase?.(true) ]);
        } catch (_) {}
        try { pendingSync.applyPendingLocal?.(); } catch (_) {}
        try { await cargar(); } catch (_) {}
      }, 500);
    };

    const canales: any[] = [];
    try {
      const sb = (supabase as any)?.channel ? (supabase as any) : null;
      if (sb) {
        for (const t of TABLAS) {
          try {
            const ch = sb.channel(`rt-pos-${t}-${Math.random().toString(36).slice(2,7)}`)
              .on('postgres_changes', { event: '*' as any, schema: 'public', table: t }, recargarDebounced)
              .subscribe();
            canales.push(ch);
          } catch (_) {}
        }
      }
    } catch (_) {}
    return () => {
      alive = false;
      clearTimeout(debounceId);
      try {
        const sb = (supabase as any);
        Promise.all(canales.map(c => sb?.removeChannel?.(c))).catch(()=>{});
      } catch (_) {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Cart helpers ---
  const agregarProducto = (p: any) => {
    const esStock = !!p.stockControl;
    const stkReal = Number(p._stock ?? 0);
    if (esStock && stkReal <= 0 && !p.permiteInventarioNegativo) {
      mostrarToast(`${p.nombre}: sin stock disponible`);
      return;
    }
    setCarrito(c => {
      const existente = c.find(l => l.productoId === p.id && (esStock ? l.tipo === 'STOCK' : l.tipo === 'CARTA'));
      if (existente) return c.map(l => l.id === existente.id ? { ...l, cantidad: l.cantidad + 1 } : l);
      const icono = esStock ? '🥤' : '🍽️';
      return [...c, {
        id: uid(),
        tipo: esStock ? 'STOCK' : 'CARTA',
        productoId: p.id,
        nombre: p.nombre,
        cantidad: 1,
        precioUnit: Number(p.precioVentaBase || p.precio || 0),
        icon: icono,
      }];
    });
  };
  const modificarCantidad = (id: string, delta: number) => {
    setCarrito(c => {
      const linea = c.find(l => l.id === id);
      if (!linea) return c;
      const nuevaCant = linea.cantidad + delta;
      if (nuevaCant <= 0) {
        return c.filter(l => l.id !== id);
      }
      // Validar stock si delta > 0 y producto es con stock (stockControl=true)
      if (delta > 0 && linea.productoId) {
        const pp = productosTodos.find(px => px.id === linea.productoId);
        if (pp && !!pp.stockControl) {
          const reservado = cantidadesCarritoPorProducto.get(linea.productoId) || 0;
          const stockDisp = Math.max(0, Number(pp.stockActual ?? 0) - reservado);
          if (!pp.permiteInventarioNegativo && stockDisp <= 0) {
            mostrarToast(`${pp.nombre}: sin stock`); return c;
          }
        }
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
    let totalCalc = 0;
    carrito.forEach(l => { totalCalc += l.cantidad * l.precioUnit; });
    totalCalc = Number(totalCalc.toFixed(2));
    const igvCalc = Number((totalCalc * 18 / 118).toFixed(2));
    const subtotalCalc = Number((totalCalc - igvCalc).toFixed(2));
    const diff = totalCalc - Number((subtotalCalc + igvCalc).toFixed(2));
    const subtotalFinal = Number((subtotalCalc + diff).toFixed(2));
    return { subtotal: subtotalFinal, igv: igvCalc, total: totalCalc };
  }, [carrito]);

  const totalItems = useMemo(() => carrito.reduce((ac, l) => ac + l.cantidad, 0), [carrito]);

  const irACobrar = () => {
    if (carrito.length === 0) { mostrarToast('Agrega al menos 1 producto para cobrar'); return; }
    setPagoForm({ metodoPago: 'EFECTIVO_PEN', monto: total, moneda: 'PEN', referencia: '', observaciones: '', codigoAutorizacion: '' });
    setModalCobrar(true);
  };

  const confirmarVenta = () => {
    if (!pagoForm || Number(pagoForm.monto) <= 0) { mostrarToast('Monto inválido'); return; }
    const idVenta = 'V-' + Date.now().toString().slice(-6);
    // PACK D: Aplicar movimiento de inventario real (no cancelable después de cobrar)
    try {
      for (const l of carrito) {
        if (l.tipo === 'STOCK' && l.productoId && Number(l.cantidad || 0) > 0) {
          InventarioService.moverStockProducto(
            l.productoId,
            -Number(l.cantidad || 0),
            `Venta walk-in cobrada ${idVenta}`,
            'usr-walkin',
            {
              referenciaId: idVenta,
              referenciaTipo: 'VENTA_WALKIN_COBRADA',
              bloquearNegativo: false,
            }
          );
        }
      }
    } catch (e) {
      console.warn('[Pos.walkin.confirmarVenta] moverStock warn (no bloquea cobro):', (e as Error).message || e);
    }
    const nuevaVenta: VentaHistorialItem = {
      id: idVenta,
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
    setRefreshTick(t => t + 1);
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
  const categoriasCartaFull = useMemo(() => categoriasCartaList, [categoriasCartaList]);

  // ============ RENDER ============
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>POS · Comida y Bebida</IonTitle>
          <IonButtons slot="end">
            <IonButton
              size="small"
              color="light"
              onClick={() => {
                try { window.dispatchEvent(new CustomEvent(EVENTO_REFRESCAR, { detail: { page:'POS' }})); } catch(_){}
              }}
            >
              <IonIcon icon={refresh} slot="icon-only" />
            </IonButton>
          </IonButtons>
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

                {/* Categorías Filtro · PREVIEW estilo TomarComanda referencia (emoji + orden carta) */}
                <div className="chips-filtro" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  <IonChip
                    key="Todos"
                    color={categoriaCartaSel === 'Todos' ? 'success' : 'medium'}
                    outline={categoriaCartaSel !== 'Todos'}
                    onClick={() => setCategoriaCartaSel('Todos')}
                    style={{ cursor: 'pointer', fontWeight: categoriaCartaSel === 'Todos' ? 800 : 500 }}
                  >
                    <span slot="start" style={{ fontSize: 15, marginRight: 4 }}>🍽️</span>Todos los productos
                  </IonChip>
                  {categoriasObjList.map((cat: any) => (
                    <IonChip
                      key={cat.id}
                      color={categoriaCartaSel === cat.nombre ? 'success' : 'medium'}
                      outline={categoriaCartaSel !== cat.nombre}
                      onClick={() => setCategoriaCartaSel(cat.nombre)}
                      style={{ cursor: 'pointer', fontWeight: categoriaCartaSel === cat.nombre ? 800 : 500 }}
                    >
                      <span slot="start" style={{ fontSize: 15, marginRight: 4 }}>{emojiCategoria(cat.id)}</span>
                      {cat.nombre}
                    </IonChip>
                  ))}
                </div>

                {/* ====== PREVIEW: PRODUCTOS UNIFICADOS · DISEÑO MARKETPLACE = TomarComanda referencia ====== */}
                <div className="seccion-prod" style={{ marginTop: 4 }}>
                  {(() => {
                    const lista = productosFiltradosVisual;
                    if (!lista || lista.length === 0) {
                      return <IonNote color="warning" style={{padding:'16px 12px', display:'block', fontSize:13}}>No hay productos en esta categoría.</IonNote>;
                    }
                    return (
                      <IonGrid style={{ padding: 0 }}>
                        <IonRow>
                          {lista.map(p => {
                            const stockControl = Boolean(p.stockControl);
                            const stk = Number(p._stock ?? 0);
                            const min = Math.max(1, Number(p._stockMin ?? p.stockMinimo ?? 0), 3);
                            const agotado = stockControl && stk <= 0;
                            const bajo = stockControl && !agotado && stk <= min;
                            return (
                              <IonCol key={p.id} size="6" sizeMd="4" sizeLg="3">
                                <IonCard style={{ height: '100%', position: 'relative', overflow: 'hidden', opacity: agotado ? 0.58 : 1, margin: '0 0 10px 0' }}>
                                  {/* Cabecera ícono grande · PREVIEW igual TomarComanda */}
                                  <div style={{
                                    background: stockControl ? '#dbeafe' : '#ecfccb',
                                    padding: 22,
                                    fontSize: 44,
                                    textAlign: 'center',
                                    borderTopLeftRadius: 12,
                                    borderTopRightRadius: 12,
                                  }}>
                                    <span style={{ fontSize: 44 }}>{emojiCategoria(p.categoriaId)}</span>
                                    {stockControl && (
                                      <IonBadge
                                        color={agotado ? 'danger' : bajo ? 'warning' : 'primary'}
                                        style={{ position: 'absolute', top: 8, right: 8, fontSize: 11, fontWeight: 900 }}
                                      >
                                        {agotado ? 'AGOTADO' : bajo ? `DISP: ${stk}` : `Stock: ${stk}`}
                                      </IonBadge>
                                    )}
                                  </div>
                                  <IonCardContent style={{ padding: 12 }}>
                                    <IonCardTitle style={{ fontSize: 15, margin: 0, fontWeight: 800, lineHeight: 1.2 }}>
                                      {p.nombre}
                                    </IonCardTitle>
                                    <IonCardSubtitle style={{ marginTop: 4, fontSize: 12, minHeight: 34, opacity: 0.85 }}>
                                      {stockControl
                                        ? `${(p as any).sku || (p as any).codigo || ''}  ${(p as any).descripcion || ''}`.trim()
                                        : `${(p as any).descripcion || ''}`.trim()}
                                    </IonCardSubtitle>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                      <IonText color="primary" style={{ fontSize: 16, fontWeight: 900 }}>
                                        {fmtSoles(Number(p.precioVentaBase || 0))}
                                      </IonText>
                                      <IonButton
                                        color={agotado ? 'medium' : 'success'}
                                        size="small"
                                        onClick={() => !agotado && agregarProducto(p)}
                                        disabled={agotado}
                                      >
                                        <IonIcon slot="icon-only" icon={add} />
                                      </IonButton>
                                    </div>
                                  </IonCardContent>
                                </IonCard>
                              </IonCol>
                            );
                          })}
                        </IonRow>
                      </IonGrid>
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
