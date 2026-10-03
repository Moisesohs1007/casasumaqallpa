// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle,
  IonCol, IonGrid, IonIcon, IonInput, IonItem, IonLabel, IonModal, IonNote, IonRow, IonSearchbar,
  IonSelect, IonSelectOption, IonText, IonTextarea, IonChip, IonSkeletonText,
} from '@ionic/react';
import {
  add, basket, bed, cash, checkmarkCircle, close, closeCircle,
  documentText, informationCircle, person, restaurantOutline,
} from 'ionicons/icons';
import type { Comanda, Habitacion, Mesa, ProductoFB, Reserva } from '../../types';
import {
  CatalogoFBService, ComandaService, HabitacionService, MesaService, ReservaService, FolioService,
} from '../../services';

interface Props {
  isOpen: boolean;
  onDismiss: () => void;
  preMesaId?: string;
  preHabitacionId?: string;
  preTipoConsumo?: 'MESA' | 'CARGO_A_HABITACION';
  comandaAEditarId?: string;
}

const USUARIO_ACTUAL = { id: 'USR-MOISES-0001', nombres: 'Moisés', apellidos: 'Ochoa' };
const PUNTO_VENTA_ID = 'PV-RESTAURANTE-01';

type TipoConsumo = 'MESA' | 'CARGO_A_HABITACION';

interface LineaCarrito {
  key: string;
  productoId: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  observaciones: string;
}

interface Props {
  isOpen: boolean;
  onDismiss: () => void;
}

const emojiCategoria = (catId: string) => {
  if (catId.includes('DESAYUNO')) return '🥣';
  if (catId.includes('JUGO')) return '🥤';
  if (catId.includes('SANDWICH') || catId.includes('TRIPLE') || catId.includes('SANGUCH')) return '🥪';
  if (catId.includes('ENTRADA')) return '🥗';
  if (catId.includes('SOPA') || catId.includes('CALDO') || catId.includes('CREMA')) return '🍲';
  if (catId.includes('PLATO') || catId.includes('PRINCIPAL')) return '🍽️';
  if (catId.includes('PIZZA')) return '🍕';
  if (catId.includes('BEBIDAS-FRIAS') || catId === 'CAT-BEBIDAS-FRIAS') return '🧊';
  if (catId.includes('BEBIDAS-CALIENTES') || catId === 'CAT-BEBIDAS-CALIENTES') return '☕';
  if (catId.includes('ALCOHOL') || catId.includes('BAR') || catId.includes('CERVE') || catId.includes('VINO')) return '🍻';
  if (catId.includes('POSTRE') || catId.includes('HELADO') || catId.includes('WAFFLE') || catId.includes('CREPE') || catId.includes('CORCHO')) return '🍰';
  if (catId.includes('MINIBAR')) return '🧃';
  return '🍴';
};

