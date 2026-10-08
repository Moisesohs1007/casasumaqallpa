import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonBadge, IonSkeletonText, IonAlert,
  IonButton, IonIcon, IonLabel, IonItem, IonInput, IonTextarea, IonSelect, IonSelectOption, IonList, IonNote,
  useIonViewWillEnter, useIonActionSheet,
} from '@ionic/react';
import type { Color } from '@ionic/core';
import { add, remove, trash, close, save, receiptOutline, wallet, cart, person, restaurant, bed, cash, pricetag } from 'ionicons/icons';
import { Habitacion, EstadoHabitacion, ProductoFB, Reserva } from '../../types';
import { HabitacionService, ReservaService, CatalogoFBService, InventarioService, seedProductos, FolioService } from '../../services';
import CheckinModal from '../../components/modals/CheckinModal';
import CheckoutModal from '../../components/modals/CheckoutModal';
import TomarComanda from '../../components/modals/TomarComanda';
import PagoForm, { PagoFormValue } from '../../components/PagoForm';
import { METODOS_PAGO_LISTA } from '../../types/etapa2';
import './Habitaciones.css';

const estadoLabel: Record<EstadoHabitacion, string> = {
  LIBRE: 'LIBRE',
  DISPONIBLE: 'LIBRE',
  OCUPADA: 'OCUPADA',
  RESERVADA: 'RESERVADA',
  BLOQUEADA: 'BLOQUEADA',
  LIMPIEZA: 'LIMPIEZA',
  INSPECCIONADA: 'INSPECCIONADA',
  MANTENIMIENTO: 'MANTENIMIENTO',
};

const estadoColor: Record<EstadoHabitacion, Color> = {
  LIBRE: 'success',
  DISPONIBLE: 'success',
  OCUPADA: 'danger',
  RESERVADA: 'primary',
  BLOQUEADA: 'medium',
  LIMPIEZA: 'warning',
  INSPECCIONADA: 'tertiary',
  MANTENIMIENTO: 'medium',
};

const USUARIO_ACTUAL = { id: 'USR-MOISES-0001', nombres: 'Moisés', apellidos: 'Ochoa' };

// ---------- Datos mock demo (luego vendrán de Supabase) ----------
interface LineaCargo {
  id: string;
  tipo: 'ALOJAMIENTO' | 'ROOM_SERVICE' | 'PRODUCTO_STOCK' | 'SERVICIO_EXTRA' | 'PAGO';
  nombre: string;
  cantidad: number;
  precioUnit: number;
  fecha: string;
  observaciones?: string;
}
interface RegistroPago {
  id: string;
  fecha: string;
  metodoPago: string;
  monto: number;
  moneda: string;
  referencia?: string;
}
// Demo: H202 = habitación ocupada con huésped Jorge Perez, folio 700 (3 noches * 180) + desayuno2pax (60) + 1 agua500
const FOLIOS_MOCK: Record<string, {
  huesped: { nombres: string; apellidos: string; dni: string; telefono?: string; email?: string };
  reserva: { id: string; checkin: string; checkout: string; noches: number; precioNoche: number; totalAlojamiento: number };
  lineas: LineaCargo[];
  pagos: RegistroPago[];
}> = {
  'HAB-H202': {
    huesped: { nombres: 'Jorge Luis', apellidos: 'Perez Soto', dni: '10203040', telefono: '+51 914629285', email: 'jorge.perez@example.com' },
    reserva: { id: 'RES-R1001', checkin: '2026-10-06', checkout: '2026-10-09', noches: 3, precioNoche: 180, totalAlojamiento: 540 },
    lineas: [
      { id: 'L1', tipo: 'ALOJAMIENTO', nombre: 'Alojamiento 3 noches · H202 Hab Doble', cantidad: 3, precioUnit: 180, fecha: '2026-10-06 14:10' },
      { id: 'L2', tipo: 'ROOM_SERVICE', nombre: 'Desayuno 2 pax (Americano)', cantidad: 2, precioUnit: 30, fecha: '2026-10-06 08:35' },
      { id: 'L3', tipo: 'PRODUCTO_STOCK', nombre: 'Agua Mineral 500ml', cantidad: 1, precioUnit: 3.5, fecha: '2026-10-06 10:12' },
    ],
    pagos: [],
  },
};

const fmtSoles = (n: number) => `S/ ${Number(n || 0).toFixed(2)}`;
const fechaHoy = () => {
  const d = new Date();
  return d.toLocaleString('es-PE');
};
const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const _planoStockProducto = (p: any): { stockControl: boolean; stockActual: number; stockMinimo: number } => {
  const sC = typeof p?.stockControl === 'boolean' ? p.stockControl : (p?.payload?.stockControl ?? false);
  const sA = typeof p?.stockActual === 'number' ? p.stockActual : Number(p?.payload?.stockActual ?? 0);
  const sM = typeof p?.stockMinimo === 'number' ? p.stockMinimo : Number(p?.payload?.stockMinimo ?? 0);
  return { stockControl: !!sC, stockActual: sA, stockMinimo: sM };
};

// =============== COMPONENTE ===============
const HabitacionesPage: React.FC = () => {
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [present] = useIonActionSheet();
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ header: string; sub?: string }>({ header: '', sub: '' });
  const [toast, setToast] = useState('');
  const mostrarToast = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2200); };

  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinReservaId, setCheckinReservaId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutReservaId, setCheckoutReservaId] = useState<string>('');

  const [tomarComandaOpen, setTomarComandaOpen] = useState(false);
  const [habPedidoId, setHabPedidoId] = useState<string>('');

  // Props precargadas para TomarComanda (POS unificado)
  const [preHabSeleccionadaId, setPreHabSeleccionadaId] = useState<string>('');
  const [preTipoConsumoHab, setPreTipoConsumo] = useState<'MESA' | 'CARGO_A_HABITACION'>('CARGO_A_HABITACION');

  // Nuevos modals gestion huésped
  const [habSeleccionada, setHabSeleccionada] = useState<Habitacion | null>(null);
  const [modalVerFolio, setModalVerFolio] = useState(false);
  const [modalDatosHuesped, setModalDatosHuesped] = useState(false);
  const [modalVenderStock, setModalVenderStock] = useState(false);
  const [modalServicioExtra, setModalServicioExtra] = useState(false);
  const [modalRegistrarPago, setModalRegistrarPago] = useState(false);
  const [notaVentaCheckout, setNotaVentaCheckout] = useState<{ folio: any; habId: string } | null>(null);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  // Estado de lineas/pagos del folio (DEPRECATED legacy para compatibilidad con modals antiguos. La fuente ÚNICA = obtenerFolioHab())
  const [foliosLocal, setFoliosLocal] = useState<typeof FOLIOS_MOCK>(JSON.parse(JSON.stringify(FOLIOS_MOCK)));
  // Cantidades seleccionadas para vender stock (DECLARADO ANTES para dep useMemo que lo usa
  const [cantidadesVenta, setCantidadesVenta] = useState<Record<string, number>>({});

  // ===== DATOS STOCK DESDE CATÁLOGO OFICIAL (seed o Supabase) =====
  const catMapByIdHab = useMemo(() => {
    try {
      const cats = CatalogoFBService.listarCategorias?.() || [];
      const map = new Map<string, any>();
      for (const c of cats) map.set(c.id, c);
      return map;
    } catch { return new Map<string, any>(); }
  }, [refreshTick]);

  const productosStockGlobal = useMemo(() => {
    try {
      let lista = (CatalogoFBService.listarProductos?.({ soloActivos: true }) || []) as any[];
      if (!lista || lista.length === 0) {
        const seed = seedProductos as any;
        if (seed?.ensureSeedInicialCompleto) seed.ensureSeedInicialCompleto(false);
        lista = (CatalogoFBService.listarProductos?.({ soloActivos: true }) || []) as any[];
      }
      const prods = lista.map((p: any) => {
        const plano = _planoStockProducto(p);
        const cat = catMapByIdHab.get(p.categoriaId);
        return {
          id: p.id,
          sku: p.codigo,
          nombre: p.nombre,
          descripcion: p.descripcion || '',
          categoriaId: p.categoriaId,
          categoriaNombre: cat?.nombre || 'Sin categoría',
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
        } as unknown as (ProductoFB & { _stock?: number; _stockMin?: number; categoriaNombre?: string; stockControl?: boolean; orden?: number });
      }).filter((p: any) => !!p.stockControl && p.estado !== 'INACTIVO')
        .sort((a, b) => ((a as any).orden ?? 0) - ((b as any).orden ?? 0));
      // Aplicar cantidades seleccionadas en venta como "reservado" visual
      return prods.map(p => {
        const sel = Number(cantidadesVenta[p.id] || 0);
        return { ...p, _stock: Math.max(0, Number((p as any)._stock ?? 0) - sel) };
      });
    } catch {
      return [] as any[];
    }
  }, [refreshTick, catMapByIdHab, cantidadesVenta]);
  // Servicio extra form
  const [servExtraForm, setServExtraForm] = useState({ nombre: '', precio: 0, cantidad: 1, observaciones: '' });
  // Pago form
  const [pagoForm, setPagoForm] = useState<PagoFormValue | undefined>();
  // Editar datos huésped
  const [editHuesped, setEditHuesped] = useState<any>({});

  const cargar = async () => {
    setLoading(true);
    try {
      const lista = await HabitacionService.listarTodas();
      setHabitaciones(lista);
    } catch {
      setHabitaciones([]);
    } finally {
      setLoading(false);
    }
  };
  useIonViewWillEnter(() => { cargar(); });

  // ============ REFRESH POST HIDRATACION BOOT ============
  // Patron: polling 1s x 5s + listener evento custom 'lodge:hidratacion-listo'
  // (doble seguridad: App hidrata async después del primer render)
  const refrescosMax = 5;
  const intentosRef = useRef(0);
  useEffect(() => {
    let alive = true;
    const onHidratado = (e: any) => {
      if (!alive) return;
      const g = (e?.detail?.grupo || '') as string;
      if (g === 'habitaciones' || g === 'todos') cargar();
    };
    try { window.addEventListener('lodge:hidratacion-listo', onHidratado as EventListener); } catch {}
    const id = window.setInterval(() => {
      if (!alive) return;
      intentosRef.current++;
      if (intentosRef.current >= refrescosMax) {
        window.clearInterval(id);
        return;
      }
      cargar();
    }, 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
      try { window.removeEventListener('lodge:hidratacion-listo', onHidratado as EventListener); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mostrarAlerta = (header: string, sub?: string) => { setAlertMsg({ header, sub }); setAlertOpen(true); };

  const buscarReservaActivaHab = async (habId: string): Promise<string | null> => {
    try {
      const rs = await (ReservaService as any).listarTodas?.() || [];
      for (const r of rs) {
        const e = String(r.estado || '').toUpperCase().replace(/[^A-Z]/g, '');
        if (!(e.includes('CHECKIN') || e.includes('CHECKEDIN') || e.includes('RESERVA') || e.includes('CONFIRMAD'))) continue;
        const habs: any[] = (r.habitaciones || []) as any[];
        const match = habs.some((x) => {
          const id = x.habitacionId || x.habitacion?.id;
          return id === habId;
        });
        if (match) return r.id;
      }
    } catch { /* noop */ }
    return null;
  };

  const marcarEstado = async (h: Habitacion, nuevo: EstadoHabitacion) => {
    try {
      if (typeof (HabitacionService as any).actualizar === 'function') await (HabitacionService as any).actualizar(h.id, { estado: nuevo });
      else if (typeof (HabitacionService as any).cambiarEstado === 'function') await (HabitacionService as any).cambiarEstado(h.id, nuevo);
      mostrarAlerta(`Habitación ${h.codigo}`, `Estado cambiado a ${nuevo}.`);
      await cargar();
    } catch (e: any) {
      mostrarAlerta('Error', e?.message || 'No se pudo actualizar el estado.');
    }
  };

  const onClickHab = async (h: Habitacion) => {
    const est = h.estado;
    const headerAccion = `${h.codigo} · ${estadoLabel[est]}`;
    const opciones: any[] = [];

    if (est === 'LIBRE' || est === 'INSPECCIONADA') {
      opciones.push({
        text: '🔑 Check-in (solo si la reserva está confirmada)',
        handler: async () => {
          const reservaId = await buscarReservaActivaHab(h.id);
          if (!reservaId) { mostrarAlerta('Sin reserva activa', `No se encontró una reserva para ${h.codigo}. Ve a Reservas y confirma una primero.`); return; }
          setCheckinReservaId(reservaId);
          setCheckinOpen(true);
        },
      });
      opciones.push({ text: '🚧 Marcar en MANTENIMIENTO', handler: () => marcarEstado(h, 'MANTENIMIENTO') });
    }

    if (est === 'OCUPADA') {
      setHabSeleccionada(h);
      // Inicializar folio demo si no existe
      if (!foliosLocal[h.id]) {
        const tipoHabNombre = (h as any).tipoHabitacion?.nombre || 'Habitación';
        const precioNoche = Number((h as any).tipoHabitacion?.precioBaseNoche ?? (h as any).tipoPrecio ?? 180);
        const nochesDefault = 3;
        setFoliosLocal(fs => ({ ...fs, [h.id]: {
          huesped: { nombres: 'Huésped', apellidos: 'Sin nombre', dni: '', telefono: '', email: '' },
          reserva: { id: `RES-${h.codigo}-${Date.now().toString().slice(-4)}`, checkin: new Date().toISOString().slice(0, 10), checkout: new Date(Date.now() + nochesDefault * 86400000).toISOString().slice(0, 10), noches: nochesDefault, precioNoche, totalAlojamiento: precioNoche * nochesDefault },
          lineas: [{ id: uid(), tipo: 'ALOJAMIENTO', nombre: `Alojamiento ${nochesDefault} noches · ${h.codigo} ${tipoHabNombre}`, cantidad: nochesDefault, precioUnit: precioNoche, fecha: fechaHoy() }],
          pagos: [],
        } }));
      }
      setCantidadesVenta({});

      // OPCIONES 5 (3 anteriores fusionados en uno: POS unificado)
      opciones.push({ text: '👥 Datos del Huésped', handler: () => { const f = obtenerFolioHab(h); setEditHuesped({ ...(f?.huesped || { nombres: '', apellidos: '', dni: '' }) }); setModalDatosHuesped(true); } });
      opciones.push({ text: '💰 Ver Folio / Resumen Cuenta', handler: () => setModalVerFolio(true) });
      opciones.push({
        text: '🛒 POS · Agregar Consumo al Folio',
        handler: () => {
          setHabPedidoId(h.id);
          setCantidadesVenta({});
          // Se pasan props preseleccionadas a TomarComanda via state
          setPreHabSeleccionadaId(h.id);
          setPreTipoConsumo('CARGO_A_HABITACION');
          setTomarComandaOpen(true);
        },
      });
      opciones.push({ text: '💳 Registrar Pago', handler: () => {
        const f = obtenerFolioHab(h);
        const totales = calcularTotales(f?.lineas || []);
        const totalPagos = calcularTotalPagos(f?.pagos || []);
        const saldo = totales.total - totalPagos;
        setPagoForm({ metodoPago: 'EFECTIVO_PEN', monto: Math.max(0, saldo), moneda: 'PEN', referencia: '', observaciones: '', codigoAutorizacion: '' });
        setModalRegistrarPago(true);
      } });
      opciones.push({
        text: '🧾 CHECK-OUT · Imprimir Nota',
        handler: async () => {
          if (String(h.estado || '').toUpperCase() !== 'OCUPADA') {
            mostrarAlerta('Habitación libre', 'No puedes hacer check-out de una habitación que no tiene huésped. Primero haz el check-in.');
            return;
          }
          const reservaId = await buscarReservaActivaHab(h.id);
          const f = obtenerFolioHab(h);
          const totales = calcularTotales(f?.lineas || []);
          const totalPagos = calcularTotalPagos(f?.pagos || []);
          const saldo = totales.total - totalPagos;
          if (saldo > 0.01 && !reservaId) {
            mostrarAlerta('Check-out pendiente', `Saldo pendiente: ${fmtSoles(saldo)}. Registra primero el pago o haz el cobro.`);
            return;
          }
          if (reservaId) { setCheckoutReservaId(reservaId); }
          mostrarToast('🧾 Generando Nota de Check-out');
          setTimeout(() => {
            // Abrir modal Nota Venta
            setNotaVentaCheckout({ folio: JSON.parse(JSON.stringify(f || {})), habId: h.id });
          }, 400);
        },
      });
    }

    if (est === 'RESERVADA') {
      opciones.push({
        text: '🔑 Hacer Check-in ahora',
        handler: async () => {
          const reservaId = await buscarReservaActivaHab(h.id);
          if (!reservaId) { mostrarAlerta('Sin reserva', `No hay reserva asociada a ${h.codigo}.`); return; }
          setCheckinReservaId(reservaId);
          setCheckinOpen(true);
        },
      });
    }

    if (est === 'LIMPIEZA' || est === 'MANTENIMIENTO' || est === 'BLOQUEADA') {
      opciones.push({ text: '✅ Marcar como LIBRE', handler: () => marcarEstado(h, 'LIBRE') });
    }

    opciones.push({ text: 'Cancelar', role: 'cancel', data: { action: 'cancel' } });

    present({
      header: headerAccion,
      subHeader: est === 'OCUPADA' ? '5 opciones disponibles' : 'Selecciona una acción',
      buttons: opciones,
      animated: true,
      backdropDismiss: true,
    });
  };

  // ========== FUENTE ÚNICA FOLIOS (eliminado foliosLocal useState demo) ==========
  function obtenerFolioHab(h: Habitacion | null): (typeof FOLIOS_MOCK)[string] | null {
    if (!h) return null;
    try {
      // 1) Buscar folio ABIERTO oficial (FolioService)
      const folioOficial = FolioService.buscarPorHabitacionAbierta(h.id);
      const reservaActiva = (ReservaService.listarTodas() as Reserva[]).find(r => {
        const habs = (r?.habitaciones || []) as any[];
        const e = String(r.estado || '').toUpperCase().replace(/[^A-Z]/g, '');
        return (e.includes('CHECKIN') || e.includes('CHECKEDIN')) && habs.some((hh: any) => (hh.habitacionId || hh.habitacion?.id) === h.id);
      });
      // Cargar datos de huesped desde RESERVA
      const reservaData = reservaActiva ?? (folioOficial as any)?.reserva ?? null;
      const huespedTitular = (reservaData as any)?.huespedTitular ?? (reservaData as any)?.huesped ?? null;
      const nombresHuesped = huespedTitular ? `${huespedTitular.nombres ?? ''} ${huespedTitular.apellidos ?? ''}`.trim() || 'Huésped' : 'Huésped';
      const apellidosHuesped = huespedTitular?.apellidos ?? '';
      const dni = huespedTitular?.numeroDocumento ?? '';
      const telefono = huespedTitular?.telefono ?? '';
      const email = huespedTitular?.email ?? '';
      // Cargar lineas de CARGO al folio
      const folioId = folioOficial?.id;
      const cargos = folioId ? (FolioService as any)?.listarCargos?.(folioId) ?? [] : [];
      const pagos = folioId ? (FolioService as any)?.listarPagos?.(folioId) ?? [] : [];
      const lineasF: LineaCargo[] = [];
      // Alojamiento: si no hay cargo alojamiento específico, usar noches de la reserva
      let lineas = lineasF;
      if (reservaData && (!lineas.some(l => l.tipo === 'ALOJAMIENTO'))) {
        const ci = reservaData.fechaCheckin || (reservaData as any).fecha_entrada || (reservaData as any).checkin;
        const co = reservaData.fechaCheckout || (reservaData as any).fecha_salida || (reservaData as any).checkout;
        const noches = (co && ci) ? Math.max(1, Math.ceil((new Date(co).getTime() - new Date(ci).getTime()) / 86400000)) : 1;
        const precioNoche = Number(folioOficial?.totalAlojamiento ?? (reservaData as any).tarifaTotal ?? (reservaData as any).precioTotal ?? 180) / noches;
        lineas = lineas.concat([{
          id: `ALOJ-${h.id}-${noches}`,
          tipo: 'ALOJAMIENTO',
          nombre: `Alojamiento ${noches} noches · ${h.codigo} ${(h as any).tipoHabitacion?.nombre || 'Habitación'}`,
          cantidad: noches,
          precioUnit: Number(precioNoche || 180),
          fecha: ci ? new Date(ci).toLocaleString('es-PE') : fechaHoy(),
        } as LineaCargo]);
      }
      // Cargos del folio oficial a LineaCargo compat
      for (const c of cargos) {
        const cAny = c as any;
        const tipo = cAny.tipoLinea === 'PRODUCTO_STOCK' || cAny.tipo === 'STOCK' ? 'PRODUCTO_STOCK'
          : cAny.tipoLinea === 'SERVICIO_EXTRA' ? 'SERVICIO_EXTRA'
          : cAny.tipoLinea === 'ALOJAMIENTO' ? 'ALOJAMIENTO'
          : 'ROOM_SERVICE';
        if (tipo === 'ALOJAMIENTO' && lineas.some(x => x.tipo === 'ALOJAMIENTO')) continue;
        lineas.push({
          id: cAny.id || `CRG-${Math.random()}`,
          tipo,
          nombre: cAny.nombre || cAny.concepto || `Cargo ${cAny.id}`,
          cantidad: Number(cAny.cantidad || 1),
          precioUnit: Number(cAny.precioUnitario ?? cAny.montoUnitario ?? cAny.precioUnit ?? 0),
          fecha: cAny.createdAt || cAny.fecha || fechaHoy(),
          observaciones: cAny.observaciones || undefined,
        });
      }
      // Pagos a RegistroPago compat
      const pagosCompat: RegistroPago[] = pagos.map((p: any) => ({
        id: p.id ?? uid(),
        fecha: p.createdAt || p.fecha || fechaHoy(),
        metodoPago: p.metodoPago || p.formaPago || 'EFECTIVO_PEN',
        monto: Number(p.monto || p.importe || 0),
        moneda: p.moneda || 'PEN',
        referencia: p.referencia || p.nroOperacion || undefined,
      }));
      return {
        huesped: {
          nombres: nombresHuesped,
          apellidos: apellidosHuesped,
          dni: dni,
          telefono,
          email,
        },
        reserva: {
          id: reservaData?.id || folioId || '',
          checkin: reservaData?.fechaCheckin || (reservaData as any)?.fecha_entrada || '',
          checkout: reservaData?.fechaCheckout || (reservaData as any)?.fecha_salida || '',
          noches: Number(reservaData?.noches || 1),
          precioNoche: Number((h as any).tipoHabitacion?.precioBaseNoche ?? 180),
          totalAlojamiento: Number(folioOficial?.totalAlojamiento ?? (reservaData as any)?.tarifaTotal ?? 0),
        },
        lineas,
        pagos: pagosCompat,
      };
    } catch (e) {
      console.warn('[obtenerFolioHab] fallback a vacío:', e);
      return null;
    }
  }
  function calcularTotales(lineas: LineaCargo[]) {
    let totalCalc = 0;
    const detalle = lineas.filter(l => l.tipo !== 'PAGO').map(l => { const s = l.cantidad * l.precioUnit; totalCalc += s; return { ...l, subtotal: s }; });
    totalCalc = Number(totalCalc.toFixed(2));
    const igv = Number((totalCalc * 18 / 118).toFixed(2));
    const subtotalCalc = Number((totalCalc - igv).toFixed(2));
    const diff = totalCalc - Number((subtotalCalc + igv).toFixed(2));
    const subtotal = Number((subtotalCalc + diff).toFixed(2));
    return { detalle, subtotal, igv, total: totalCalc };
  }
  const calcularTotalPagos = (pagos: RegistroPago[]) => pagos.reduce((s, p) => s + Number(p.monto || 0), 0);

  // ---- Acciones ----
  const guardarDatosHuesped = () => {
    if (!habSeleccionada) return;
    if (!editHuesped.nombres || !editHuesped.apellidos) { mostrarAlerta('Faltan datos', 'Nombres y apellidos son obligatorios.'); return; }
    setFoliosLocal(fs => ({ ...fs, [habSeleccionada.id]: { ...(fs[habSeleccionada.id] as any), huesped: { ...editHuesped } } }));
    setModalDatosHuesped(false);
    mostrarToast('✅ Datos del huésped guardados');
  };

  const confirmarVentaStock = () => {
    if (!habSeleccionada) return;
    const items = Object.entries(cantidadesVenta)
      .map(([pid, c]) => { const prod = productosStockGlobal.find(p => p.id === pid); return prod && c > 0 ? { prod, cantidad: c } : null; })
      .filter(Boolean) as Array<{ prod: typeof productosStockGlobal[number]; cantidad: number }>;
    if (items.length === 0) { mostrarAlerta('Selecciona productos', 'Agrega al menos 1 producto para vender.'); return; }
    // Validar stock (real DB antes de cantidadesVenta)
    for (const it of items) {
      const stkReal = Number(it.prod.stockActual ?? 0);
      if (!it.prod.permiteInventarioNegativo && it.cantidad > stkReal) {
        mostrarAlerta('Stock insuficiente', `${it.prod.nombre}: solo hay ${stkReal} disponibles.`);
        return;
      }
    }
    // PACK D: Aplicar movimiento de inventario real (no cancelable después de confirmar)
    try {
      for (const it of items) {
        InventarioService.moverStockProducto(
          it.prod.id,
          -Number(it.cantidad || 0),
          `Venta cargo a habitación ${habSeleccionada.codigo}`,
          USUARIO_ACTUAL.id,
          {
            referenciaId: habSeleccionada.id,
            referenciaTipo: 'CARGO_HAB_STOCK',
            bloquearNegativo: false,
          }
        );
      }
    } catch (e) {
      console.warn('[Habitaciones.confirmarVentaStock] moverStock warn (no bloquea venta):', (e as Error).message || e);
    }
    // Agregar líneas al folio
    setFoliosLocal(fs => {
      const folio = fs[habSeleccionada!.id] as any;
      return {
        ...fs,
        [habSeleccionada!.id]: {
          ...folio,
          lineas: [
            ...(folio?.lineas || []),
            ...items.map(it => ({
              id: uid(),
              tipo: 'PRODUCTO_STOCK',
              nombre: it.prod.nombre,
              cantidad: it.cantidad,
              precioUnit: Number(it.prod.precioVentaBase || 0),
              fecha: fechaHoy(),
              observaciones: it.prod.sku,
            } as LineaCargo)),
          ],
        },
      };
    });
    setModalVenderStock(false);
    setCantidadesVenta({});
    setRefreshTick(t => t + 1);
    const montoTotal = items.reduce((s, it) => s + it.cantidad * Number(it.prod.precioVentaBase || 0), 0);
    mostrarToast(`✅ Vendido ${items.length} item(s) · ${fmtSoles(montoTotal)} cargo a habitación`);
  };

  const confirmarServicioExtra = () => {
    if (!habSeleccionada) return;
    const { nombre, precio, cantidad, observaciones } = servExtraForm;
    if (!nombre.trim() || Number(precio) <= 0 || Number(cantidad) <= 0) { mostrarAlerta('Datos incompletos', 'Nombre, precio y cantidad son obligatorios.'); return; }
    setFoliosLocal(fs => {
      const folio = fs[habSeleccionada!.id] as any;
      return {
        ...fs,
        [habSeleccionada!.id]: {
          ...folio,
          lineas: [
            ...(folio?.lineas || []),
            {
              id: uid(),
              tipo: 'SERVICIO_EXTRA',
              nombre: nombre.trim(),
              cantidad: Number(cantidad),
              precioUnit: Number(precio),
              fecha: fechaHoy(),
              observaciones: observaciones?.trim() || undefined,
            } as LineaCargo,
          ],
        },
      };
    });
    setModalServicioExtra(false);
    const total = Number(precio) * Number(cantidad);
    mostrarToast(`✅ Servicio "${nombre}" añadido · ${fmtSoles(total)}`);
  };

  const confirmarRegistroPago = () => {
    if (!habSeleccionada || !pagoForm) return;
    if (Number(pagoForm.monto) <= 0) { mostrarAlerta('Monto inválido', 'Ingresa un monto mayor a 0.'); return; }
    setFoliosLocal(fs => {
      const folio = fs[habSeleccionada!.id] as any;
      return {
        ...fs,
        [habSeleccionada!.id]: {
          ...folio,
          pagos: [
            ...(folio?.pagos || []),
            {
              id: uid(),
              fecha: fechaHoy(),
              metodoPago: pagoForm.metodoPago,
              moneda: pagoForm.moneda,
              monto: Number(pagoForm.monto),
              referencia: pagoForm.referencia || pagoForm.codigoAutorizacion || pagoForm.observaciones || undefined,
            } as RegistroPago,
          ],
        },
      };
    });
    setModalRegistrarPago(false);
    const metodo = METODOS_PAGO_LISTA.find(m => m.value === pagoForm.metodoPago)?.label || pagoForm.metodoPago;
    mostrarToast(`✅ Pago registrado · ${metodo} · ${fmtSoles(Number(pagoForm.monto))}`);
  };

  const folioActivo = obtenerFolioHab(habSeleccionada);
  const totalesFolio = calcularTotales(folioActivo?.lineas || []);
  const totalPagosF = calcularTotalPagos(folioActivo?.pagos || []);
  const saldoPendiente = Math.max(0, totalesFolio.total - totalPagosF);

  // ============ RENDER ============
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Habitaciones ({habitaciones.length})</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding habitaciones-page">
        {toast && <div className="toast-flash">{toast}</div>}
        <IonAlert isOpen={alertOpen} header={alertMsg.header} subHeader={alertMsg.sub} buttons={['OK']} onDidDismiss={() => setAlertOpen(false)} />

        <CheckinModal isOpen={checkinOpen} onDidDismiss={() => { setCheckinOpen(false); setCheckinReservaId(null); cargar(); }} reservaId={checkinReservaId} usuarioActual={USUARIO_ACTUAL} />
        <CheckoutModal isOpen={checkoutOpen} onDismiss={() => { setCheckoutOpen(false); setCheckoutReservaId(''); cargar(); }} reservaId={checkoutReservaId} />
        <TomarComanda
          isOpen={tomarComandaOpen}
          onDismiss={() => { setTomarComandaOpen(false); setHabPedidoId(''); setPreHabSeleccionadaId(''); setRefreshTick(t => t + 1); cargar(); }}
          preHabitacionId={(preHabSeleccionadaId || habPedidoId) || undefined}
          preTipoConsumo={preTipoConsumoHab || 'CARGO_A_HABITACION'}
        />

        <IonGrid className="table-grid hab-grid">
          <IonRow>
            {loading && Array.from({ length: habitaciones.length || 5 }).map((_, i) => (
              <IonCol key={i} size="6" size-xs="6" size-sm="6" size-md="4" size-lg="3" size-xl="3">
                <IonCard className="hab-card">
                  <IonCardHeader><IonSkeletonText animated style={{ width: '55%' }} /><IonCardSubtitle><IonSkeletonText animated style={{ width: '85%' }} /></IonCardSubtitle></IonCardHeader>
                  <IonCardContent><p><IonSkeletonText animated style={{ width: '90%' }} /></p><p><IonSkeletonText animated style={{ width: '70%' }} /></p></IonCardContent>
                </IonCard>
              </IonCol>
            ))}
            {!loading && habitaciones.map((h) => {
              const tipo: any = h.tipoHabitacion;
              // Prioridad capacidad: habitacion individual (editable en Panel Admin Perfil) > tipo FK > fallback 2
              const capH = Number((h as any).capacidadMaximaPax ?? (h as any).capacidadPersonas ?? 0);
              const capT = tipo ? (Number(tipo?.capacidadAdultos ?? 0) + Number(tipo?.capacidadNinos ?? 0)) : 0;
              const capacidadTotal = capH || capT || Number((h as any).capacidadMaximaPersonas || 0) || 2;
              const tarifaBase = tipo?.precioBaseNoche ?? 0;
              return (
                <IonCol key={h.id} size="6" size-xs="6" size-sm="6" size-md="4" size-lg="3" size-xl="3">
                  <IonCard button className={`hab-card hab-${h.estado.toLowerCase()}`} style={{ minHeight: '82px' }} onClick={() => onClickHab(h)}>
                    <IonCardHeader>
                      <div className="hab-row">
                        <IonCardTitle>{h.codigo}</IonCardTitle>
                        <IonBadge color={estadoColor[h.estado]}>{estadoLabel[h.estado]}</IonBadge>
                      </div>
                      <IonCardSubtitle>{tipo?.nombre ?? (h as any).tipoNombre ?? h.tipoHabitacionId}</IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <p>Capacidad: <strong>{capacidadTotal} pax</strong></p>
                      <p>Tarifa base: <strong>S/ {Number(tarifaBase || (h as any).precioBaseNoche || 0).toFixed(2)}</strong></p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              );
            })}
            {!loading && habitaciones.length === 0 && (
              <IonCol size="12"><IonCard><IonCardContent style={{ textAlign: 'center', padding: '24px 0' }}>No hay habitaciones registradas. Agrega una desde ⚙️ Panel Admin → Habitaciones.</IonCardContent></IonCard></IonCol>
            )}
          </IonRow>
        </IonGrid>

        {/* ====== MODAL: DATOS HUÉSPED ====== */}
        {modalDatosHuesped && (
          <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModalDatosHuesped(false); }}>
            <div className="modal-card">
              <div className="modal-head"><h3>👥 Datos del Huésped</h3><IonButton fill="clear" size="small" onClick={() => setModalDatosHuesped(false)}><IonIcon icon={close} /></IonButton></div>
              <IonGrid><IonRow>
                <IonCol size="6"><IonItem><IonLabel position="stacked">Nombres *</IonLabel><IonInput value={editHuesped?.nombres} onIonInput={e => setEditHuesped({ ...editHuesped, nombres: String(e.detail.value || '') })} /></IonItem></IonCol>
                <IonCol size="6"><IonItem><IonLabel position="stacked">Apellidos *</IonLabel><IonInput value={editHuesped?.apellidos} onIonInput={e => setEditHuesped({ ...editHuesped, apellidos: String(e.detail.value || '') })} /></IonItem></IonCol>
                <IonCol size="6"><IonItem><IonLabel position="stacked">DNI / CE / Pasaporte</IonLabel><IonInput value={editHuesped?.dni} onIonInput={e => setEditHuesped({ ...editHuesped, dni: String(e.detail.value || '') })} /></IonItem></IonCol>
                <IonCol size="6"><IonItem><IonLabel position="stacked">Teléfono</IonLabel><IonInput value={editHuesped?.telefono} onIonInput={e => setEditHuesped({ ...editHuesped, telefono: String(e.detail.value || '') })} /></IonItem></IonCol>
                <IonCol size="12"><IonItem><IonLabel position="stacked">Email</IonLabel><IonInput value={editHuesped?.email} onIonInput={e => setEditHuesped({ ...editHuesped, email: String(e.detail.value || '') })} /></IonItem></IonCol>
              </IonRow></IonGrid>
              <div className="modal-foot">
                <IonButton color="primary" onClick={guardarDatosHuesped}><IonIcon slot="start" icon={save} />Guardar</IonButton>
                <IonButton color="medium" fill="outline" onClick={() => setModalDatosHuesped(false)}>Cancelar</IonButton>
              </div>
            </div>
          </div>
        )}

        {/* ====== MODAL: VER FOLIO ====== */}
        {modalVerFolio && folioActivo && (
          <div className="modal-backdrop modal-wide" onClick={e => { if (e.target === e.currentTarget) setModalVerFolio(false); }}>
            <div className="modal-card">
              <div className="modal-head"><h3>💰 Folio · {habSeleccionada?.codigo}</h3><IonButton fill="clear" size="small" onClick={() => setModalVerFolio(false)}><IonIcon icon={close} /></IonButton></div>

              <IonCard color="light" style={{ margin: '6px 0 14px 0' }}>
                <IonCardContent style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                    <div>
                      <b style={{ fontSize: 16 }}>{folioActivo.huesped.nombres} {folioActivo.huesped.apellidos}</b>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>
                        {folioActivo.huesped.dni ? `DNI ${folioActivo.huesped.dni} · ` : ''}
                        {folioActivo.huesped.telefono || ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, opacity: 0.9 }}>Check-in: <b>{folioActivo.reserva.checkin}</b></div>
                      <div style={{ fontSize: 13, opacity: 0.9 }}>Check-out: <b>{folioActivo.reserva.checkout}</b> · {folioActivo.reserva.noches} noches</div>
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>

              <h4 style={{ margin: '4px 2px 8px 2px', opacity: 0.9 }}>Consumos registrados</h4>
              <IonList lines="full" className="lineas-folio">
                {totalesFolio.detalle.length === 0 && <IonItem><IonLabel color="medium">Sin consumos aún.</IonLabel></IonItem>}
                {totalesFolio.detalle.map((l: any) => (
                  <IonItem key={l.id}>
                    <IonLabel>
                      <h2 style={{ margin: 0 }}>{l.nombre} <IonBadge color={l.tipo === 'ROOM_SERVICE' ? 'warning' : (l.tipo === 'PRODUCTO_STOCK' ? 'tertiary' : (l.tipo === 'SERVICIO_EXTRA' ? 'primary' : 'success'))} style={{ marginLeft: 6, fontSize: 11 }}>{l.tipo.replace('_', ' ')}</IonBadge></h2>
                      <p style={{ margin: '2px 0 0 0' }}>
                        {l.cantidad} x {fmtSoles(l.precioUnit)}
                        {l.observaciones && <span> · {l.observaciones}</span>}
                        <span style={{ opacity: 0.7 }}> · {l.fecha}</span>
                      </p>
                    </IonLabel>
                    <IonLabel slot="end" style={{ textAlign: 'right', fontWeight: 700 }}>{fmtSoles(l.subtotal)}</IonLabel>
                  </IonItem>
                ))}
              </IonList>

              {folioActivo.pagos.length > 0 && (
                <>
                  <h4 style={{ margin: '14px 2px 8px 2px', opacity: 0.9 }}>Pagos realizados</h4>
                  <IonList lines="full" className="lineas-folio">
                    {folioActivo.pagos.map((p: RegistroPago) => {
                      const nombreMet = METODOS_PAGO_LISTA.find(m => m.value === p.metodoPago)?.label || p.metodoPago;
                      return (
                        <IonItem key={p.id}>
                          <IonLabel>
                            <h2 style={{ margin: 0, color: '#10b981' }}>{nombreMet} {p.moneda && p.moneda !== 'PEN' ? `(${p.moneda})` : ''}</h2>
                            <p style={{ margin: '2px 0 0 0' }}>{p.fecha}{p.referencia && ` · Ref: ${p.referencia}`}</p>
                          </IonLabel>
                          <IonLabel slot="end" style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>- {fmtSoles(p.monto)}</IonLabel>
                        </IonItem>
                      );
                    })}
                  </IonList>
                </>
              )}

              <IonCard color="primary" style={{ margin: '14px 0 10px 0' }}>
                <IonCardContent style={{ padding: '12px 16px' }}>
                  <IonGrid style={{ margin: 0, padding: 0 }}>
                    <IonRow>
                      <IonCol size="6" style={{ padding: '2px 6px' }}><div>Subtotal</div><div>IGV (18%)</div><div style={{ marginTop: 6 }}><b>Pagos</b></div></IonCol>
                      <IonCol size="6" style={{ padding: '2px 6px', textAlign: 'right' }}>
                        <div>{fmtSoles(totalesFolio.subtotal)}</div>
                        <div>{fmtSoles(totalesFolio.igv)}</div>
                        <div style={{ marginTop: 6, color: '#bbf7d0' }}><b>- {fmtSoles(totalPagosF)}</b></div>
                      </IonCol>
                    </IonRow>
                  </IonGrid>
                  <hr style={{ opacity: 0.25, margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>TOTAL A PAGAR</div>
                    <div style={{ fontSize: 26, fontWeight: 900 }}>{fmtSoles(saldoPendiente)}</div>
                  </div>
                  {saldoPendiente < 0.01 && <div style={{ marginTop: 6, textAlign: 'center', background: '#ecfdf5', color: '#065f46', padding: '8px', borderRadius: 8, fontWeight: 700 }}>✅ PAGO COMPLETADO</div>}
                </IonCardContent>
              </IonCard>

              <div className="modal-foot">
                <IonButton color="success" onClick={() => { setModalVerFolio(false); setPagoForm({ metodoPago: 'EFECTIVO_PEN', monto: saldoPendiente, moneda: 'PEN', referencia: '', observaciones: '', codigoAutorizacion: '' }); setModalRegistrarPago(true); }} disabled={saldoPendiente < 0.01}>
                  <IonIcon slot="start" icon={cash} />Registrar Pago
                </IonButton>
                <IonButton color="warning" onClick={() => { setModalVerFolio(false); setServExtraForm({ nombre: '', precio: 0, cantidad: 1, observaciones: '' }); setModalServicioExtra(true); }}>
                  <IonIcon slot="start" icon={pricetag} />Añadir Servicio
                </IonButton>
                <IonButton color="medium" fill="outline" onClick={() => setModalVerFolio(false)}>Cerrar</IonButton>
              </div>
            </div>
          </div>
        )}

        {/* ====== MODAL: VENDER PRODUCTOS STOCK ====== */}
        {modalVenderStock && (
          <div className="modal-backdrop modal-wide" onClick={e => { if (e.target === e.currentTarget) setModalVenderStock(false); }}>
            <div className="modal-card">
              <div className="modal-head"><h3>🥤 Vender Productos (Stock) · {habSeleccionada?.codigo}</h3><IonButton fill="clear" size="small" onClick={() => setModalVenderStock(false)}><IonIcon icon={close} /></IonButton></div>
              <IonNote color="medium" style={{ display: 'block', margin: '-6px 4px 10px 4px' }}>Los productos se cargan automáticamente al folio y descuentan stock.</IonNote>
              <IonList lines="full">
                {productosStockGlobal.filter(p => p.estadoProducto !== 'INACTIVO' && p.estadoProducto !== 'DESCONTINUADO').map(p => {
                  const stk = Number(p._stock ?? 0);
                  const min = Number(p._stockMin ?? p.stockMinimo ?? 0);
                  const agotado = stk <= 0;
                  const bajo = stk <= min;
                  const cant = Number(cantidadesVenta[p.id] || 0);
                  return (
                    <IonItem key={p.id}>
                      <IonLabel>
                        <h2 style={{ margin: 0 }}>
                          {p.nombre}
                          {agotado && <IonBadge color="danger" style={{ marginLeft: 6 }}>AGOTADO</IonBadge>}
                          {!agotado && bajo && <IonBadge color="warning" style={{ marginLeft: 6 }}>STOCK BAJO</IonBadge>}
                        </h2>
                        <p style={{ margin: '2px 0 0 0' }}>SKU {p.sku} · Disponible: <b>{stk}</b> · Precio: <b>{fmtSoles(Number(p.precioVentaBase || 0))}</b></p>
                      </IonLabel>
                      <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <IonButton fill="solid" size="small" color="medium" disabled={cant <= 0 || agotado} onClick={() => setCantidadesVenta(c => ({ ...c, [p.id]: Math.max(0, cant - 1) }))}><IonIcon icon={remove} /></IonButton>
                        <div style={{ minWidth: 32, textAlign: 'center', fontWeight: 800 }}>{cant}</div>
                        <IonButton fill="solid" size="small" color="success" disabled={agotado || (!p.permiteInventarioNegativo && cant >= stk)} onClick={() => setCantidadesVenta(c => ({ ...c, [p.id]: Math.max(0, cant + 1) }))}><IonIcon icon={add} /></IonButton>
                      </div>
                    </IonItem>
                  );
                })}
              </IonList>
              {(() => {
                const items = Object.entries(cantidadesVenta);
                let tot = 0, nItems = 0;
                items.forEach(([pid, c]) => { const prod = productosStockGlobal.find(p => p.id === pid); if (prod && c > 0) { tot += c * Number(prod.precioVentaBase || 0); nItems += c; } });
                return (
                  <IonCard color="success" style={{ margin: '12px 0' }}>
                    <IonCardContent style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div>{nItems} item(s)</div>
                      <div style={{ fontSize: 22, fontWeight: 900 }}>{fmtSoles(tot)}</div>
                    </IonCardContent>
                  </IonCard>
                );
              })()}
              <div className="modal-foot">
                <IonButton color="primary" onClick={confirmarVentaStock}><IonIcon slot="start" icon={cart} />Confirmar Venta · Cargo a Habitación</IonButton>
                <IonButton color="medium" fill="outline" onClick={() => setModalVenderStock(false)}>Cancelar</IonButton>
              </div>
            </div>
          </div>
        )}

        {/* ====== MODAL: SERVICIO EXTRA ====== */}
        {modalServicioExtra && (
          <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModalServicioExtra(false); }}>
            <div className="modal-card">
              <div className="modal-head"><h3>🚕 + Servicio Extra · {habSeleccionada?.codigo}</h3><IonButton fill="clear" size="small" onClick={() => setModalServicioExtra(false)}><IonIcon icon={close} /></IonButton></div>
              <IonNote color="medium" style={{ display: 'block', margin: '-6px 4px 10px 4px' }}>Taxi, Tour, Lavandería, Maletero, Parking, etc.</IonNote>
              <IonGrid>
                <IonRow>
                  <IonCol size="12"><IonItem><IonLabel position="stacked">Nombre servicio *</IonLabel><IonInput placeholder="Ej: Taxi Aeropuerto 6am" value={servExtraForm.nombre} onIonInput={e => setServExtraForm({ ...servExtraForm, nombre: String(e.detail.value || '') })} /></IonItem></IonCol>
                  <IonCol size="6"><IonItem><IonLabel position="stacked">Precio unitario S/ *</IonLabel><IonInput type="number" placeholder="Ej: 80" value={servExtraForm.precio || ''} onIonInput={e => setServExtraForm({ ...servExtraForm, precio: Number(e.detail.value || 0) })} /></IonItem></IonCol>
                  <IonCol size="6"><IonItem><IonLabel position="stacked">Cantidad</IonLabel><IonInput type="number" value={servExtraForm.cantidad || ''} onIonInput={e => setServExtraForm({ ...servExtraForm, cantidad: Math.max(1, Number(e.detail.value || 1)) })} /></IonItem></IonCol>
                  <IonCol size="12"><IonItem><IonLabel position="stacked">Observaciones (opcional)</IonLabel><IonTextarea rows={2} placeholder="Ej: Salida 6:00am desde recepción, maleta x2" value={servExtraForm.observaciones} onIonInput={e => setServExtraForm({ ...servExtraForm, observaciones: String(e.detail.value || '') })} /></IonItem></IonCol>
                </IonRow>
              </IonGrid>
              {Number(servExtraForm.precio) > 0 && Number(servExtraForm.cantidad) > 0 && (
                <IonCard color="tertiary" style={{ margin: '10px 0' }}><IonCardContent style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div>Cargo a folio</div>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{fmtSoles(Number(servExtraForm.precio) * Number(servExtraForm.cantidad))}</div>
                </IonCardContent></IonCard>
              )}
              <div className="modal-foot">
                <IonButton color="primary" onClick={confirmarServicioExtra}><IonIcon slot="start" icon={save} />Agregar al Folio</IonButton>
                <IonButton color="medium" fill="outline" onClick={() => setModalServicioExtra(false)}>Cancelar</IonButton>
              </div>
            </div>
          </div>
        )}

        {/* ====== MODAL: REGISTRAR PAGO ====== */}
        {modalRegistrarPago && (
          <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModalRegistrarPago(false); }}>
            <div className="modal-card">
              <div className="modal-head"><h3>💳 Registrar Pago · {habSeleccionada?.codigo}</h3><IonButton fill="clear" size="small" onClick={() => setModalRegistrarPago(false)}><IonIcon icon={close} /></IonButton></div>
              <IonCard color="warning" style={{ margin: '4px 0 12px 0' }}>
                <IonCardContent style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div><b>Saldo pendiente</b></div>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{fmtSoles(saldoPendiente)}</div>
                </IonCardContent>
              </IonCard>
              <PagoForm value={pagoForm} onChange={setPagoForm} totalSugeridoSoles={saldoPendiente} />
              <div className="modal-foot">
                <IonButton color="success" onClick={confirmarRegistroPago}><IonIcon slot="start" icon={wallet} />Confirmar Pago</IonButton>
                <IonButton color="medium" fill="outline" onClick={() => setModalRegistrarPago(false)}>Cancelar</IonButton>
              </div>
            </div>
          </div>
        )}

        {/* NOTA VENTA CHECK-OUT 80mm */}
        {notaVentaCheckout && (() => {
          const folio = notaVentaCheckout.folio;
          const lineasCargo = (folio?.lineas || []).filter((l: any) => l.tipo !== 'PAGO');
          const pagos = (folio?.pagos || []) as any[];
          const { subtotal, igv, total } = calcularTotales(folio?.lineas || []);
          const totalPagado = calcularTotalPagos(folio?.pagos || []);
          const saldo = total - totalPagado;
          const metodoPago = pagos[0]?.metodoPago || 'EFECTIVO_PEN';
          const metodoLabel = METODOS_PAGO_LISTA.find(m => m.value === metodoPago)?.label || metodoPago;
          const nombreHuesped = `${folio?.huesped?.nombres || 'Huesped'} ${folio?.huesped?.apellidos || ''}`.trim() || 'Cliente Eventual';
          return (
            <div className="modal-backdrop modal-wide no-print-bg" onClick={e => { if (e.target === e.currentTarget) setNotaVentaCheckout(null); }}>
              <div className="modal-card print-area-wrap">
                <div className="modal-head no-print">
                  <h3>🧾 Nota Venta Check-out · Hab {notaVentaCheckout.habId}</h3>
                  <IonButton fill="clear" size="small" onClick={() => setNotaVentaCheckout(null)}><IonIcon icon={close} /></IonButton>
                </div>
                <div className="nota-venta">
                  <div className="nv-header">
                    <div className="nv-logo">Sumaq Allpa</div>
                    <div className="nv-nombre-empresa">Casa Sumaq Allpa</div>
                    <div className="nv-linea-uno">Nota de Venta · {folio?.reserva?.id || 'SIN-CORRELATIVO'}</div>
                    <div className="nv-linea">{fechaHoy()}</div>
                  </div>
                  <div className="nv-cliente">
                    <div><b>Cliente:</b> {nombreHuesped}</div>
                    {folio?.huesped?.dni && <div><b>DNI / Doc:</b> {folio.huesped.dni}</div>}
                    {folio?.reserva && <div><b>Periodo:</b> {folio.reserva.checkin} → {folio.reserva.checkout} · {folio.reserva.noches || 1} noche(s)</div>}
                    <div><b>Habitación:</b> {notaVentaCheckout.habId}</div>
                    <div><b>Cajero/a:</b> {USUARIO_ACTUAL.nombres}</div>
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
                      {lineasCargo.map((l: any) => (
                        <tr key={l.id}>
                          <td style={{ textAlign: 'left' }}>{l.nombre}</td>
                          <td style={{ textAlign: 'center' }}>{l.cantidad}</td>
                          <td style={{ textAlign: 'right' }}>{fmtSoles(l.precioUnit)}</td>
                          <td style={{ textAlign: 'right' }}>{fmtSoles(l.cantidad * l.precioUnit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="nv-totales">
                    <div className="nv-total-row"><span>SUBTOTAL:</span><span>{fmtSoles(subtotal)}</span></div>
                    <div className="nv-total-row"><span>IGV (incluido 18%):</span><span>{fmtSoles(igv)}</span></div>
                    <div className="nv-total-row nv-total-final"><span>TOTAL:</span><span>{fmtSoles(total)}</span></div>
                    {totalPagado > 0 && <div className="nv-total-row nv-pagado"><span>MONTO PAGADO ({metodoLabel}):</span><span>{fmtSoles(totalPagado)}</span></div>}
                    {pagos.length > 1 && pagos.slice(1).map((p: any, i: number) => (
                      <div key={p.id || i} className="nv-total-row" style={{ fontSize: 11 }}>
                        <span>Otro pago ({METODOS_PAGO_LISTA.find(m => m.value === p.metodoPago)?.label || p.metodoPago}):</span>
                        <span>{fmtSoles(p.monto)}</span>
                      </div>
                    ))}
                    {Math.abs(saldo) > 0.01 && <div className="nv-total-row" style={{ color: saldo > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                      <span>SALDO:</span><span>{fmtSoles(Math.max(0, saldo))}</span>
                    </div>}
                  </div>
                  <div className="nv-footer">Gracias por su visita. Esperamos volver a verle pronto.</div>
                  <div className="nv-corte">-- corte ticket --</div>
                </div>
                <div className="modal-foot no-print">
                  <IonButton color="primary" onClick={() => setTimeout(() => window.print(), 60)}><IonIcon slot="start" icon={receiptOutline} />Imprimir (Ticket 80mm)</IonButton>
                  {saldo <= 0.01 && (
                    <IonButton color="success" onClick={() => {
                      setNotaVentaCheckout(null);
                      const habObj = habitaciones.find(h => h.id === notaVentaCheckout.habId);
                      if (habObj) marcarEstado(habObj, 'LIBRE');
                    }}>Finalizar Check-out · Marcar LIBRE</IonButton>
                  )}
                  {notaVentaCheckout && checkoutReservaId && (
                    <IonButton color="warning" fill="outline" onClick={() => { setNotaVentaCheckout(null); setCheckoutOpen(true); }}>Abrir CheckoutModal (servicio)</IonButton>
                  )}
                  <IonButton color="medium" fill="outline" onClick={() => setNotaVentaCheckout(null)}>Cerrar</IonButton>
                </div>
              </div>
            </div>
          );
        })()}

        <div style={{ height: 30 }} />
      </IonContent>
    </IonPage>
  );
};

export default HabitacionesPage;