const TomarComanda: React.FC<Props> = ({ isOpen, onDismiss, preMesaId, preHabitacionId, preTipoConsumo, comandaAEditarId }) => {
  const [paso, setPaso] = useState<'orden' | 'exito'>('orden');
  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ultimaComanda, setUltimaComanda] = useState<Comanda | null>(null);
  const [folioCodigoCreado, setFolioCodigoCreado] = useState<string>('');

  const [tipoConsumo, setTipoConsumo] = useState<TipoConsumo>('MESA');
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltroId, setCategoriaFiltroId] = useState<string>('TODOS');
  const [habitacionSeleccionadaId, setHabitacionSeleccionadaId] = useState<string>('');
  const [mesaSeleccionadaId, setMesaSeleccionadaId] = useState<string>('');
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [refreshTick, setRefreshTick] = useState<number>(0);
  const [modoEditarComanda, setModoEditarComanda] = useState<Comanda | null>(null);

  const [categorias, setCategorias] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [habitacionesCheckedIn, setHabitacionesCheckedIn] = useState<Array<{ reserva: Reserva; habitacion: Habitacion; huespedNombre: string }>>([]);
  const [mesasLibres, setMesasLibres] = useState<Mesa[]>([]);
  const [loadingCat, setLoadingCat] = useState(true);

  const reset = () => {
    setPaso('orden');
    setProcesando(false);
    setErrorMsg(null);
    setUltimaComanda(null);
    setFolioCodigoCreado('');
    setTipoConsumo('CARGO_A_HABITACION');
    setBusqueda('');
    setCategoriaFiltroId('TODOS');
    setHabitacionSeleccionadaId('');
    setMesaSeleccionadaId('');
    setCarrito([]);
    setCategorias([]);
    setProductos([]);
    setHabitacionesCheckedIn([]);
    setMesasLibres([]);
    setLoadingCat(true);
  };

  const cargarCatalogo = async () => {
    try {
      const cats: any[] = await CatalogoFBService.listarCategorias();
      const activas = cats.filter((c: any) => c.estado === 'ACTIVO');
      const withTodos = [{ id: 'TODOS', nombre: '🧺 Todos los productos', orden: 0 } as any].concat(activas);
      setCategorias(withTodos);
      await cargarProductos(withTodos[0]?.id || 'TODOS', busqueda);
    } finally {
      setLoadingCat(false);
    }
  };

  const cargarProductos = async (categoriaId: string, buscarTexto: string) => {
    try {
      const prods = await CatalogoFBService.listarProductos({
        soloActivos: true,
        buscar: buscarTexto.trim() ? buscarTexto : undefined,
        categoriaId: categoriaId === 'TODOS' ? undefined : categoriaId,
        puntoVentaId: PUNTO_VENTA_ID,
      });
      setProductos(prods as any[]);
    } catch {
      setProductos([]);
    }
  };

  const cargarHabitacionesCheckedIn = async () => {
    try {
      const reservas = (await (ReservaService as any).listarTodas?.() || []) as Reserva[];
      const checkedIn = reservas.filter((r) => {
        const e = String(r.estado || '').toUpperCase().replace(/[^A-Z]/g, '');
        return e.includes('CHECKIN') || e.includes('CHECKEDIN');
      });
      const lista: Array<{ reserva: Reserva; habitacion: Habitacion; huespedNombre: string }> = [];
      for (const r of checkedIn) {
        const habs = (r.habitaciones || []) as any[];
        if (habs.length === 0) continue;
        const hab0 = habs[0] as any;
        const habId = hab0.habitacionId || hab0.habitacion?.id;
        if (!habId) continue;
        let hab: any;
        try { hab = await HabitacionService.buscarPorId(habId); } catch { /* noop */ }
        const huesped = (r as any).huesped ?? (r as any).huespedTitular ?? (hab0.habitacion?.huesped ?? null);
        const huespedNombre = huesped ? `${huesped.nombres ?? ''} ${huesped.apellidos ?? ''}`.trim() || `Titular` : `Titular #${(r as any).huespedTitularId || (r as any).huespedId}`;
        const codHab = hab?.codigo || hab0?.codigo || habId;
        lista.push({ reserva: r, habitacion: hab ?? hab0.habitacion ?? { ...hab0, id: habId, codigo: codHab }, huespedNombre });
      }
      setHabitacionesCheckedIn(lista);
    } catch {
      setHabitacionesCheckedIn([]);
    }
  };

  const cargarMesas = async () => {
    try {
      const ms = await MesaService.listarTodas({ puntoVentaId: PUNTO_VENTA_ID });
      setMesasLibres(ms.filter((m: any) => m.zona !== 'ROOM_SERVICE'));
    } catch {
      setMesasLibres([]);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setTimeout(async () => {
      reset();
      if (!mounted) return;
      setRefreshTick((t) => t + 2);
      await Promise.all([cargarCatalogo(), cargarHabitacionesCheckedIn(), cargarMesas()]);
      if (!mounted) return;
      // Aplicar preselecciones
      if (preTipoConsumo === 'MESA' || preMesaId) {
        setTipoConsumo('MESA');
        if (preMesaId) setMesaSeleccionadaId(preMesaId);
      } else if (preTipoConsumo === 'CARGO_A_HABITACION' || preHabitacionId) {
        setTipoConsumo('CARGO_A_HABITACION');
        if (preHabitacionId) setHabitacionSeleccionadaId(preHabitacionId);
      } else {
        setTipoConsumo(preMesaId ? 'MESA' : 'MESA');
        if (preMesaId) setMesaSeleccionadaId(preMesaId);
        if (preHabitacionId) {
          setTipoConsumo('CARGO_A_HABITACION');
          setHabitacionSeleccionadaId(preHabitacionId);
        }
      }
      // Editar comanda existente
      if (comandaAEditarId && typeof (ComandaService as any).buscarPorId === 'function') {
        try {
          const c: Comanda | undefined = await (ComandaService as any).buscarPorId(comandaAEditarId);
          if (c && mounted) {
            setModoEditarComanda(c);
            const lineas = (c as any).detalles || [];
            const cart: LineaCarrito[] = lineas.map((l: any, i: number) => ({
              key: `${l.productoId || l.id}-${i}-${Date.now()}`,
              productoId: l.productoId || l.id,
              nombre: l.nombre || l.descripcion || `Ítem ${i + 1}`,
              precioUnitario: Number(l.precioUnitario || l.precio || 0),
              cantidad: Number(l.cantidad || 1),
              observaciones: l.observaciones || '',
            }));
            setCarrito(cart);
            if ((c as any).mesaId) { setTipoConsumo('MESA'); setMesaSeleccionadaId((c as any).mesaId); }
            if ((c as any).habitacionId) { setTipoConsumo('CARGO_A_HABITACION'); setHabitacionSeleccionadaId((c as any).habitacionId); }
          }
        } catch { /* ignore */ }
      }
    }, 60);
    return () => { mounted = false; };
  }, [isOpen, preMesaId, preHabitacionId, preTipoConsumo, comandaAEditarId]);

  useEffect(() => {
    if (!isOpen) return;
    if (categorias.length === 0) return;
    cargarProductos(categoriaFiltroId, busqueda);
  }, [categoriaFiltroId, busqueda, isOpen, refreshTick]);

  const totalCarrito = carrito.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
  const nroItems = carrito.reduce((s, l) => s + l.cantidad, 0);

  const puedeConfirmar =
    !procesando &&
    carrito.length > 0 &&
    totalCarrito > 0 &&
    ((tipoConsumo === 'MESA' && !!mesaSeleccionadaId) ||
      (tipoConsumo === 'CARGO_A_HABITACION' && !!habitacionSeleccionadaId));

  const agregarProducto = (prod: ProductoFB) => {
    setCarrito((prev) => {
      const existe = prev.find((x) => x.productoId === prod.id);
      if (existe) {
        return prev.map((x) =>
          x.productoId === prod.id ? { ...x, cantidad: x.cantidad + 1 } : x
        );
      }
      return prev.concat([
        {
          key: `${prod.id}-${Date.now()}`,
          productoId: prod.id,
          nombre: prod.nombre,
          precioUnitario: Number(prod.precioVentaBase) || 0,
          cantidad: 1,
          observaciones: '',
        },
      ]);
    });
  };

  const cambiarCantidad = (key: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((l) => l.key === key ? { ...l, cantidad: Math.max(0, l.cantidad + delta) } : l)
        .filter((l) => l.cantidad > 0)
    );
  };

  const eliminarLinea = (key: string) => setCarrito((prev) => prev.filter((l) => l.key !== key));

  const actualizarObs = (key: string, v: string) =>
    setCarrito((prev) => prev.map((l) => (l.key === key ? { ...l, observaciones: v } : l)));

  const cerrar = () => {
    if (procesando) return;
    onDismiss();
  };

  const handleConfirmar = async () => {
    setProcesando(true);
    setErrorMsg(null);
    try {
      if (carrito.length === 0) throw new Error('⚠️ El carrito está vacío. Agrega al menos 1 producto.');
      if (Number(totalCarrito) <= 0) throw new Error('⚠️ Total del carrito debe ser mayor a 0.');
      if (tipoConsumo === 'MESA' && !mesaSeleccionadaId) {
        try {
          const contenedor = document.querySelector('.tomar-comanda-scroll-wrapper') as HTMLElement;
          if (contenedor) contenedor.scrollTop = 0;
        } catch { /* noop */ }
        throw new Error('⚠️ Selecciona primero una MESA.');
      }
      if (tipoConsumo === 'CARGO_A_HABITACION' && !habitacionSeleccionadaId) {
        try {
          const contenedor = document.querySelector('.tomar-comanda-scroll-wrapper') as HTMLElement;
          if (contenedor) contenedor.scrollTop = 0;
        } catch { /* noop */ }
        throw new Error('⚠️ Selecciona primero la HABITACIÓN CHECKED-IN.');
      }

      let mesaId = '';
      let habitacionId: string | undefined = undefined;
      let reservaId: string | undefined = undefined;
      let huespedTitularId: string | undefined = undefined;
      let folioId: string | undefined = undefined;

      if (tipoConsumo === 'MESA') {
        mesaId = mesaSeleccionadaId;
      } else {
        habitacionId = habitacionSeleccionadaId;
        const habData = habitacionesCheckedIn.find(
          (x) => x.habitacion?.id === habitacionId || (x.habitacion as any)?.habitacionId === habitacionId
        );
        if (!habData) throw new Error('Habitación no válida.');
        reservaId = habData.reserva.id;
        huespedTitularId =
          (habData.reserva as any).huespedId ||
          (habData.reserva as any).huespedTitularId ||
          (habData.reserva.huesped as any)?.id ||
          undefined;
        const mesa = await MesaService.crearRoomServiceSiNoExiste({
          habitacionId,
          codHab: (habData.habitacion as any).codigo || 'ROOM',
          puntoVentaId: PUNTO_VENTA_ID,
          usuarioId: USUARIO_ACTUAL.id,
        });
        if (!mesa) throw new Error('Habitación sin mesa Room Service asignada. Intente nuevamente.');
        mesaId = mesa.id;

        let folio: any = undefined;
        try {
          if (typeof (FolioService as any).buscarPorHabitacionAbierta === 'function') {
            folio = await FolioService.buscarPorHabitacionAbierta(habitacionId);
          }
        } catch { /* ignore */ }
        if (!folio && typeof (FolioService as any).listarTodos === 'function') {
          try {
            const todos = await FolioService.listarTodos() || [];
            folio =
              (todos as any[]).find((f: any) =>
                f &&
                (String(f.reservaId) === String(reservaId) || String(f.habitacionId) === String(habitacionId)) &&
                !String(f.estado || '').toUpperCase().includes('CERRAD')
              ) ||
              (todos as any[]).find((f: any) =>
                f && (String(f.codigo || '') || '').toUpperCase().includes(String(reservaId || '').replace(/^RES[-_]?/i, ''))
              );
          } catch { /* ignore */ }
        }
        folioId = folio?.id;
        if (folioId) {
          setFolioCodigoCreado(`F-${String(folioId).slice(-4).toUpperCase()}`);
        }
      }

      const lineas = carrito.map((l) => ({
        productoId: l.productoId,
        cantidad: l.cantidad,
        observaciones: l.observaciones || undefined,
      }));

      const paxAdultos = habitacionesCheckedIn.find(
        (x) => x.habitacion?.id === habitacionId || (x.habitacion as any)?.habitacionId === habitacionId
      )?.reserva.totalAdultos || 2;

      const resultado = await (ComandaService as any).crear({
        puntoVentaId: PUNTO_VENTA_ID,
        mesaId,
        usuarioIdMozoApertura: USUARIO_ACTUAL.id,
        habitacionId,
        folioId,
        reservaId,
        huespedTitularId,
        tipoComanda: tipoConsumo === 'CARGO_A_HABITACION' ? 'ROOM_SERVICE' : 'MESA_RESTAURANTE',
        tipoConsumo: tipoConsumo === 'CARGO_A_HABITACION' ? 'CARGO_A_HABITACION' : 'COBRO_DIRECTO',
        paxAdultos,
        paxNinos: 0,
        observacionesInternas: `Creado desde POS TomarComanda Modal por ${USUARIO_ACTUAL.id}`,
        lineas,
      });

      if (resultado?.error) throw new Error(resultado.error);
      if (!resultado?.comanda) throw new Error('No se creo la comanda. Intente de nuevo.');

      setUltimaComanda(resultado.comanda);
      if (!folioCodigoCreado && folioId) {
        setFolioCodigoCreado(`F-${String(folioId).slice(-4).toUpperCase()}`);
      }
      setPaso('exito');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al crear la comanda. Revisa consola.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={cerrar}
      onIonModalDidPresent={reset}
      keepContentsMounted={true}
      canDismiss={true}
      backdropDismiss={false}
      style={{
        '--width': '96%',
        '--min-width': '320px',
        '--max-width': '1150px',
        '--height': '90%',
        '--border-radius': '16px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
        <div style={{
          background: '#2dd36f', color: '#fff', padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
        }}>
          <button
            onClick={cerrar}
            style={{
              background: 'transparent', border: 'none', color: '#fff',
              fontSize: 24, fontWeight: 700, cursor: procesando ? 'not-allowed' : 'pointer',
              opacity: procesando ? 0.5 : 1, padding: '2px 10px', borderRadius: 6,
            }}
            disabled={procesando}
            title="Cerrar"
          >
            ×
          </button>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.2 }}>
            🧾 {paso === 'orden' ? 'Nueva Comanda · POS' : 'Comanda creada'}
          </div>
          <button
            onClick={cerrar}
            style={{
              background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff',
              padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: procesando ? 'not-allowed' : 'pointer', opacity: procesando ? 0.5 : 1,
            }}
            disabled={procesando}
          >
            CERRAR
          </button>
        </div>

        <div className="tomar-comanda-scroll-wrapper" style={{ flex: 1, overflowY: 'auto', background: '#f7f7f7', padding: 16 }}>
          {paso === 'orden' && (
            <>
              <IonCard style={{ marginBottom: 14 }}>
                <IonCardHeader>
                  <IonCardTitle>📍 Tipo de consumo</IonCardTitle>
                  <IonCardSubtitle>Selecciona cómo se registrará este pedido.</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonRow>
                    <IonCol size="12" sizeMd="6">
                      <IonChip
                        color={tipoConsumo === 'MESA' ? 'primary' : 'medium'}
                        outline={tipoConsumo !== 'MESA'}
                        onClick={() => setTipoConsumo('MESA')}
                        style={{
                          padding: '14px 16px',
                          cursor: 'pointer',
                          width: '100%',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: tipoConsumo === 'MESA' ? 800 : 600,
                          minHeight: 50,
                        }}
                      >
                        <IonIcon icon={restaurantOutline} slot="start" />
                        MESA / PARA LLEVAR · Cobro directo
                      </IonChip>
                    </IonCol>
                    <IonCol size="12" sizeMd="6">
                      <IonChip
                        color={tipoConsumo === 'CARGO_A_HABITACION' ? 'success' : 'medium'}
                        outline={tipoConsumo !== 'CARGO_A_HABITACION'}
                        onClick={() => setTipoConsumo('CARGO_A_HABITACION')}
                        style={{
                          padding: '14px 16px',
                          cursor: 'pointer',
                          width: '100%',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: tipoConsumo === 'CARGO_A_HABITACION' ? 800 : 600,
                          minHeight: 50,
                        }}
                      >
                        <IonIcon icon={bed} slot="start" />
                        🚀 CARGO A FOLIO · Habitación
                      </IonChip>
                    </IonCol>
                  </IonRow>

                  <IonRow style={{ marginTop: 12 }}>
                    {tipoConsumo === 'CARGO_A_HABITACION' && (
                      <IonCol size="12" sizeMd="12">
                        <IonItem>
                          <IonIcon icon={bed} slot="start" color="success" />
                          <IonSelect
                            label="Selecciona habitación CHECKED-IN *"
                            labelPlacement="stacked"
                            placeholder="— Selecciona habitación ocupada —"
                            interface="popover"
                            value={habitacionSeleccionadaId}
                            onIonChange={(e) => setHabitacionSeleccionadaId(e.detail.value)}
                          >
                            {habitacionesCheckedIn.length === 0 && (
                              <IonSelectOption value="" disabled>
                                (No hay reservas CHECKED_IN. Primero haz Check-in de una reserva.)
                              </IonSelectOption>
                            )}
                            {habitacionesCheckedIn.map((h) => {
                              const hab = h.habitacion as any;
                              const habId = hab.id || hab.habitacionId;
                              return (
                                <IonSelectOption key={habId} value={habId}>
                                  {hab.codigo || habId} · {h.huespedNombre} · R#{(h.reserva as any).codigoReserva || h.reserva.id}
                                </IonSelectOption>
                              );
                            })}
                          </IonSelect>
                        </IonItem>
                        <IonNote color="success" style={{ display: 'block', padding: '6px 12px' }}>
                          <IonIcon icon={informationCircle} /> El pedido se cargará <strong>AUTOMÁTICAMENTE al Folio abierto</strong> del huésped durante su estadía.
                        </IonNote>
                      </IonCol>
                    )}

                    {tipoConsumo === 'MESA' && (
                      <IonCol size="12" sizeMd="12">
                        <IonItem>
                          <IonIcon icon={restaurantOutline} slot="start" />
                          <IonSelect
                            label="Selecciona mesa *"
                            labelPlacement="stacked"
                            placeholder="— Escoge mesa libre / ocupada —"
                            interface="popover"
                            value={mesaSeleccionadaId}
                            onIonChange={(e) => setMesaSeleccionadaId(e.detail.value)}
                          >
                            {mesasLibres.map((m: any) => (
                              <IonSelectOption key={m.id} value={m.id}>
                                {m.codigo || m.id} - {(m.nombreVisible || m.nombre || 'Mesa')} ({m.zona || 'Salón'})
                              </IonSelectOption>
                            ))}
                          </IonSelect>
                        </IonItem>
                      </IonCol>
                    )}
                  </IonRow>
                </IonCardContent>
              </IonCard>

              {errorMsg && (
                <IonItem color="danger" style={{ marginBottom: 12 }}>
                  <IonIcon icon={closeCircle} slot="start" />
                  <IonLabel>{errorMsg}</IonLabel>
                </IonItem>
              )}

              <IonRow>
                <IonCol size="12" sizeMd="8">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>🍽️ Catálogo Productos</IonCardTitle>
                      <IonCardSubtitle>Busca y agrega platos/bebidas.</IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonSearchbar
                        value={busqueda}
                        onIonInput={(e: any) => setBusqueda(e.detail.value || '')}
                        placeholder="Buscar por nombre / descripción / código..."
                        style={{ marginBottom: 8 }}
                      />
                      {loadingCat ? (
                        <div style={{ padding: 16 }}>
                          <IonSkeletonText animated style={{ width: '40%', height: 20, marginBottom: 8 }} />
                          <IonSkeletonText animated style={{ width: '100%', height: 14, marginBottom: 6 }} />
                          <IonSkeletonText animated style={{ width: '90%', height: 14 }} />
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                            {categorias.map((cat: any) => (
                              <IonChip
                                key={cat.id}
                                color={categoriaFiltroId === cat.id ? 'success' : 'medium'}
                                outline={categoriaFiltroId !== cat.id}
                                onClick={() => setCategoriaFiltroId(cat.id)}
                                style={{ cursor: 'pointer', fontWeight: categoriaFiltroId === cat.id ? 800 : 500 }}
                              >
                                <span slot="start" style={{ fontSize: 16, marginRight: 4 }}>{emojiCategoria(cat.id)}</span>
                                {cat.nombre}
                              </IonChip>
                            ))}
                          </div>

                          <IonGrid style={{ padding: 0 }}>
                            <IonRow>
                              {productos.length === 0 && (
                                <IonCol size="12">
                                  <IonItem color="warning">
                                    <IonIcon icon={informationCircle} slot="start" />
                                    <IonLabel>No se encontraron productos en esta categoría / búsqueda.</IonLabel>
                                  </IonItem>
                                </IonCol>
                              )}
                              {productos.map((prod) => (
                                <IonCol key={prod.id} size="6" sizeMd="4" sizeLg="3">
                                  <IonCard style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{
                                      background: '#ecfccb',
                                      padding: 22,
                                      fontSize: 44,
                                      textAlign: 'center',
                                      borderTopLeftRadius: 12,
                                      borderTopRightRadius: 12,
                                    }}>
                                      <span style={{ fontSize: 44 }}>{emojiCategoria(prod.categoriaId)}</span>
                                    </div>
                                    <IonCardContent style={{ padding: 12 }}>
                                      <IonCardTitle style={{ fontSize: 15, margin: 0, fontWeight: 800, lineHeight: 1.2 }}>
                                        {prod.nombre}
                                      </IonCardTitle>
                                      <IonCardSubtitle style={{ marginTop: 4, fontSize: 12, minHeight: 34 }}>
                                        {(prod as any).descripcion || ''}
                                      </IonCardSubtitle>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                        <IonText color="primary" style={{ fontSize: 16, fontWeight: 900 }}>
                                          S/ {Number(prod.precioVentaBase || 0).toFixed(2)}
                                        </IonText>
                                        <IonButton color="success" size="small" onClick={() => agregarProducto(prod)}>
                                          <IonIcon slot="icon-only" icon={add} />
                                        </IonButton>
                                      </div>
                                      {(prod as any).estadoProducto && (prod as any).estadoProducto !== 'ACTIVO' && (
                                        <IonBadge color="warning" style={{ marginTop: 6 }}>
                                          {(prod as any).estadoProducto}
                                        </IonBadge>
                                      )}
                                    </IonCardContent>
                                  </IonCard>
                                </IonCol>
                              ))}
                            </IonRow>
                          </IonGrid>
                        </>
                      )}
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                <IonCol size="12" sizeMd="4">
                  <IonCard color={carrito.length === 0 ? 'light' : 'success'} style={{ position: 'sticky', top: 0 }}>
                    <IonCardHeader>
                      <IonCardTitle>🛒 Tu pedido ({nroItems})</IonCardTitle>
                      <IonCardSubtitle>
                        Revisa cantidades y observaciones.
                      </IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      {carrito.length === 0 ? (
                        <IonItem color="transparent" lines="none">
                          <IonIcon icon={basket} slot="start" color="medium" />
                          <IonLabel color="medium">
                            <p>Carrito vacío.</p>
                            <p><small>Agrega productos desde el catálogo 👈 (+).</small></p>
                          </IonLabel>
                        </IonItem>
                      ) : (
                        <>
                          {carrito.map((l) => (
                            <IonCard key={l.key} style={{ marginBottom: 10 }}>
                              <IonCardContent style={{ padding: 12 }}>
                                <IonRow>
                                  <IonCol size="8">
                                    <h4 style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>{l.nombre}</h4>
                                    <IonNote style={{ display: 'block', margin: '4px 0' }}>
                                      S/ {Number(l.precioUnitario).toFixed(2)} x {l.cantidad} = <strong>S/ {(l.cantidad * l.precioUnitario).toFixed(2)}</strong>
                                    </IonNote>
                                  </IonCol>
                                  <IonCol size="4" style={{ textAlign: 'right' }}>
                                    <button
                                      onClick={() => cambiarCantidad(l.key, -1)}
                                      style={{
                                        borderRadius: 20, width: 28, height: 28, border: '1px solid #ccc',
                                        background: '#fff', cursor: 'pointer', fontWeight: 800,
                                      }}
                                    >
                                      −
                                    </button>
                                    {' '}
                                    <strong style={{ fontSize: 15 }}>{l.cantidad}</strong>
                                    {' '}
                                    <button
                                      onClick={() => cambiarCantidad(l.key, +1)}
                                      style={{
                                        borderRadius: 20, width: 28, height: 28, border: '1px solid #2dd36f',
                                        background: '#2dd36f', color: '#fff', cursor: 'pointer', fontWeight: 800,
                                      }}
                                    >
                                      +
                                    </button>
                                    <div style={{ marginTop: 6 }}>
                                      <IonButton
                                        fill="clear"
                                        color="danger"
                                        size="small"
                                        onClick={() => eliminarLinea(l.key)}
                                      >
                                        <IonIcon icon={close} slot="icon-only" />
                                      </IonButton>
                                    </div>
                                  </IonCol>
                                </IonRow>
                                <IonTextarea
                                  rows={2}
                                  placeholder="Observaciones: ej: sin hielo, sin cebolla, carne bien hecha..."
                                  value={l.observaciones}
                                  onIonChange={(e) => actualizarObs(l.key, e.detail.value || '')}
                                  style={{ marginTop: 6 }}
                                />
                              </IonCardContent>
                            </IonCard>
                          ))}

                          <IonItem color="success" lines="none">
                            <IonLabel style={{ fontSize: 18 }}><strong>TOTAL</strong></IonLabel>
                            <IonText slot="end" style={{ fontSize: 22, fontWeight: 900 }}>
                              S/ {Number(totalCarrito).toFixed(2)}
                            </IonText>
                          </IonItem>
                        </>
                      )}

                      <IonRow style={{ marginTop: 12 }}>
                        <IonCol size="12" sizeMd="6">
                          <IonButton expand="block" fill="outline" color="medium" onClick={cerrar} disabled={procesando}>
                            CANCELAR
                          </IonButton>
                        </IonCol>
                        <IonCol size="12" sizeMd="6">
                          <IonButton
                            expand="block"
                            color={tipoConsumo === 'CARGO_A_HABITACION' ? 'success' : 'primary'}
                            disabled={procesando}
                            onClick={handleConfirmar}
                          >
                            {procesando
                              ? 'Creando comanda…'
                              : tipoConsumo === 'CARGO_A_HABITACION'
                                ? '🚀 CARGAR A FOLIO · CONFIRMAR'
                                : '✔ CONFIRMAR · COBRO DIRECTO'}
                          </IonButton>
                        </IonCol>
                      </IonRow>
                      {errorMsg && (
                        <IonItem color="danger" style={{ marginBottom: 10, marginTop: 12, borderRadius: 12 }}>
                          <IonIcon icon={closeCircle} slot="start" />
                          <IonLabel>{errorMsg}</IonLabel>
                        </IonItem>
                      )}
                      {!errorMsg && !puedeConfirmar && carrito.length > 0 && (
                        <IonItem color="warning" style={{ marginBottom: 10, marginTop: 12, borderRadius: 12 }}>
                          <IonIcon icon={informationCircle} slot="start" />
                          <IonLabel>
                            {tipoConsumo === 'CARGO_A_HABITACION'
                              ? '⚠️ Falta seleccionar una habitación CHECKED_IN.'
                              : '⚠️ Falta seleccionar una mesa.'}
                          </IonLabel>
                        </IonItem>
                      )}
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </>
          )}

          {paso === 'exito' && ultimaComanda && (
            <IonCard color="success" style={{ maxWidth: 760, margin: '0 auto' }}>
              <IonCardContent>
                <h3 style={{ marginTop: 0 }}>
                  <IonIcon icon={checkmarkCircle} /> Comanda creada exitosamente
                </h3>
                <IonItem color="success" lines="none">
                  <IonIcon icon={documentText} slot="start" />
                  <IonLabel>
                    #<strong>{(ultimaComanda as any).numeroCorrelativo || ultimaComanda.numero}</strong> ·{' '}
                    <IonBadge color="light" style={{ color: '#2dd36f', fontWeight: 800 }}>
                      {(ultimaComanda as any).estado || 'ABIERTA'}
                    </IonBadge>
                    {' · '}
                    <IonBadge color="light" style={{ color: '#10b981', fontWeight: 800 }}>
                      {(ultimaComanda as any).tipoComanda || 'MESA'}
                    </IonBadge>
                  </IonLabel>
                </IonItem>
                <IonItem color="success" lines="none">
                  <IonIcon icon={basket} slot="start" />
                  <IonLabel>
                    {nroItems} item(s) · TOTAL ={' '}
                    <strong>S/ {Number((ultimaComanda as any).totalComanda || totalCarrito).toFixed(2)}</strong>
                  </IonLabel>
                </IonItem>
                {tipoConsumo === 'CARGO_A_HABITACION' && (
                  <IonItem color="success" lines="none">
                    <IonIcon icon={bed} slot="start" />
                    <IonLabel>
                      🚀 <strong>CARGO AUTOMÁTICO A FOLIO</strong> realizado correctamente. Folio:{' '}
                      <strong>{folioCodigoCreado || '(Vinculado al check-in)'}</strong>
                    </IonLabel>
                  </IonItem>
                )}
                {tipoConsumo === 'MESA' && (
                  <IonItem color="success" lines="none">
                    <IonIcon icon={cash} slot="start" />
                    <IonLabel>
                      Pedido enviado a Cocina / Caja. Cuando el cliente pague, cobrar desde opción Cobrar.
                    </IonLabel>
                  </IonItem>
                )}
                <IonItem color="success" lines="none">
                  <IonIcon icon={person} slot="start" />
                  <IonLabel>Registrado por: <strong>MO · {USUARIO_ACTUAL.id}</strong></IonLabel>
                </IonItem>
                <IonRow style={{ marginTop: 16 }}>
                  <IonCol size="12">
                    <IonButton expand="block" color="light" onClick={cerrar}>
                      ✔ LISTO · Cerrar
                    </IonButton>
                  </IonCol>
                </IonRow>
              </IonCardContent>
            </IonCard>
          )}
        </div>
      </div>
    </IonModal>
  );
};

export default TomarComanda;
