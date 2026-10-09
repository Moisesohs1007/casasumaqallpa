import React, { useState, useEffect, useRef } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonBadge,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonAlert,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonNote,
  IonModal,
  IonButtons,
  IonSegment,
  IonSegmentButton,
  useIonViewWillEnter,
  IonSearchbar,
  IonChip,
  useIonAlert,
} from '@ionic/react';
import {
  add, create, trash, save, close, bedOutline, buildOutline, pricetag,
  cube, addCircle, removeCircle, archive, restaurant,
  search, layers, fileTray, warning, checkmarkCircle,
  informationCircle, documentText, barcode, cash, people,
} from 'ionicons/icons';
import { Usuario, Rol, RolUsuario, ModuloPermiso, Moneda, AuditFields, Habitacion, TipoHabitacion, EstadoHabitacion } from '../../types';
import { HabitacionService, CatalogoFBService, InventarioService, seedProductos, type MoverStockResult, TarifaService, PosService } from '../../services';
import { supabase } from '../../services/__supabase_db__';
import './Perfil.css';

const nowIso = new Date().toISOString();
const audit: AuditFields = { createdAt: nowIso, updatedAt: nowIso };

const rolAdmin: Rol = {
  id: 'rol-admin',
  nombre: 'ADMINISTRACION' as RolUsuario,
  descripcion: 'Rol de administración completa para Casa Sumaq Allpa',
  nivelJerarquia: 90,
  estado: 'ACTIVO',
  permisos: ([
    'DASHBOARD','HABITACIONES','TARIFAS','RESERVAS','HUESPEDES','CHECKIN_CHECKOUT',
    'FOLIOS','CAJA_PAGOS','FACTURACION_SUNAT','HOUSEKEEPING','MANTENIMIENTO',
    'REPORTES','POS_FB','INVENTARIO','USUARIOS_ROLES','CONFIGURACION_SISTEMA','AUDITORIA',
  ] as Array<ModuloPermiso['modulo']>).map((modulo) => ({ modulo, permiso: 'ADMIN' as const })) as ModuloPermiso[],
  ...audit,
};

const usuario: Usuario = {
  id: 'usr-actual',
  uuid: 'usr-uuid-actual',
  iniciales: 'MO',
  nombres: 'Moises',
  apellidos: 'OHS',
  correoElectronico: 'moisesohs@gmail.com',
  rolId: rolAdmin.id,
  rol: rolAdmin,
  estado: 'ACTIVO',
  passwordHash: '__hidden__',
  preferencias: { idioma: 'es', zonaHoraria: 'America/Lima', monedaPorDefecto: 'PEN' as Moneda, paginacionPorDefecto: 25 },
  ultimoAcceso: nowIso,
  ...audit,
};

const ESTADOS_HAB: Array<EstadoHabitacion> = ['LIBRE','OCUPADA','RESERVADA','BLOQUEADA','LIMPIEZA','INSPECCIONADA','MANTENIMIENTO'];

interface HabForm {
  codigo: string; nombre: string; tipoHabitacionId: string; piso: string;
  ubicacion: string; estado: EstadoHabitacion; precioNoche: number; notasInternas: string;
  capacidadMaximaPax: number;
}

interface CatForm {
  nombre: string; orden: number; estado: 'ACTIVO' | 'INACTIVO';
  descripcion: string; color?: string;
}

interface ProdForm {
  codigo: string; nombre: string; descripcion: string; categoriaId: string;
  precioVentaBase: number; costoAproximado: number; impuestosIds: string[];
  unidadMedida: string; estado: 'ACTIVO' | 'INACTIVO'; orden: number;
  stockControl: boolean; stockActual: number; stockMinimo: number;
  observaciones: string;
}

interface StockForm {
  modo: 'AGREGAR' | 'QUITAR';
  productoId?: string;
  productoNombre?: string;
  delta: number;
  motivo: string;
}

const FORM_VACIO_HAB: HabForm = { codigo:'', nombre:'', tipoHabitacionId:'', piso:'', ubicacion:'', estado:'LIBRE', precioNoche:0, notasInternas:'', capacidadMaximaPax:2 };
const FORM_VACIO_CAT: CatForm = { nombre:'', orden: 0, estado: 'ACTIVO', descripcion:'', color:'' };
const FORM_VACIO_PROD: ProdForm = {
  codigo:'', nombre:'', descripcion:'', categoriaId:'', precioVentaBase:0, costoAproximado:0,
  impuestosIds:['IMP-IGV-18'], unidadMedida:'UND', estado:'ACTIVO', orden:0,
  stockControl:false, stockActual:0, stockMinimo:0, observaciones:'',
};
const fmtSoles = (n: number) => `S/ ${Number(n || 0).toFixed(2)}`;
const fmtNum = (n: number, dec = 0) => Number(n || 0).toFixed(dec);

const USR_ID = usuario.id;

const PerfilPage: React.FC = () => {
  // ==================== HABITACIONES STATES (se mantiene) ====================
  const [habsAdmin, setHabsAdmin] = useState<Habitacion[]>([]);
  const [tiposHab, setTiposHab] = useState<TipoHabitacion[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<HabForm>({ ...FORM_VACIO_HAB });
  const [confirmBorrar, setConfirmBorrar] = useState<{ id: string; codigo: string } | null>(null);

  // ==================== STOCK / PRODUCTOS STATES ====================
  const [categoriasFB, setCategoriasFB] = useState<any[]>([]);
  const [productosFB, setProductosFB] = useState<any[]>([]);
  const [busqProd, setBusqProd] = useState('');
  const [filtroCatId, setFiltroCatId] = useState<string>('');
  const [tabStock, setTabStock] = useState<'CATEGORIAS' | 'PRODUCTOS'>('PRODUCTOS');
  const [presentarCatAlert, _d1] = useIonAlert();
  const [presentarCrudCatAlert, _d2] = useIonAlert();
  const [presentarConfirmBorrarCatAlert, _d3] = useIonAlert();

  const [modalCatAbierto, setModalCatAbierto] = useState(false);
  const [editandoCatId, setEditandoCatId] = useState<string | null>(null);
  const [formCat, setFormCat] = useState<CatForm>({ ...FORM_VACIO_CAT });
  const [confirmBorrarCat, setConfirmBorrarCat] = useState<{ id: string; nombre: string } | null>(null);

  const [modalProdAbierto, setModalProdAbierto] = useState(false);
  const [editandoProdId, setEditandoProdId] = useState<string | null>(null);
  const [formProd, setFormProd] = useState<ProdForm>({ ...FORM_VACIO_PROD });
  const [confirmBorrarProd, setConfirmBorrarProd] = useState<{ id: string; nombre: string } | null>(null);

  const [modalStockAbierto, setModalStockAbierto] = useState(false);
  const [formStock, setFormStock] = useState<StockForm>({ modo: 'AGREGAR', delta: 0, motivo: '' });
  const [confirmQuitarStock, setConfirmQuitarStock] = useState<{ resumen: string; ejecutar: () => void } | null>(null);
  const [modalStockGlobalAbierto, setModalStockGlobalAbierto] = useState(false);
  const [busqStockGlobal, setBusqStockGlobal] = useState('');

  const [toast, setToast] = useState('');
  const mostrarToast = (t: string) => { setToast(t); window.setTimeout(() => setToast(''), 2600); };

  // ==================== HABITACIONES FUNCIONES (se mantiene) ====================
  const cargarHabs = () => {
    try {
      setTiposHab(HabitacionService.listarTipos() || []);
      setHabsAdmin(HabitacionService.listarTodas() || []);
    } catch {
      setHabsAdmin([]);
      setTiposHab([]);
    }
  };

  const abrirNuevo = () => {
    setEditandoId(null);
    const primerTipo = tiposHab[0];
    const capTipo = primerTipo ? (Number(primerTipo.capacidadAdultos || 0) + Number(primerTipo.capacidadNinos || 0)) : 2;
    setForm({ ...FORM_VACIO_HAB, tipoHabitacionId: primerTipo?.id || '', estado: 'LIBRE', precioNoche: Number(primerTipo?.precioBaseNoche ?? 0), capacidadMaximaPax: capTipo || 2 });
    setModalAbierto(true);
  };

  const abrirEditar = (h: Habitacion) => {
    const tipo = tiposHab.find((t) => t.id === h.tipoHabitacionId);
    const precio = Number(tipo?.precioBaseNoche ?? 0);
    const capTipo = tipo ? (Number(tipo.capacidadAdultos || 0) + Number(tipo.capacidadNinos || 0)) : 2;
    const hAny = h as any;
    const capHab = Number(hAny.capacidadMaximaPax ?? hAny.capacidadPersonas ?? 0);
    setEditandoId(h.id);
    setForm({
      codigo: h.codigo || '',
      nombre: h.nombre || '',
      tipoHabitacionId: h.tipoHabitacionId || '',
      piso: h.piso || '',
      ubicacion: h.ubicacion || '',
      estado: (h.estado as EstadoHabitacion) || 'LIBRE',
      precioNoche: precio,
      notasInternas: hAny.notasInternas || hAny.motivoBloqueo || '',
      capacidadMaximaPax: capHab || capTipo || 2,
    });
    setModalAbierto(true);
  };

  const guardarHab = () => {
    if (!form.codigo.trim()) { mostrarToast('Código es obligatorio (ej. H204)'); return; }
    if (!form.tipoHabitacionId) { mostrarToast('Selecciona Tipo de habitación'); return; }
    try {
      const base: any = {
        codigo: form.codigo.trim().toUpperCase(),
        nombre: form.nombre.trim() || form.codigo.trim().toUpperCase(),
        tipoHabitacionId: form.tipoHabitacionId,
        piso: form.piso.trim(),
        ubicacion: form.ubicacion.trim(),
        estado: form.estado,
        capacidadMaximaPax: Math.max(1, Number(form.capacidadMaximaPax || 2)),
        capacidadPersonas: Math.max(1, Number(form.capacidadMaximaPax || 2)),
        estadoLimpieza: form.estado === 'LIBRE' ? 'LIMPIA' : form.estado === 'MANTENIMIENTO' ? 'PENDIENTE' : 'EN_PROGRESO',
        notasInternas: form.notasInternas.trim(),
        motivoBloqueo: form.estado === 'MANTENIMIENTO' ? form.notasInternas.trim() : undefined,
        createdBy: USR_ID,
        updatedBy: USR_ID,
      };
      if (editandoId) {
        HabitacionService.actualizar(editandoId, base as any);
        mostrarToast(`Habitación ${base.codigo} actualizada ✅`);
      } else {
        HabitacionService.crear(base as any);
        mostrarToast(`Habitación ${base.codigo} creada ✅`);
      }
      if (form.precioNoche > 0 && form.tipoHabitacionId) {
        try { (HabitacionService as any).actualizarTipo?.(form.tipoHabitacionId, { precioBaseNoche: form.precioNoche }); } catch { /* noop */ }
      }
      setModalAbierto(false);
      cargarHabs();
    } catch (e: any) {
      mostrarToast(e?.message || 'Error al guardar habitación.');
    }
  };

  const borrarHab = () => {
    if (!confirmBorrar) return;
    try {
      HabitacionService.eliminar(confirmBorrar.id);
      mostrarToast(`Habitación ${confirmBorrar.codigo} eliminada ✅`);
    } catch (e: any) {
      mostrarToast(e?.message || 'Error al eliminar.');
    }
    setConfirmBorrar(null);
    cargarHabs();
  };

  const precioTipo = (tipoId: string) => {
    const t = tiposHab.find((x) => x.id === tipoId);
    return Number(t?.precioBaseNoche ?? 0);
  };

  // ==================== STOCK / PRODUCTOS FUNCIONES ====================
  const cargarSeedInicial = async (forzar = false) => {
    try {
      mostrarToast('🤖 Cargando catálogo oficial Casa Sumaq Allpa (120 productos)...');
      const res = await (seedProductos as any).ensureSeedInicialCompleto?.(forzar);
      cargarCatProd();
      if (res?.total) {
        mostrarToast(`✅ Catálogo cargado: ${res.categoriasCreadas || 0} categorías · ${res.productosCreados || 0} productos · ${res.alergenosCreados || 0} alérgenos`);
      } else {
        mostrarToast('✅ Catálogo listo.');
      }
    } catch (e: any) {
      mostrarToast(e?.message || 'Error al cargar el catálogo inicial.');
    }
  };
  const cargarCatProd = () => {
    try { setCategoriasFB(CatalogoFBService.listarCategorias() || []); } catch { setCategoriasFB([]); }
    try { setProductosFB(CatalogoFBService.listarProductos({ soloActivos: false }) || []); } catch { setProductosFB([]); }
  };

  useIonViewWillEnter(() => { cargarHabs(); cargarCatProd(); });

  const intentosRefPerfil = useRef(0);
  useEffect(() => {
    let alive = true;
    const recargarTodo = () => { try { cargarHabs(); } catch {} try { cargarCatProd(); } catch {} };
    const onHidratado = (e: any) => {
      if (!alive) return;
      const g = String(e?.detail?.grupo || '');
      if (g === 'habitaciones' || g === 'pos' || g === 'todos') recargarTodo();
    };
    try { window.addEventListener('lodge:hidratacion-listo', onHidratado as EventListener); } catch {}
    const id = window.setInterval(() => {
      if (!alive) return;
      intentosRefPerfil.current++;
      if (intentosRefPerfil.current >= 5) { window.clearInterval(id); return; }
      recargarTodo();
    }, 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
      try { window.removeEventListener('lodge:hidratacion-listo', onHidratado as EventListener); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    let debounceId: any;
    const TABLAS = ['habitaciones', 'tipos_habitacion', 'categorias_fb', 'productos_fb', 'presentaciones_fb', 'tarifas', 'temporadas', 'politicas_cancelacion', 'codigos_promocionales', 'impuestos', 'mesas', 'puntos_venta'];

    const recargarDebounced = () => {
      if (!alive) return;
      clearTimeout(debounceId);
      debounceId = setTimeout(async () => {
        if (!alive) return;
        try {
          await Promise.all([
            HabitacionService.hidratarDesdeSupabase?.(true),
            TarifaService.hidratarDesdeSupabase?.(true),
            PosService?.hidratarDesdeSupabase?.(true),
          ]);
        } catch (_) {}
        try { cargarHabs(); } catch (_) {}
        try { cargarCatProd(); } catch (_) {}
      }, 700);
    };

    const canales: any[] = [];
    try {
      for (const t of TABLAS) {
        const ch = supabase.channel(`rt-per-${t}-${Math.random().toString(36).slice(2,7)}`)
          .on('postgres_changes', { event: '*' as any, schema: 'public', table: t }, recargarDebounced)
          .subscribe();
        canales.push(ch);
      }
    } catch (_) {}

    return () => {
      alive = false;
      clearTimeout(debounceId);
      try { Promise.all(canales.map(c => supabase.removeChannel(c))).catch(()=>{}); } catch (_) {}
    };
  }, []);

  const generarCodigoProdAuto = (categoriaIdSel: string): string => {
    const cat = categoriasFB.find(c => c.id === categoriaIdSel);
    if (!cat) return '';
    const prefijoFull = String((cat.payload?.codigo) || cat.codigo || `CAT-${String(cat.id||'').slice(0,3).toUpperCase()}`);
    const prefijo = prefijoFull.replace(/^CAT-/, '').slice(0, 6).toUpperCase();
    if (!prefijo) return '';
    const existentes = productosFB.filter(p => String(p.codigo || '').toUpperCase().startsWith(`${prefijo}-`));
    const consecutivo = existentes.reduce((max: number, p: any) => {
      const suf = String(p.codigo || '').split('-')[1];
      const n = parseInt(suf || '0', 10);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);
    return `${prefijo}-${String(consecutivo + 1).padStart(3, '0')}`;
  };

  const stockPlanoProd = (p: any) => {
    const pAny = p as any;
    const sc = typeof pAny.stockControl === 'boolean' ? pAny.stockControl : (pAny.payload?.stockControl ?? false);
    const sa = typeof pAny.stockActual === 'number' ? pAny.stockActual : Number(pAny.payload?.stockActual ?? 0);
    const sm = typeof pAny.stockMinimo === 'number' ? pAny.stockMinimo : Number(pAny.payload?.stockMinimo ?? 0);
    return { stockControl: sc, stockActual: Number(sa || 0), stockMinimo: Number(sm || 0) };
  };

  // --- CATEGORIAS ---
  const abrirNuevoCat = () => {
    setEditandoCatId(null);
    setFormCat({ ...FORM_VACIO_CAT, orden: categoriasFB.length + 1 });
    setModalCatAbierto(true);
  };
  const abrirEditarCat = (c: any) => {
    setEditandoCatId(c.id);
    setFormCat({
      nombre: c.nombre || '',
      orden: Number(c.orden || 0),
      estado: (c.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO'),
      descripcion: c.descripcion || '',
      color: c.color || '',
    });
    setModalCatAbierto(true);
  };
  const guardarCat = () => {
    if (!formCat.nombre.trim()) { mostrarToast('Nombre categoría es obligatorio'); return; }
    try {
      const data = { ...formCat, nombre: formCat.nombre.trim(), descripcion: formCat.descripcion.trim() };
      if (editandoCatId) {
        CatalogoFBService.actualizarCategoria(editandoCatId, data, USR_ID);
        mostrarToast(`Categoría actualizada ✅`);
      } else {
        CatalogoFBService.crearCategoria(data, USR_ID);
        mostrarToast(`Categoría creada ✅`);
      }
      setModalCatAbierto(false);
      cargarCatProd();
    } catch (e: any) { mostrarToast(e?.message || 'Error al guardar categoría.'); }
  };
  const borrarCat = () => {
    if (!confirmBorrarCat) return;
    try {
      const prodsUso = productosFB.filter((p) => p.categoriaId === confirmBorrarCat.id);
      if (prodsUso.length > 0) {
        mostrarToast(`⛔ ${prodsUso.length} productos usan "${confirmBorrarCat.nombre}". Redirigiendo...`);
        setConfirmBorrarCat(null);
        setFiltroCatId(confirmBorrarCat.id);
        setTabStock('PRODUCTOS');
        return;
      }
      CatalogoFBService.eliminarCategoria(confirmBorrarCat.id);
      mostrarToast(`Categoría eliminada ✅`);
    } catch (e: any) { mostrarToast(e?.message || 'Error al eliminar.'); }
    setConfirmBorrarCat(null);
    cargarCatProd();
  };

  // --- PRODUCTOS ---
  const abrirNuevoProd = () => {
    setEditandoProdId(null);
    const catDefaultId = categoriasFB[0]?.id || '';
    setFormProd({
      ...FORM_VACIO_PROD,
      categoriaId: catDefaultId,
      codigo: catDefaultId ? generarCodigoProdAuto(catDefaultId) : '',
    });
    setModalProdAbierto(true);
  };
  const abrirEditarProd = (p: any) => {
    const plano = stockPlanoProd(p);
    setEditandoProdId(p.id);
    setFormProd({
      codigo: p.codigo || '',
      nombre: p.nombre || '',
      descripcion: p.descripcion || '',
      categoriaId: p.categoriaId || '',
      precioVentaBase: Number(p.precioVentaBase || 0),
      costoAproximado: Number(p.costoAproximado || p.costoUnitario || 0),
      impuestosIds: Array.isArray(p.impuestosIds) ? p.impuestosIds.slice() : ['IMP-IGV-18'],
      unidadMedida: p.unidadMedida || 'UND',
      estado: p.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
      orden: Number(p.orden || 0),
      stockControl: plano.stockControl,
      stockActual: plano.stockActual,
      stockMinimo: plano.stockMinimo,
      observaciones: p.observaciones || p.notasInternas || '',
    });
    setModalProdAbierto(true);
  };
  const guardarProd = () => {
    if (!formProd.nombre.trim()) { mostrarToast('Nombre producto es obligatorio'); return; }
    if (!formProd.categoriaId) { mostrarToast('Selecciona categoría'); return; }
    try {
      const codigoFinal = (formProd.codigo || '').trim()
        ? formProd.codigo.trim()
        : (generarCodigoProdAuto(formProd.categoriaId) || formProd.nombre.trim());
      const data = {
        ...formProd,
        codigo: codigoFinal,
        nombre: formProd.nombre.trim(),
        descripcion: formProd.descripcion.trim(),
        precioVentaBase: Number(formProd.precioVentaBase || 0),
        costoAproximado: Number(formProd.costoAproximado || 0),
        stockActual: Number(formProd.stockActual || 0),
        stockMinimo: Number(formProd.stockMinimo || 0),
        orden: Number(formProd.orden || 0),
        observaciones: formProd.observaciones.trim(),
      };
      if (editandoProdId) {
        CatalogoFBService.actualizarProducto(editandoProdId, data, USR_ID);
        mostrarToast(`Producto actualizado ✅`);
      } else {
        CatalogoFBService.crearProducto(data, USR_ID);
        mostrarToast(`Producto creado ✅`);
      }
      setModalProdAbierto(false);
      cargarCatProd();
    } catch (e: any) { mostrarToast(e?.message || 'Error al guardar producto.'); }
  };
  const borrarProd = () => {
    if (!confirmBorrarProd) return;
    try {
      CatalogoFBService.eliminarProducto(confirmBorrarProd.id);
      mostrarToast(`Producto eliminado ✅`);
    } catch (e: any) { mostrarToast(e?.message || 'Error al eliminar.'); }
    setConfirmBorrarProd(null);
    cargarCatProd();
  };

  // --- STOCK MOVIMIENTOS ---
  const abrirStockAgregar = (p: any) => {
    setFormStock({ modo: 'AGREGAR', productoId: p.id, productoNombre: p.nombre, delta: 1, motivo: 'Ingreso manual inventario' });
    setModalStockAbierto(true);
  };
  const abrirStockQuitar = (p: any) => {
    setFormStock({ modo: 'QUITAR', productoId: p.id, productoNombre: p.nombre, delta: 1, motivo: 'Merma / Egreso manual' });
    setModalStockAbierto(true);
  };
  const _ejecutarMovStock = (): { resultado?: MoverStockResult; error?: string } => {
    if (!formStock.productoId) return { error: 'Falta producto' };
    const deltaSigno = formStock.modo === 'AGREGAR' ? Math.abs(Number(formStock.delta || 0)) : -1 * Math.abs(Number(formStock.delta || 0));
    if (deltaSigno === 0) return { error: 'Cantidad debe ser mayor a 0' };
    const res = InventarioService.moverStockProducto(
      formStock.productoId,
      deltaSigno,
      formStock.motivo.trim() || (formStock.modo === 'AGREGAR' ? 'Ingreso manual' : 'Egreso manual'),
      USR_ID
    );
    return { resultado: res };
  };
  const guardarMovStock = () => {
    if (formStock.modo === 'QUITAR') {
      const cant = Math.abs(Number(formStock.delta || 0));
      const nombre = formStock.productoNombre || formStock.productoId || '';
      setConfirmQuitarStock({
        resumen: `Quitar ${fmtNum(cant)} ${formStock.modo === 'QUITAR' ? '' : ''} unidades de "${nombre}"\nMotivo: ${formStock.motivo || '(sin motivo)'}`,
        ejecutar: () => {
          const r = _ejecutarMovStock();
          if (r.error) { mostrarToast(r.error); }
          else if (r.resultado) {
            if (!r.resultado.ok) { mostrarToast(r.resultado.error || 'Error al descontar stock'); }
            else {
              const adv = r.resultado.advertencia === 'STOCK_NEGATIVO'
                ? ` ⚠️ Stock NEGATIVO (${r.resultado.stockNuevo})`
                : r.resultado.advertencia === 'STOCK_BAJO_MINIMO'
                  ? ` ⚠️ Stock bajo mínimo (${r.resultado.stockNuevo} < ${r.resultado.stockMinimo})`
                  : '';
              mostrarToast(`Stock actualizado${adv} ✅`);
              setModalStockAbierto(false);
              cargarCatProd();
            }
          }
          setConfirmQuitarStock(null);
        },
      });
      return;
    }
    const r = _ejecutarMovStock();
    if (r.error) { mostrarToast(r.error); return; }
    if (r.resultado) {
      if (!r.resultado.ok) { mostrarToast(r.resultado.error || 'Error al actualizar stock'); return; }
      const adv = r.resultado.advertencia === 'STOCK_BAJO_MINIMO' ? ` ⚠️ Stock bajo mínimo` : '';
      mostrarToast(`Stock actualizado${adv} ✅`);
    }
    setModalStockAbierto(false);
    cargarCatProd();
  };

  const productosFiltrados = (productosFB || []).filter((p) => {
    if (filtroCatId && p.categoriaId !== filtroCatId) return false;
    if (busqProd && busqProd.trim()) {
      const q = busqProd.trim().toLowerCase();
      const hit = (p.nombre || '').toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Panel Admin</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="admin-content-page">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">
              <IonIcon icon={buildOutline} className="admin-title-lrg-icon" />
              Casa Sumaq Allpa
            </IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonCard className="admin-hero-card">
          <IonCardContent className="ion-no-padding">
            <IonGrid>
              <IonRow className="admin-hero-row">
                <IonCol size="4" sizeSm="3">
                  <IonAvatar className="admin-hero-avatar">
                    <div className="admin-hero-avatar-inner">{usuario.iniciales}</div>
                  </IonAvatar>
                </IonCol>
                <IonCol size="8" sizeSm="9" className="admin-hero-info">
                  <div className="admin-hero-name">{usuario.nombres} {usuario.apellidos}</div>
                  <div className="admin-hero-rol">
                    <IonChip color="tertiary" outline>
                      <IonIcon icon={people} />
                      &nbsp;{String(usuario.rol?.nombre ?? 'Administración').replace('_', ' ')}
                    </IonChip>
                  </div>
                  <div className="admin-hero-sede">
                    <strong>Sede:</strong> Casa Sumaq Allpa · {usuario.correoElectronico}
                  </div>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>

        {/* =============== GESTIÓN HABITACIONES (CARDS PROFESIONALES) =============== */}
        <IonCard className="section-card">
          <IonCardHeader className="section-header">
            <div className="section-header-title">
              <div className="section-icon section-icon-hab">
                <IonIcon icon={bedOutline} />
              </div>
              <div>
                <div className="section-title">Gestión de Habitaciones</div>
                <div className="section-subtitle">
                  {habsAdmin.length} de 5 habitaciones físicas · Controla estado, capacidad y tarifa
                </div>
              </div>
            </div>
            <IonButton color="primary" className="section-btn-add" onClick={abrirNuevo}>
              <IonIcon slot="start" icon={add} />
              Nueva habitación
            </IonButton>
          </IonCardHeader>

          <IonCardContent className="section-content">
            {habsAdmin.length === 0 ? (
              <div className="empty-state">
                <IonIcon icon={bedOutline} className="empty-state-icon" />
                <div className="empty-state-title">No hay habitaciones registradas</div>
                <div className="empty-state-text">Crea la primera habitación usando el botón superior.</div>
              </div>
            ) : (
              <IonGrid className="hab-cards-grid">
                <IonRow>
                  {habsAdmin.map((h) => {
                    const precio = precioTipo(h.tipoHabitacionId);
                    const tipo = tiposHab.find((t) => t.id === h.tipoHabitacionId);
                    const hAny = h as any;
                    const capHab = Number(hAny.capacidadMaximaPax ?? hAny.capacidadPersonas ?? 2);
                    const colorEstado: Record<EstadoHabitacion, string> = {
                      LIBRE: 'success', DISPONIBLE: 'success', OCUPADA: 'danger',
                      RESERVADA: 'primary', BLOQUEADA: 'medium', LIMPIEZA: 'warning',
                      INSPECCIONADA: 'tertiary', MANTENIMIENTO: 'medium',
                    };
                    const estadoLbl: Record<EstadoHabitacion, string> = {
                      LIBRE: 'Libre', DISPONIBLE: 'Disponible', OCUPADA: 'Ocupada',
                      RESERVADA: 'Reservada', BLOQUEADA: 'Bloqueada', LIMPIEZA: 'Limpieza',
                      INSPECCIONADA: 'Inspeccionada', MANTENIMIENTO: 'Mantenimiento',
                    };
                    return (
                      <IonCol size="12" sizeMd="6" sizeLg="4" key={h.id}>
                        <IonCard className={`hab-card hab-${colorEstado[h.estado]}-border`}>
                          <IonCardHeader className="hab-card-header">
                            <div className="hab-card-head-l">
                              <div className="hab-card-codigo">{h.codigo}</div>
                              <div className="hab-card-nombre">{h.nombre || tipo?.nombre || 'Habitación'}</div>
                            </div>
                            <IonBadge color={colorEstado[h.estado]} className="hab-card-estado">
                              {estadoLbl[h.estado]}
                            </IonBadge>
                          </IonCardHeader>

                          <IonCardContent className="hab-card-body">
                            <div className="hab-card-info-row">
                              <IonChip className="hab-chip hab-chip-tipo" color="light" outline>
                                <IonIcon icon={layers} />
                                &nbsp;{tipo?.nombre || 'Sin tipo'}
                              </IonChip>
                              <IonChip className="hab-chip hab-chip-cap" color="primary" outline>
                                <IonIcon icon={people} />
                                &nbsp;{capHab} pax
                              </IonChip>
                            </div>

                            {h.ubicacion && (
                              <div className="hab-card-ubic">
                                <IonIcon icon={informationCircle} />
                                <span>{h.piso ? `Piso ${h.piso} · ` : ''}{h.ubicacion}</span>
                              </div>
                            )}

                            <div className="hab-card-footer">
                              <div className="hab-card-precio">
                                <IonIcon icon={pricetag} />
                                <span className="hab-precio-nro">{fmtSoles(precio)}</span>
                                <span className="hab-precio-lbl">/ noche</span>
                              </div>
                              <div className="hab-card-actions">
                                <IonButton fill="outline" size="small" color="primary" onClick={() => abrirEditar(h)}>
                                  <IonIcon slot="icon-only" icon={create} />
                                </IonButton>
                                <IonButton fill="outline" size="small" color="danger" onClick={() => setConfirmBorrar({ id: h.id, codigo: h.codigo })}>
                                  <IonIcon slot="icon-only" icon={trash} />
                                </IonButton>
                              </div>
                            </div>
                          </IonCardContent>
                        </IonCard>
                      </IonCol>
                    );
                  })}
                </IonRow>
              </IonGrid>
            )}
          </IonCardContent>
        </IonCard>

        {/* =============== GESTIÓN PRODUCTOS & STOCK (PROFESIONAL 2 TABS IONSEGMENT) =============== */}
        <IonCard className="section-card">
          <IonCardHeader className="section-header">
            <div className="section-header-title">
              <div className="section-icon section-icon-stock">
                <IonIcon icon={cube} />
              </div>
              <div>
                <div className="section-title">Gestión Productos &amp; Stock</div>
                <div className="section-subtitle">
                  {productosFB.length} productos · {categoriasFB.length} categorías · {productosFB.filter(p => stockPlanoProd(p).stockControl && stockPlanoProd(p).stockActual <= stockPlanoProd(p).stockMinimo && stockPlanoProd(p).stockMinimo > 0).length} productos stock bajo
                </div>
              </div>
            </div>
            <div className="stock-header-actions-v2">
              <IonButton size="default" color="tertiary" fill="outline" className="btn-stock-header" onClick={abrirNuevoCat}>
                <IonIcon slot="start" icon={layers} />
                Categoría
              </IonButton>
              <IonButton size="default" color="success" className="btn-stock-header" onClick={abrirNuevoProd}>
                <IonIcon slot="start" icon={add} />
                Producto
              </IonButton>
              <IonButton size="default" color="primary" className="btn-stock-header" onClick={() => { setBusqStockGlobal(''); setModalStockGlobalAbierto(true); }}>
                <IonIcon slot="start" icon={archive} />
                +Stock Global
              </IonButton>
            </div>
          </IonCardHeader>

          {/* TABS IONSEGMENT CATEGORÍAS / PRODUCTOS */}
          <div className="stock-tabs-wrap">
            <IonSegment value={tabStock} onIonChange={(e: any) => setTabStock(e.target.value)} className="stock-segment-tabs">
              <IonSegmentButton value="CATEGORIAS" type="button" className={tabStock === 'CATEGORIAS' ? 'seg-active' : ''}>
                <IonIcon icon={layers} />
                <IonLabel>Categorías ({categoriasFB.length})</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="PRODUCTOS" type="button" className={tabStock === 'PRODUCTOS' ? 'seg-active' : ''}>
                <IonIcon icon={cube} />
                <IonLabel>Productos ({productosFB.length})</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </div>

          <IonCardContent className="section-content stock-section-content">

            {/* ============== TAB: CATEGORÍAS ============== */}
            {tabStock === 'CATEGORIAS' && (
              <>
                {categoriasFB.length === 0 ? (
                  <div className="empty-state">
                    <IonIcon icon={layers} className="empty-state-icon" />
                    <div className="empty-state-title">Catálogo vacío</div>
                    <div className="empty-state-text">Usa el seed oficial del menú Casa Sumaq Allpa (12 categorías · ~120 productos reales) o crea categorías manualmente.</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                      <IonButton color="success" className="mt-xl" onClick={() => {
                        try {
                          const r = (seedProductos as any).ensureSeedInicialCompleto?.(true);
                          mostrarToast(`✅ Seed cargado: ${(r as any)?.total || 0} elementos`);
                          cargarCatProd();
                        } catch (e: any) { mostrarToast('⚠️ Seed falló: ' + (e.message || e)); }
                      }}>
                        <IonIcon slot="start" icon={restaurant} />
                        🤖 Cargar menú oficial · 120 productos
                      </IonButton>
                      <IonButton color="primary" fill="outline" className="mt-xl" onClick={abrirNuevoCat}>
                        <IonIcon slot="start" icon={add} />
                        Crear categoría manual
                      </IonButton>
                    </div>
                  </div>
                ) : (
                  <IonGrid>
                    <IonRow>
                      {[...categoriasFB].sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0)).map((c) => {
                        const cnt = productosFB.filter((p) => p.categoriaId === c.id).length;
                        return (
                          <IonCol size="12" sizeSm="6" sizeMd="4" key={c.id}>
                            <IonCard className="cat-card" onClick={() => { setFiltroCatId(c.id); setTabStock('PRODUCTOS'); }}>
                              <IonCardHeader className="cat-card-head">
                                <div className="cat-color-dot" style={{ background: c.payload?.colorEtiqueta || c.color || '#2dd36f' }}></div>
                                <div className="cat-nombre">{c.nombre}</div>
                                <IonBadge color={c.estado === 'INACTIVO' ? 'medium' : 'primary'} className="cat-count">{cnt} productos</IonBadge>
                              </IonCardHeader>
                              <IonCardContent className="cat-card-body">
                                {c.descripcion && <div className="cat-desc">{c.descripcion}</div>}
                                <div className="cat-orden">Orden: {c.orden || 0} · {c.estado}</div>
                                <div className="cat-actions">
                                  <IonButton fill="outline" size="small" color="primary" onClick={(e: any) => { e.stopPropagation(); abrirEditarCat(c); }}>
                                    <IonIcon slot="icon-only" icon={create} />
                                  </IonButton>
                                  <IonButton fill="outline" size="small" color="danger" onClick={(e: any) => { e.stopPropagation(); setConfirmBorrarCat({ id: c.id, nombre: c.nombre }); }}>
                                    <IonIcon slot="icon-only" icon={trash} />
                                  </IonButton>
                                </div>
                              </IonCardContent>
                            </IonCard>
                          </IonCol>
                        );
                      })}
                    </IonRow>
                  </IonGrid>
                )}
              </>
            )}

            {/* ============== TAB: PRODUCTOS ============== */}
            {tabStock === 'PRODUCTOS' && (
              <>
                {/* FILTROS PROFESIONALES */}
                <div className="prod-filters-wrap">
                  <IonSearchbar
                    className="prod-searchbar"
                    placeholder="Buscar por nombre, código o descripción..."
                    value={busqProd}
                    onIonInput={(e: any) => setBusqProd(String(e.target.value || ''))}
                    showCancelButton="never"
                    debounce={250}
                    mode="ios"
                    searchIcon={search}
                  />

                  {categoriasFB.length > 0 && (
                    <div className="prod-chips-cat">
                      <IonChip
                        className={`prod-chip-cat ${filtroCatId === '' ? 'prod-chip-cat-active' : ''}`}
                        onClick={() => setFiltroCatId('')}
                      >
                        <IonIcon icon={layers} />
                        &nbsp;Todas ({productosFB.length})
                      </IonChip>
                      {[...categoriasFB].sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0)).map((c) => {
                        const cnt = productosFB.filter((p) => p.categoriaId === c.id).length;
                        return (
                          <IonChip
                            key={c.id}
                            className={`prod-chip-cat ${filtroCatId === c.id ? 'prod-chip-cat-active' : ''}`}
                            color={c.estado === 'INACTIVO' ? 'medium' : 'tertiary'}
                            onClick={() => setFiltroCatId(filtroCatId === c.id ? '' : c.id)}
                          >
                            {c.nombre} ({cnt})
                          </IonChip>
                        );
                      })}
                    </div>
                  )}
                </div>

                {productosFiltrados.length === 0 ? (
                  <div className="empty-state">
                    <IonIcon icon={fileTray} className="empty-state-icon" />
                    <div className="empty-state-title">
                      {busqProd || filtroCatId ? 'Sin resultados' : 'No hay productos'}
                    </div>
                    <div className="empty-state-text">
                      {categoriasFB.length === 0 && !busqProd && !filtroCatId
                        ? 'El catálogo se encuentra vacío. Puedes cargar el menú oficial de Casa Sumaq Allpa (120 productos, 12 categorías) o crear productos manualmente.'
                        : categoriasFB.length === 0
                          ? 'Crea primero una categoría y luego productos.'
                          : busqProd || filtroCatId
                            ? 'Cambia los filtros o limpia la búsqueda.'
                            : 'Usa el botón "+ Producto" para agregar el primero.'}
                    </div>
                    {!busqProd && !filtroCatId && (
                      categoriasFB.length === 0 && productosFB.length === 0 ? (
                        <div style={{display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', marginTop:8}}>
                          <IonButton color="tertiary" className="mt-xl" onClick={() => cargarSeedInicial(false)}>
                            <IonIcon slot="start" icon={restaurant} />
                            🤖 Cargar menú oficial · 120 productos
                          </IonButton>
                          <IonButton color="medium" fill="outline" className="mt-xl" onClick={abrirNuevoProd}>
                            <IonIcon slot="start" icon={add} />
                            Crear manualmente
                          </IonButton>
                        </div>
                      ) : categoriasFB.length > 0 ? (
                        <IonButton color="success" className="mt-xl" onClick={abrirNuevoProd}>
                          <IonIcon slot="start" icon={add} />
                          Crear primer producto
                        </IonButton>
                      ) : null
                    )}
                  </div>
                ) : (
                  <IonGrid className="prod-cards-grid">
                    <IonRow>
                      {productosFiltrados.map((p) => {
                        const plano = stockPlanoProd(p);
                        const cat = categoriasFB.find((c) => c.id === p.categoriaId);
                        const precioGanancia = Number(p.precioVentaBase || 0) - Number(p.costoAproximado || 0);
                        const pctGan = Number(p.precioVentaBase || 0) > 0
                          ? Math.round((precioGanancia / Number(p.precioVentaBase || 1)) * 100)
                          : 0;
                        // Stock color & status label + progress
                        let stockColor = 'success';
                        let stockLabel = 'OK';
                        let stockIcon = checkmarkCircle;
                        let stockPct = 0;
                        if (!plano.stockControl) {
                          stockColor = 'medium'; stockLabel = 'N/A'; stockIcon = documentText; stockPct = 0;
                        } else if (plano.stockActual < 0) {
                          stockColor = 'danger'; stockLabel = 'Stock Negativo'; stockIcon = warning; stockPct = 0;
                        } else if (plano.stockActual === 0) {
                          stockColor = 'warning'; stockLabel = 'Stock Cero'; stockIcon = warning; stockPct = 0;
                        } else if (plano.stockMinimo > 0 && plano.stockActual < plano.stockMinimo) {
                          stockColor = 'warning'; stockLabel = 'Stock Bajo'; stockIcon = warning;
                          stockPct = Math.max(5, Math.round((plano.stockActual / Math.max(plano.stockMinimo * 2, 1)) * 100));
                        } else {
                          const referencia = Math.max(plano.stockMinimo * 2, 1);
                          stockPct = Math.min(100, Math.max(25, Math.round((plano.stockActual / referencia) * 100)));
                        }
                        return (
                          <IonCol size="12" sizeSm="6" sizeLg="4" sizeXl="3" key={p.id}>
                            <IonCard className={`prod-card prod-${stockColor}-accent ${p.estado === 'INACTIVO' ? 'prod-inactivo' : ''}`}>
                              <IonCardHeader className="prod-card-head">
                                <div className="prod-head-l">
                                  <IonBadge color="light" className="prod-cod-badge">
                                    <IonIcon icon={barcode} />
                                    &nbsp;{p.codigo || '—'}
                                  </IonBadge>
                                  <div className="prod-nombre">{p.nombre}</div>
                                  <div className="prod-meta">
                                    <IonChip color="light" outline className="prod-chip-mini">
                                      {cat?.nombre || 'Sin cat.'}
                                    </IonChip>
                                    <IonChip color={p.estado === 'ACTIVO' ? 'success' : 'medium'} outline className="prod-chip-mini prod-chip-estado">
                                      {p.estado || 'ACTIVO'}
                                    </IonChip>
                                  </div>
                                </div>
                              </IonCardHeader>

                              <IonCardContent className="prod-card-body">
                                {/* PRECIOS */}
                                <div className="prod-precios-row">
                                  <div className="prod-precio-vta">
                                    <IonIcon icon={cash} />
                                    <span>{fmtSoles(p.precioVentaBase)}</span>
                                  </div>
                                  <div className="prod-gan-pct" style={{ color: pctGan >= 40 ? '#2dd36f' : pctGan >= 20 ? '#ffc409' : '#eb445a' }}>
                                    {pctGan}% margen
                                  </div>
                                </div>
                                <div className="prod-costos-line">
                                  Costo {fmtSoles(p.costoAproximado)} · Gan. {fmtSoles(precioGanancia)} · {p.unidadMedida || 'UND'}
                                </div>

                                {/* STOCK CONTROL */}
                                <div className={`prod-stock-box prod-stock-${stockColor}`}>
                                  <div className="prod-stock-head">
                                    <div className="prod-stock-label">
                                      <IonIcon icon={stockIcon} />
                                      <span>{stockLabel}</span>
                                    </div>
                                    {plano.stockControl ? (
                                      <div className="prod-stock-nro">
                                        <strong>{fmtNum(plano.stockActual)}</strong>
                                        <span className="prod-stock-um">/ {fmtNum(plano.stockMinimo)} min</span>
                                      </div>
                                    ) : (
                                      <div className="prod-stock-nro"><span style={{ color: '#999' }}>Sin control</span></div>
                                    )}
                                  </div>
                                  {plano.stockControl && (
                                    <div className="stock-progress-wrap">
                                      <div className="stock-progress-bar">
                                        <div
                                          className={`stock-progress-fill stock-fill-${stockColor}`}
                                          style={{ width: `${stockPct}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* ACCIONES GRID 4 BOTONES (solo stockControl=true muestra Agregar/Quitar) */}
                                <div className="prod-actions-grid">
                                  {plano.stockControl && (
                                    <IonButton
                                      size="default"
                                      color="success"
                                      fill="outline"
                                      expand="block"
                                      onClick={() => abrirStockAgregar(p)}
                                    >
                                      <IonIcon slot="start" icon={addCircle} />
                                      Agregar
                                    </IonButton>
                                  )}
                                  {plano.stockControl && (
                                    <IonButton
                                      size="default"
                                      color="warning"
                                      fill="outline"
                                      expand="block"
                                      onClick={() => abrirStockQuitar(p)}
                                    >
                                      <IonIcon slot="start" icon={removeCircle} />
                                      Quitar
                                    </IonButton>
                                  )}
                                  <IonButton size="default" color="primary" fill="outline" expand="block" onClick={() => abrirEditarProd(p)}>
                                    <IonIcon slot="start" icon={create} />
                                    Editar
                                  </IonButton>
                                  <IonButton size="default" color="danger" fill="outline" expand="block" onClick={() => setConfirmBorrarProd({ id: p.id, nombre: p.nombre })}>
                                    <IonIcon slot="start" icon={trash} />
                                    Eliminar
                                  </IonButton>
                                </div>
                              </IonCardContent>
                            </IonCard>
                          </IonCol>
                        );
                      })}
                    </IonRow>
                  </IonGrid>
                )}
              </>
            )}
          </IonCardContent>
        </IonCard>

        <IonCard className="section-card config-card">
          <IonCardHeader className="section-header section-header-sm">
            <div className="section-title small">Configuración del sistema</div>
          </IonCardHeader>
          <IonList lines="inset" inset>
            <IonItem button detail><IonLabel>Configuración de cuenta</IonLabel></IonItem>
            <IonItem button detail><IonLabel>Permisos y roles</IonLabel></IonItem>
            <IonItem button detail><IonLabel>Preferencias de notificaciones</IonLabel></IonItem>
            <IonItem button lines="none" className="ion-text-color-danger"><IonLabel className="ion-text-color-danger">Cerrar sesión</IonLabel></IonItem>
          </IonList>
        </IonCard>

        {toast && <div className="admin-toast">{toast}</div>}

        {/* ============ MODAL: Nueva / Editar Habitación PROFESIONAL ============ */}
        <IonModal isOpen={modalAbierto} onDidDismiss={() => setModalAbierto(false)} initialBreakpoint={0.95} breakpoints={[0, 0.5, 0.95, 1]}>
          <IonHeader className="ion-no-border">
            <IonToolbar color={editandoId ? 'primary' : 'success'}>
              <IonButtons slot="start">
                <IonButton onClick={() => setModalAbierto(false)}>
                  <IonIcon slot="icon-only" icon={close} />
                </IonButton>
              </IonButtons>
              <IonTitle>
                <IonIcon icon={bedOutline} />
                &nbsp;{editandoId ? 'Editar habitación' : 'Nueva habitación'}
              </IonTitle>
              <IonButtons slot="end">
                <IonButton color="light" onClick={() => setModalAbierto(false)}>Cancelar</IonButton>
                <IonButton strong onClick={guardarHab}>
                  <IonIcon slot="start" icon={save} /> Guardar
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding modal-padding">
            <div className="modal-section">
              <div className="modal-section-title"><IonIcon icon={barcode} /> Identificación</div>
              <IonGrid>
                <IonRow>
                  <IonCol size="12" sizeMd="4">
                    <IonItem className="form-item">
                      <IonInput
                        label="Código *"
                        labelPlacement="stacked"
                        placeholder="Ej: H204 / SUITE 2"
                        value={form.codigo}
                        onIonInput={(e: any) => setForm({ ...form, codigo: String(e.target.value || '').toUpperCase() })}
                        inputmode="text"
                        maxlength={12}
                      />
                    </IonItem>
                  </IonCol>
                  <IonCol size="12" sizeMd="8">
                    <IonItem className="form-item">
                      <IonInput
                        label="Nombre comercial"
                        labelPlacement="stacked"
                        placeholder="Ej: Habitación Doble Frente Piscina"
                        value={form.nombre}
                        onIonInput={(e: any) => setForm({ ...form, nombre: String(e.target.value || '') })}
                      />
                    </IonItem>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>

            <div className="modal-section">
              <div className="modal-section-title"><IonIcon icon={bedOutline} /> Tipo y ubicación</div>
              <IonItem className="form-item">
                <IonSelect
                  label="Tipo habitación *"
                  labelPlacement="stacked"
                  value={form.tipoHabitacionId}
                  placeholder="Selecciona un tipo"
                  onIonChange={(e: any) => {
                    const selTipo = (tiposHab || []).find((t: any) => t.id === e.target.value);
                    const capTipo = selTipo ? (Number(selTipo.capacidadAdultos || 0) + Number(selTipo.capacidadNinos || 0)) : 2;
                    setForm({
                      ...form,
                      tipoHabitacionId: e.target.value,
                      precioNoche: selTipo ? Number(selTipo.precioBaseNoche ?? 0) : form.precioNoche,
                      capacidadMaximaPax: Math.max(capTipo || 2, form.capacidadMaximaPax || 2),
                    });
                  }}
                  interface="action-sheet"
                >
                  {(tiposHab || []).map((t) => (
                    <IonSelectOption key={t.id} value={t.id}>
                      {t.nombre}{t.precioBaseNoche ? `  ·  ${fmtSoles(Number(t.precioBaseNoche))}/noche` : ''}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonGrid>
                <IonRow>
                  <IonCol size="12" sizeMd="6">
                    <IonItem className="form-item">
                      <IonInput
                        label="Piso"
                        labelPlacement="stacked"
                        placeholder="Ej: 2"
                        value={form.piso}
                        onIonInput={(e: any) => setForm({ ...form, piso: String(e.target.value || '') })}
                      />
                    </IonItem>
                  </IonCol>
                  <IonCol size="12" sizeMd="6">
                    <IonItem className="form-item">
                      <IonInput
                        label="Ubicación / Vista"
                        labelPlacement="stacked"
                        placeholder="Ej: Piso 2 · Vista jardín"
                        value={form.ubicacion}
                        onIonInput={(e: any) => setForm({ ...form, ubicacion: String(e.target.value || '') })}
                      />
                    </IonItem>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>

            <div className="modal-section">
              <div className="modal-section-title"><IonIcon icon={pricetag} /> Estado, capacidad y tarifa</div>
              <IonGrid>
                <IonRow>
                  <IonCol size="12" sizeMd="6">
                    <IonItem className="form-item">
                      <IonSelect
                        label="Estado *"
                        labelPlacement="stacked"
                        value={form.estado}
                        onIonChange={(e: any) => setForm({ ...form, estado: e.target.value as EstadoHabitacion })}
                      >
                        {ESTADOS_HAB.map((e) => <IonSelectOption key={e} value={e}>{e}</IonSelectOption>)}
                      </IonSelect>
                    </IonItem>
                  </IonCol>
                  <IonCol size="12" sizeMd="6">
                    <IonItem className="form-item">
                      <IonInput
                        label="Precio / noche (S/)"
                        labelPlacement="stacked"
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="180"
                        value={form.precioNoche}
                        onIonInput={(e: any) => setForm({ ...form, precioNoche: Number(e.target.value || 0) })}
                      />
                    </IonItem>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="12" sizeMd="6">
                    <div className="stock-input-card stock-input-success">
                      <div className="stock-input-label">
                        <IonIcon icon={people} /> Capacidad máxima (pax) *
                      </div>
                      <IonItem lines="none" className="stock-input-item">
                        <IonInput
                          type="number"
                          step="1"
                          min="1"
                          max="20"
                          inputMode="numeric"
                          placeholder="Ej: 2"
                          value={form.capacidadMaximaPax}
                          onIonInput={(e: any) => setForm({ ...form, capacidadMaximaPax: Math.max(1, Number(e.target.value || 1)) })}
                        />
                      </IonItem>
                      <div className="stock-input-hint">Cuántas personas (adultos + niños) pueden ocupar la habitación.</div>
                    </div>
                  </IonCol>
                  <IonCol size="12" sizeMd="6">
                    <div className="modal-summary modal-summary-hab">
                      <div className="summary-row"><span>Tarifa estimada noche:</span> <strong className="summary-value">{fmtSoles(form.precioNoche)}</strong></div>
                      <div className="summary-row"><span>Ocupación máxima (pax):</span> <strong className="summary-value">{Math.max(1, form.capacidadMaximaPax || 2)}</strong></div>
                      <div className="summary-row"><span>Estado:</span> <IonBadge color={
                        form.estado === 'LIBRE' || form.estado === 'DISPONIBLE' ? 'success' :
                        form.estado === 'OCUPADA' ? 'danger' :
                        form.estado === 'LIMPIEZA' ? 'warning' :
                        form.estado === 'MANTENIMIENTO' ? 'medium' : 'primary'
                      } style={{ marginLeft: 4 }}>{form.estado}</IonBadge></div>
                    </div>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>

            <div className="modal-section">
              <div className="modal-section-title"><IonIcon icon={documentText} /> Notas internas</div>
              <IonItem lines="none" className="form-item">
                <IonTextarea
                  label={form.estado === 'MANTENIMIENTO' ? 'Motivo mantenimiento / Notas internas' : 'Notas internas / Observaciones'}
                  labelPlacement="stacked"
                  rows={3}
                  placeholder={form.estado === 'MANTENIMIENTO' ? 'Ej: Calefón en reparación · fecha estimada término' : '(opcional) Información adicional para staff.'}
                  value={form.notasInternas}
                  onIonInput={(e: any) => setForm({ ...form, notasInternas: String(e.target.value || '') })}
                />
              </IonItem>
            </div>

            <div className="modal-actions-footer">
              <IonButton size="default" color="medium" fill="outline" expand="block" onClick={() => setModalAbierto(false)}>
                <IonIcon slot="start" icon={close} /> Cancelar
              </IonButton>
              <IonButton size="default" color={editandoId ? 'primary' : 'success'} expand="block" onClick={guardarHab}>
                <IonIcon slot="start" icon={save} />
                {editandoId ? 'Guardar cambios' : 'Crear habitación'}
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        {/* ============ MODAL: Nueva / Editar CATEGORIA PROFESIONAL ============ */}
        <IonModal isOpen={modalCatAbierto} onDidDismiss={() => setModalCatAbierto(false)} initialBreakpoint={0.7} breakpoints={[0, 0.5, 0.7, 1]}>
          <IonHeader className="ion-no-border">
            <IonToolbar color={editandoCatId ? 'tertiary' : 'primary'}>
              <IonTitle>{editandoCatId ? 'Editar categoría' : 'Nueva categoría'}</IonTitle>
              <IonButtons slot="start">
                <IonButton onClick={() => setModalCatAbierto(false)}>
                  <IonIcon slot="icon-only" icon={close} />
                </IonButton>
              </IonButtons>
              <IonButtons slot="end">
                <IonButton strong onClick={guardarCat}>
                  <IonIcon slot="start" icon={save} /> Guardar
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList lines="inset">
              <IonItem>
                <IonInput
                  label="Nombre categoría *"
                  labelPlacement="stacked"
                  placeholder="Ej: Bebidas, Platos a la carta, Postres..."
                  value={formCat.nombre}
                  onIonInput={(e: any) => setFormCat({ ...formCat, nombre: String(e.target.value || '') })}
                />
              </IonItem>
              <IonGrid>
                <IonRow>
                  <IonCol size="6">
                    <IonItem>
                      <IonInput
                        label="Orden"
                        labelPlacement="stacked"
                        type="number" step="1" min="0"
                        value={formCat.orden}
                        onIonInput={(e: any) => setFormCat({ ...formCat, orden: Number(e.target.value || 0) })}
                      />
                    </IonItem>
                  </IonCol>
                  <IonCol size="6">
                    <IonItem>
                      <IonSelect
                        label="Estado"
                        labelPlacement="stacked"
                        value={formCat.estado}
                        onIonChange={(e: any) => setFormCat({ ...formCat, estado: e.target.value as any })}
                      >
                        <IonSelectOption value="ACTIVO">ACTIVO</IonSelectOption>
                        <IonSelectOption value="INACTIVO">INACTIVO</IonSelectOption>
                      </IonSelect>
                    </IonItem>
                  </IonCol>
                </IonRow>
              </IonGrid>
              <IonItem lines="none">
                <IonTextarea
                  label="Descripción"
                  labelPlacement="stacked"
                  rows={2}
                  placeholder="(opcional)"
                  value={formCat.descripcion}
                  onIonInput={(e: any) => setFormCat({ ...formCat, descripcion: String(e.target.value || '') })}
                />
              </IonItem>
            </IonList>
          </IonContent>
        </IonModal>

        {/* ============ MODAL: Nueva / Editar PRODUCTO · COMPACTO 1 PANTALLA (sin segment, fusionado) ============ */}
        <IonModal
          isOpen={modalProdAbierto}
          onDidDismiss={() => setModalProdAbierto(false)}
          style={{ '--height': 'calc(100vh - 24px)', '--width': 'min(720px, 97vw)', '--border-radius': '12px', '--box-shadow': '0 10px 40px rgba(0,0,0,.18)' }}
        >
          <IonHeader className="ion-no-border">
            <IonToolbar color={editandoProdId ? 'primary' : 'success'} style={{ '--min-height': '44px' }}>
              <IonButtons slot="start">
                <IonButton onClick={() => setModalProdAbierto(false)}>
                  <IonIcon slot="icon-only" icon={close} />
                </IonButton>
              </IonButtons>
              <IonTitle style={{ fontSize: 15 }}>
                <IonIcon icon={cube} />&nbsp;{editandoProdId ? 'Editar producto' : 'Nuevo producto'}
              </IonTitle>
              <IonButtons slot="end">
                <IonButton color="light" size="small" onClick={() => setModalProdAbierto(false)}>Cancelar</IonButton>
                <IonButton strong size="small" onClick={guardarProd}>
                  <IonIcon slot="start" icon={save} /> Guardar
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent style={{ '--background': '#f7f9fc', padding: 10, overflowY: 'auto' }} scrollEvents>
            {/* ===== SECCIÓN 1 · IDENTIFICACIÓN ===== */}
            <div className="modal-section" style={{ marginBottom: 8, padding: 10, background: '#fff', borderRadius: 10 }}>
              <div className="modal-section-title" style={{ fontSize: 11, marginBottom: 8, marginTop: 0 }}>
                <IonIcon icon={barcode} style={{ fontSize: 13 }} />&nbsp;IDENTIFICACIÓN
              </div>
              <IonGrid style={{ padding: 0 }}>
                <IonRow>
                  <IonCol size="12" sizeMd="4">
                    <IonItem className="form-item" lines="none" style={{ '--min-height': '40px', '--padding-start': 4, '--padding-end': 4 }}>
                      <IonInput
                        label="Código"
                        labelPlacement="stacked"
                        placeholder="Ej: CER-001"
                        value={formProd.codigo}
                        onIonInput={(e: any) => setFormProd({ ...formProd, codigo: String(e.target.value || '') })}
                      />
                    </IonItem>
                  </IonCol>
                  <IonCol size="12" sizeMd="8">
                    <IonItem className="form-item" lines="none" style={{ '--min-height': '40px', '--padding-start': 4, '--padding-end': 4 }}>
                      <IonInput
                        label="Nombre del producto *"
                        labelPlacement="stacked"
                        placeholder="Ej: Cusqueña Trigo 620ml"
                        value={formProd.nombre}
                        onIonInput={(e: any) => setFormProd({ ...formProd, nombre: String(e.target.value || '') })}
                      />
                    </IonItem>
                  </IonCol>
                </IonRow>
              </IonGrid>
              <IonItem className="form-item" lines="none" style={{ '--min-height': '52px', '--padding-start': 4, '--padding-end': 4 }}>
                <IonTextarea
                  label="Descripción"
                  labelPlacement="stacked"
                  rows={1.5}
                  placeholder="Descripción visible para carta o POS"
                  value={formProd.descripcion}
                  onIonInput={(e: any) => setFormProd({ ...formProd, descripcion: String(e.target.value || '') })}
                />
              </IonItem>
            </div>

            {/* ===== SECCIÓN 2 · CATEGORÍA Y ESTADO + NUEVA CAT ON THE FLY ===== */}
            <div className="modal-section" style={{ marginBottom: 8, padding: 10, background: '#fff', borderRadius: 10 }}>
              <div className="modal-section-title" style={{ fontSize: 11, marginBottom: 8, marginTop: 0 }}>
                <IonIcon icon={layers} style={{ fontSize: 13 }} />&nbsp;CATEGORÍA Y ESTADO
              </div>
              <IonGrid style={{ padding: 0 }}>
                <IonRow>
                  <IonCol size="12" sizeMd="8">
                    <IonItem className="form-item" lines="none" style={{ '--min-height': '40px', '--padding-start': 4, '--padding-end': 4 }}>
                      <IonSelect
                        label="Categoría *"
                        labelPlacement="stacked"
                        value={formProd.categoriaId}
                        placeholder="Selecciona categoría"
                        onIonChange={(e: any) => {
                          const nuevaCatId = e.target.value;
                          const catPrevia = categoriasFB.find(c => c.id === formProd.categoriaId);
                          const prefijoPrevio = catPrevia ? String((catPrevia.payload?.codigo) || catPrevia.codigo || '').replace(/^CAT-/, '').slice(0, 6).toUpperCase() : '';
                          const codigoActual = String(formProd.codigo || '').toUpperCase();
                          const debeRegenerar = !formProd.codigo.trim() || (prefijoPrevio && codigoActual.startsWith(`${prefijoPrevio}-`));
                          const nuevoCodigo = (debeRegenerar && nuevaCatId) ? generarCodigoProdAuto(nuevaCatId) : formProd.codigo;
                          setFormProd({ ...formProd, categoriaId: nuevaCatId, codigo: nuevoCodigo });
                        }}
                        interface="action-sheet"
                      >
                        {([...categoriasFB].sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0))).map((c) => (
                          <IonSelectOption key={c.id} value={c.id}>{c.nombre}</IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                  </IonCol>
                  <IonCol size="12" sizeMd="4" className="ion-align-self-end">
                    <IonGrid style={{ padding: 0 }}>
                      <IonRow>
                        <IonCol size="4" style={{ padding: 2 }}>
                          <IonButton
                            expand="block"
                            size="small"
                            color="tertiary"
                            style={{ fontSize: 11, fontWeight: 800, margin: 0 }}
                            onClick={() => {
                              try {
                                const maxOrden = categoriasFB.reduce((m, c) => Math.max(m, Number(c.orden || 0)), 0);
                                presentarCatAlert({
                                  header: '➕ Nueva categoría',
                                  subHeader: 'Se agregará sobre la marcha al selector',
                                  cssClass: 'alert-compact',
                                  inputs: [
                                    { name: 'nombre', type: 'text', placeholder: 'Nombre categoría * (ej: Ensaladas)', value: '' },
                                    { name: 'orden', type: 'number', placeholder: `Orden (default ${maxOrden + 10})`, value: String(maxOrden + 10) },
                                  ],
                                  buttons: [
                                    { text: 'Cancelar', role: 'cancel', cssClass: 'secondary' },
                                    {
                                      text: '✅ Sin stock',
                                      handler: (d: any) => {
                                        const nombre = String(d?.nombre || '').trim();
                                        if (!nombre) { mostrarToast('Nombre categoría es obligatorio'); return false; }
                                        const orden = Number(d?.orden || (maxOrden + 10));
                                        try {
                                          const catCreada = CatalogoFBService.crearCategoria({
                                            nombre, descripcion: nombre, orden, estado: 'ACTIVO',
                                            codigo: 'CAT-' + nombre.substring(0, 6).toUpperCase(),
                                            color: '#374151', payload: { defaultStockControl: false, sistema: false },
                                          }, usuario.id);
                                          try { setCategoriasFB(CatalogoFBService.listarCategorias() || []); cargarCatProd(); } catch {}
                                          if (catCreada?.id) {
                                            const catPrevia2 = categoriasFB.find(c => c.id === formProd.categoriaId);
                                            const prefijoPrevio = catPrevia2 ? String((catPrevia2.payload?.codigo) || catPrevia2.codigo || '').replace(/^CAT-/, '').slice(0, 6).toUpperCase() : '';
                                            const codigoActual2 = String(formProd.codigo || '').toUpperCase();
                                            const debeRegenerar2 = !formProd.codigo.trim() || (prefijoPrevio && codigoActual2.startsWith(`${prefijoPrevio}-`));
                                            setFormProd({
                                              ...formProd,
                                              categoriaId: catCreada.id,
                                              codigo: (debeRegenerar2 ? generarCodigoProdAuto(catCreada.id) : formProd.codigo)
                                            });
                                          }
                                          mostrarToast(`✅ Categoría "${nombre}" creada y seleccionada`);
                                          return true;
                                        } catch (e2: any) { mostrarToast(e2?.message || 'Error al crear categoría'); return false; }
                                      }
                                    },
                                    {
                                      text: '📦 Con stock',
                                      handler: (d: any) => {
                                        const nombre = String(d?.nombre || '').trim();
                                        if (!nombre) { mostrarToast('Nombre categoría es obligatorio'); return false; }
                                        const orden = Number(d?.orden || (maxOrden + 10));
                                        try {
                                          const catCreada = CatalogoFBService.crearCategoria({
                                            nombre, descripcion: nombre, orden, estado: 'ACTIVO',
                                            codigo: 'CAT-' + nombre.substring(0, 6).toUpperCase(),
                                            color: '#065f46', payload: { defaultStockControl: true, sistema: false },
                                          }, usuario.id);
                                          try { setCategoriasFB(CatalogoFBService.listarCategorias() || []); cargarCatProd(); } catch {}
                                          if (catCreada?.id) {
                                            const catPrevia2 = categoriasFB.find(c => c.id === formProd.categoriaId);
                                            const prefijoPrevio = catPrevia2 ? String((catPrevia2.payload?.codigo) || catPrevia2.codigo || '').replace(/^CAT-/, '').slice(0, 6).toUpperCase() : '';
                                            const codigoActual2 = String(formProd.codigo || '').toUpperCase();
                                            const debeRegenerar2 = !formProd.codigo.trim() || (prefijoPrevio && codigoActual2.startsWith(`${prefijoPrevio}-`));
                                            setFormProd({
                                              ...formProd,
                                              categoriaId: catCreada.id,
                                              codigo: (debeRegenerar2 ? generarCodigoProdAuto(catCreada.id) : formProd.codigo),
                                              stockControl: true, stockActual: 0, stockMinimo: Math.max(3, Number(formProd.stockMinimo || 0) || 3),
                                            });
                                          }
                                          mostrarToast(`✅ Categoría "${nombre}" creada y seleccionada (con stock)`);
                                          return true;
                                        } catch (e2: any) { mostrarToast(e2?.message || 'Error al crear categoría'); return false; }
                                      }
                                    }
                                  ]
                                });
                              } catch (er1) { console.error(er1); }
                            }}
                          >
                            <IonIcon slot="icon-only" icon={add} />
                          </IonButton>
                        </IonCol>
                        <IonCol size="4" style={{ padding: 2 }}>
                          <IonButton
                            expand="block"
                            size="small"
                            color="primary"
                            disabled={!formProd.categoriaId}
                            style={{ fontSize: 11, fontWeight: 800, margin: 0 }}
                            onClick={() => {
                              try {
                                const cat = categoriasFB.find(c => c.id === formProd.categoriaId);
                                if (!cat) { mostrarToast('Selecciona categoría primero'); return; }
                                presentarCrudCatAlert({
                                  header: `✏️ Editar: ${cat.nombre}`,
                                  inputs: [
                                    { name: 'nombre', type: 'text', placeholder: 'Nombre categoría *', value: cat.nombre },
                                    { name: 'orden', type: 'number', placeholder: 'Orden', value: String(Number(cat.orden || 0)) },
                                    { name: 'descripcion', type: 'text', placeholder: 'Descripción', value: cat.descripcion || '' },
                                  ],
                                  buttons: [
                                    { text: 'Cancelar', role: 'cancel' },
                                    {
                                      text: '💾 Guardar',
                                      handler: (d: any) => {
                                        const nombre = String(d?.nombre || '').trim();
                                        if (!nombre) { mostrarToast('Nombre es obligatorio'); return false; }
                                        try {
                                          CatalogoFBService.actualizarCategoria(cat.id, {
                                            ...cat,
                                            nombre,
                                            orden: Number(d?.orden || cat.orden || 0),
                                            descripcion: String(d?.descripcion || '').trim(),
                                          }, usuario.id);
                                          try { setCategoriasFB(CatalogoFBService.listarCategorias() || []); cargarCatProd(); } catch {}
                                          mostrarToast(`✅ Categoría actualizada`);
                                          return true;
                                        } catch (e2: any) { mostrarToast(e2?.message || 'Error al actualizar'); return false; }
                                      }
                                    }
                                  ]
                                });
                              } catch (err) { console.error(err); }
                            }}
                          >
                            <IonIcon slot="icon-only" icon={create} />
                          </IonButton>
                        </IonCol>
                        <IonCol size="4" style={{ padding: 2 }}>
                          <IonButton
                            expand="block"
                            size="small"
                            color="danger"
                            disabled={!formProd.categoriaId}
                            style={{ fontSize: 11, fontWeight: 800, margin: 0 }}
                            onClick={() => {
                              try {
                                const cat = categoriasFB.find(c => c.id === formProd.categoriaId);
                                if (!cat) { mostrarToast('Selecciona categoría primero'); return; }
                                const prodsUso = productosFB.filter((p) => p.categoriaId === cat.id).length;
                                if (prodsUso > 0) {
                                  mostrarToast(`⛔ ${prodsUso} productos usan "${cat.nombre}". Ve a Productos para migrarlos.`);
                                  setFiltroCatId(cat.id); setTabStock('PRODUCTOS');
                                  return;
                                }
                                presentarConfirmBorrarCatAlert({
                                  header: `🗑️ Eliminar "${cat.nombre}"`,
                                  subHeader: `Categoría con ${prodsUso} productos (SIN USO).`,
                                  message: `Se eliminará permanentemente la categoría. No se puede deshacer.`,
                                  buttons: [
                                    { text: 'Cancelar', role: 'cancel' },
                                    {
                                      text: 'SÍ, ELIMINAR',
                                      role: 'destructive',
                                      handler: () => {
                                        try {
                                          CatalogoFBService.eliminarCategoria(cat.id);
                                          try { setCategoriasFB(CatalogoFBService.listarCategorias() || []); cargarCatProd(); } catch {}
                                          setFormProd((prev: any) => ({ ...prev, categoriaId: '', codigo: '' }));
                                          mostrarToast(`✅ Categoría "${cat.nombre}" eliminada`);
                                          return true;
                                        } catch (e2: any) { mostrarToast(e2?.message || 'Error al eliminar'); return false; }
                                      }
                                    }
                                  ]
                                });
                              } catch (err) { console.error(err); }
                            }}
                          >
                            <IonIcon slot="icon-only" icon={trash} />
                          </IonButton>
                        </IonCol>
                      </IonRow>
                      <IonRow>
                        <IonCol size="12" sizeMd="12">
                          <IonItem className="form-item" lines="none" style={{ '--min-height': '40px', '--padding-start': 4, '--padding-end': 4 }}>
                            <IonSelect
                              label="Estado"
                              labelPlacement="stacked"
                              value={formProd.estado}
                              onIonChange={(e: any) => setFormProd({ ...formProd, estado: e.target.value as any })}
                            >
                              <IonSelectOption value="ACTIVO">✅ ACTIVO (visible en POS y carta)</IonSelectOption>
                              <IonSelectOption value="INACTIVO">⛔ INACTIVO (oculto)</IonSelectOption>
                            </IonSelect>
                          </IonItem>
                        </IonCol>
                      </IonRow>
                    </IonGrid>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>

            {/* ===== SECCIÓN 3 · PRECIOS Y COSTO + INVENTARIO FUSIONADOS ===== */}
            <div className="modal-section" style={{ marginBottom: 8, padding: 10, background: '#fff', borderRadius: 10 }}>
              <div className="modal-section-title" style={{ fontSize: 11, marginBottom: 8, marginTop: 0 }}>
                <IonIcon icon={cash} style={{ fontSize: 13 }} />&nbsp;PRECIOS · COSTO · INVENTARIO
              </div>
              <IonGrid style={{ padding: 0 }}>
                <IonRow>
                  <IonCol size="12" sizeMd="4">
                    <IonItem className="form-item" lines="none" style={{ '--min-height': '40px', '--padding-start': 4, '--padding-end': 4 }}>
                      <IonInput
                        label="Precio venta (S/) *"
                        labelPlacement="stacked"
                        type="number" step="0.01" inputMode="decimal"
                        placeholder="Ej: 18.00"
                        value={formProd.precioVentaBase}
                        onIonInput={(e: any) => setFormProd({ ...formProd, precioVentaBase: Number(e.target.value || 0) })}
                      />
                    </IonItem>
                  </IonCol>
                  <IonCol size="12" sizeMd="4">
                    <IonItem className="form-item" lines="none" style={{ '--min-height': '40px', '--padding-start': 4, '--padding-end': 4 }}>
                      <IonInput
                        label="Precio costo (S/)"
                        labelPlacement="stacked"
                        type="number" step="0.01" inputMode="decimal"
                        placeholder="Ej: 9.50"
                        value={formProd.costoAproximado}
                        onIonInput={(e: any) => setFormProd({ ...formProd, costoAproximado: Number(e.target.value || 0) })}
                      />
                    </IonItem>
                  </IonCol>
                  <IonCol size="12" sizeMd="4">
                    <IonItem className="form-item" lines="none" style={{ '--min-height': '40px', '--padding-start': 4, '--padding-end': 4 }}>
                      <IonSelect
                        label="Unidad de medida"
                        labelPlacement="stacked"
                        value={formProd.unidadMedida}
                        placeholder="Selecciona unidad"
                        interface="action-sheet"
                        onIonChange={(e: any) => setFormProd({ ...formProd, unidadMedida: e.target.value })}
                      >
                        <IonSelectOption value="UND">UND (Unidad)</IonSelectOption>
                        <IonSelectOption value="L">L (Litros)</IonSelectOption>
                        <IonSelectOption value="ML">ML (Mililitros)</IonSelectOption>
                        <IonSelectOption value="KG">KG (Kilogramos)</IonSelectOption>
                        <IonSelectOption value="G">G (Gramos)</IonSelectOption>
                        <IonSelectOption value="DOC">DOC (Docena)</IonSelectOption>
                        <IonSelectOption value="CAJ">CAJ (Caja)</IonSelectOption>
                        <IonSelectOption value="PAQ">PAQ (Paquete)</IonSelectOption>
                      </IonSelect>
                    </IonItem>
                  </IonCol>
                </IonRow>
                {Number(formProd.precioVentaBase || 0) > 0 && (
                  <div className="modal-summary" style={{ marginTop: 4, padding: 8, borderRadius: 8 }}>
                    <div className="summary-row" style={{ marginBottom: 2 }}>
                      <span style={{ fontSize: 12 }}>Margen unitario estimado:</span>
                      <strong className="summary-value" style={{ fontSize: 13 }}>
                        {fmtSoles(Number(formProd.precioVentaBase || 0) - Number(formProd.costoAproximado || 0))}
                      </strong>
                    </div>
                    <div className="summary-row">
                      <span style={{ fontSize: 12 }}>% rentabilidad:</span>
                      <strong className="summary-value" style={{ fontSize: 13,
                        color: Number(formProd.precioVentaBase || 0) > 0
                          ? (((Number(formProd.precioVentaBase || 0) - Number(formProd.costoAproximado || 0)) / Number(formProd.precioVentaBase || 1)) * 100) >= 40
                            ? '#2dd36f'
                            : (((Number(formProd.precioVentaBase || 0) - Number(formProd.costoAproximado || 0)) / Number(formProd.precioVentaBase || 1)) * 100) >= 20
                              ? '#ffc409'
                              : '#eb445a'
                          : '#999'
                      }}>
                        {Number(formProd.precioVentaBase || 0) > 0
                          ? Math.round(((Number(formProd.precioVentaBase || 0) - Number(formProd.costoAproximado || 0)) / Number(formProd.precioVentaBase || 1)) * 100)
                          : 0}%
                      </strong>
                    </div>
                  </div>
                )}

                {/* CONTROL STOCK FUSIONADO (antes tab INVENTARIO) · 2 fila compacta */}
                <div style={{ marginTop: 8 }}>
                  <div className="stock-control-question" style={{ fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                    <IonIcon icon={cube} />&nbsp;Control de inventario y stock:
                  </div>
                  <IonSegment
                    value={formProd.stockControl ? 'SI' : 'NO'}
                    onIonChange={(e: any) => setFormProd({ ...formProd, stockControl: e.target.value === 'SI' })}
                    className="stock-segment-big"
                    style={{ width: '100%' }}
                  >
                    <IonSegmentButton value="NO" type="button" color="medium" style={{ fontSize: 12 }}>
                      <IonLabel>🍽️ Preparación sin stock</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="SI" type="button" color="success" style={{ fontSize: 12 }}>
                      <IonLabel>📦 Físico con stock</IonLabel>
                    </IonSegmentButton>
                  </IonSegment>
                </div>
              </IonGrid>

              {formProd.stockControl && (
                <IonGrid style={{ padding: 0, marginTop: 6 }}>
                  <IonRow>
                    <IonCol size="12" sizeMd="6">
                      <div className="stock-input-card stock-input-success" style={{ padding: 6, borderRadius: 8 }}>
                        <div className="stock-input-label" style={{ fontSize: 11, marginBottom: 2 }}>Stock actual</div>
                        <IonItem lines="none" className="stock-input-item" style={{ '--min-height': '36px', '--padding-start': 4, '--padding-end': 4 }}>
                          <IonInput
                            type="number" step="1" min="0" inputMode="numeric"
                            placeholder="Ej: 0"
                            value={formProd.stockActual}
                            onIonInput={(e: any) => setFormProd({ ...formProd, stockActual: Number(e.target.value || 0) })}
                          />
                        </IonItem>
                      </div>
                    </IonCol>
                    <IonCol size="12" sizeMd="6">
                      <div className="stock-input-card stock-input-warning" style={{ padding: 6, borderRadius: 8 }}>
                        <div className="stock-input-label" style={{ fontSize: 11, marginBottom: 2 }}>Stock mínimo (alerta)</div>
                        <IonItem lines="none" className="stock-input-item" style={{ '--min-height': '36px', '--padding-start': 4, '--padding-end': 4 }}>
                          <IonInput
                            type="number" step="1" min="0" inputMode="numeric"
                            placeholder="Ej: 6"
                            value={formProd.stockMinimo}
                            onIonInput={(e: any) => setFormProd({ ...formProd, stockMinimo: Number(e.target.value || 0) })}
                          />
                        </IonItem>
                      </div>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              )}
            </div>

            {/* ===== SECCIÓN 4 · NOTAS (muy compacta) ===== */}
            <div className="modal-section" style={{ marginBottom: 12, padding: 10, background: '#fff', borderRadius: 10 }}>
              <div className="modal-section-title" style={{ fontSize: 11, marginBottom: 4, marginTop: 0 }}>
                <IonIcon icon={documentText} style={{ fontSize: 13 }} />&nbsp;NOTAS INTERNAS
              </div>
              <IonItem lines="none" className="form-item" style={{ '--min-height': '46px', '--padding-start': 4, '--padding-end': 4 }}>
                <IonTextarea
                  label="Observaciones"
                  labelPlacement="stacked"
                  rows={1.5}
                  placeholder="Proveedor, códigos internos... (opcional)"
                  value={formProd.observaciones}
                  onIonInput={(e: any) => setFormProd({ ...formProd, observaciones: String(e.target.value || '') })}
                />
              </IonItem>
            </div>

            {/* Footer botones */}
            <div style={{ paddingBottom: 4 }}>
              <IonGrid style={{ padding: 0 }}>
                <IonRow>
                  <IonCol size="6">
                    <IonButton color="medium" fill="outline" expand="block" onClick={() => setModalProdAbierto(false)}>
                      <IonIcon slot="start" icon={close} /> Cancelar
                    </IonButton>
                  </IonCol>
                  <IonCol size="6">
                    <IonButton color={editandoProdId ? 'primary' : 'success'} expand="block" onClick={guardarProd}>
                      <IonIcon slot="start" icon={save} />
                      {editandoProdId ? 'Guardar cambios' : 'Crear producto'}
                    </IonButton>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>
          </IonContent>
        </IonModal>

        {/* ============ MODAL: Agregar / Quitar Stock PROFESIONAL ============ */}
        <IonModal isOpen={modalStockAbierto} onDidDismiss={() => setModalStockAbierto(false)} initialBreakpoint={0.72} breakpoints={[0, 0.5, 0.72, 1]}>
          <IonHeader className="ion-no-border">
            <IonToolbar color={formStock.modo === 'AGREGAR' ? 'success' : 'warning'}>
              <IonButtons slot="start">
                <IonButton onClick={() => setModalStockAbierto(false)}>
                  <IonIcon slot="icon-only" icon={close} />
                </IonButton>
              </IonButtons>
              <IonTitle>
                <IonIcon icon={formStock.modo === 'AGREGAR' ? addCircle : removeCircle} />
                &nbsp;{formStock.modo === 'AGREGAR' ? 'Ingreso de stock' : 'Egreso de stock'}
              </IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding modal-padding">
            {formStock.productoNombre && (
              <IonCard className={`stock-target-card stock-target-${formStock.modo === 'AGREGAR' ? 'success' : 'warning'}`}>
                <IonCardContent>
                  <div className="stock-target-lbl">Producto seleccionado</div>
                  <div className="stock-target-nombre">{formStock.productoNombre}</div>
                  {(() => {
                    const pActual = productosFB.find((x: any) => x.id === formStock.productoId);
                    if (!pActual) return null;
                    const plano = stockPlanoProd(pActual);
                    return (
                      <div className="stock-target-preview">
                        <IonBadge color={!plano.stockControl ? 'medium' : plano.stockActual < 0 ? 'danger' : plano.stockActual <= (plano.stockMinimo || 0) ? 'warning' : 'success'}>
                          Actual: {plano.stockControl ? `${fmtNum(plano.stockActual)} uds` : 'Sin control'}
                        </IonBadge>
                      </div>
                    );
                  })()}
                </IonCardContent>
              </IonCard>
            )}

            <div className="modal-section">
              <div className="modal-section-title"><IonIcon icon={cube} /> Cantidad</div>
              <div className={`stock-big-input stock-big-input-${formStock.modo === 'AGREGAR' ? 'success' : 'warning'}`}>
                <IonButton
                  fill="outline"
                  color={formStock.modo === 'AGREGAR' ? 'success' : 'warning'}
                  className="stock-quant-btn"
                  onClick={() => setFormStock({ ...formStock, delta: Math.max(1, Number(formStock.delta || 0) - 1) })}
                >
                  −
                </IonButton>
                <IonItem className="stock-input-big-form" lines="none">
                  <IonInput
                    type="number"
                    step="1"
                    min="1"
                    inputMode="numeric"
                    value={formStock.delta > 0 ? formStock.delta : ''}
                    placeholder="1"
                    onIonInput={(e: any) => setFormStock({ ...formStock, delta: Math.max(0, Number(e.target.value || 0)) })}
                  />
                </IonItem>
                <IonButton
                  fill="solid"
                  color={formStock.modo === 'AGREGAR' ? 'success' : 'warning'}
                  className="stock-quant-btn stock-quant-btn-plus"
                  onClick={() => setFormStock({ ...formStock, delta: Math.max(1, Number(formStock.delta || 0) + 1) })}
                >
                  +
                </IonButton>
              </div>
              <div className="stock-btns-fast">
                {[1, 6, 12, 24, 50].map(n => (
                  <IonChip
                    key={n}
                    outline
                    color={formStock.modo === 'AGREGAR' ? 'success' : 'warning'}
                    className="stock-chip-fast"
                    onClick={() => setFormStock({ ...formStock, delta: n })}
                  >
                    + {n}
                  </IonChip>
                ))}
              </div>
            </div>

            <div className="modal-section">
              <div className="modal-section-title"><IonIcon icon={documentText} /> Motivo</div>
              <IonItem lines="none" className="form-item">
                <IonTextarea
                  label="Motivo / Observación"
                  labelPlacement="stacked"
                  rows={3}
                  placeholder={formStock.modo === 'AGREGAR'
                    ? 'Ej: Compra a proveedor XYZ · Factura N° 123'
                    : 'Ej: Merma · producto vencido / Cajón 3 dañado / Regalo cliente VIP'}
                  value={formStock.motivo}
                  onIonInput={(e: any) => setFormStock({ ...formStock, motivo: String(e.target.value || '') })}
                />
              </IonItem>
            </div>

            <div className="modal-actions-footer">
              <IonButton size="default" color="medium" fill="outline" expand="block" onClick={() => setModalStockAbierto(false)}>
                Cancelar
              </IonButton>
              <IonButton
                size="default"
                color={formStock.modo === 'AGREGAR' ? 'success' : 'warning'}
                expand="block"
                onClick={guardarMovStock}
                disabled={formStock.delta <= 0}
              >
                <IonIcon slot="start" icon={formStock.modo === 'AGREGAR' ? addCircle : archive} />
                {formStock.modo === 'AGREGAR' ? 'Registrar ingreso' : 'Quitar del inventario'}
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        {/* ============ MODAL: +Stock Global · Selector producto ============ */}
        <IonModal isOpen={modalStockGlobalAbierto} onDidDismiss={() => setModalStockGlobalAbierto(false)} initialBreakpoint={0.85} breakpoints={[0, 0.6, 0.85, 1]}>
          <IonHeader className="ion-no-border">
            <IonToolbar color="primary">
              <IonButtons slot="start">
                <IonButton onClick={() => setModalStockGlobalAbierto(false)}>
                  <IonIcon slot="icon-only" icon={close} />
                </IonButton>
              </IonButtons>
              <IonTitle>
                <IonIcon icon={archive} />
                &nbsp;Seleccionar producto para agregar stock
              </IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding modal-padding">
            <IonSearchbar
              placeholder="Buscar producto por nombre, código..."
              value={busqStockGlobal}
              onIonInput={(e: any) => setBusqStockGlobal(String(e.target.value || ''))}
              showCancelButton="never"
              debounce={200}
              mode="ios"
              searchIcon={search}
            />
            {(() => {
              const q = busqStockGlobal.trim().toLowerCase();
              const filtrados = q
                ? productosFB.filter((p: any) =>
                    String(p.nombre || '').toLowerCase().includes(q) ||
                    String(p.codigo || '').toLowerCase().includes(q) ||
                    String(p.descripcion || '').toLowerCase().includes(q)
                  )
                : productosFB;
              if (productosFB.length === 0) {
                return (
                  <div className="empty-state">
                    <IonIcon icon={fileTray} className="empty-state-icon" />
                    <div className="empty-state-title">No hay productos creados</div>
                    <div className="empty-state-text">
                      {categoriasFB.length === 0
                        ? 'El catálogo se encuentra vacío. Carga el menú oficial Casa Sumaq Allpa (120 productos) o crea productos manualmente.'
                        : 'Crea primero productos desde el botón "+ Producto" en la sección de Gestión.'}
                    </div>
                    {categoriasFB.length === 0 && (
                      <div style={{display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', marginTop:8}}>
                        <IonButton color="tertiary" className="mt-xl" onClick={() => { setModalStockGlobalAbierto(false); cargarSeedInicial(false); window.setTimeout(()=>setModalStockGlobalAbierto(true), 600); }}>
                          <IonIcon slot="start" icon={restaurant} />
                          🤖 Cargar menú oficial · 120 productos
                        </IonButton>
                      </div>
                    )}
                  </div>
                );
              }
              if (filtrados.length === 0) {
                return (
                  <div className="empty-state">
                    <IonIcon icon={search} className="empty-state-icon" />
                    <div className="empty-state-title">Sin coincidencias</div>
                    <div className="empty-state-text">Cambia el texto de búsqueda.</div>
                  </div>
                );
              }
              return (
                <IonList className="global-stock-list">
                  {filtrados.slice(0, 150).map((p: any) => {
                    const cat = categoriasFB.find((c: any) => c.id === p.categoriaId);
                    const plano = stockPlanoProd(p);
                    return (
                      <IonItem
                        key={p.id}
                        button
                        detail
                        className="global-stock-item"
                        onClick={() => {
                          setModalStockGlobalAbierto(false);
                          abrirStockAgregar(p);
                        }}
                      >
                        <IonBadge color="light" slot="start" className="gs-cod-badge">{p.codigo || '—'}</IonBadge>
                        <IonLabel>
                          <div className="gs-nombre">{p.nombre}</div>
                          <div className="gs-meta">
                            <IonChip color="light" outline className="gs-chip-mini">{cat?.nombre || 'Sin cat.'}</IonChip>
                            <IonChip color="medium" outline className="gs-chip-mini">UM: {p.unidadMedida || 'UND'}</IonChip>
                            <IonBadge color={!plano.stockControl ? 'medium' : plano.stockActual < 0 ? 'danger' : plano.stockActual <= (plano.stockMinimo || 0) ? 'warning' : 'success'}>
                              Stock: {plano.stockControl ? `${fmtNum(plano.stockActual)} uds` : 'N/A'}
                            </IonBadge>
                          </div>
                        </IonLabel>
                      </IonItem>
                    );
                  })}
                </IonList>
              );
            })()}
          </IonContent>
        </IonModal>

        {/* Confirmación BORRAR habitación */}
        <IonAlert
          isOpen={!!confirmBorrar}
          header={`¿Eliminar habitación ${confirmBorrar?.codigo || ''}?`}
          subHeader="Esta acción no se puede deshacer."
          backdropDismiss={false}
          buttons={[
            { text: 'Cancelar', role: 'cancel', handler: () => setConfirmBorrar(null) },
            { text: 'Sí, eliminar', role: 'destructive', handler: borrarHab },
          ]}
        />

        {/* Confirmación BORRAR categoría */}
        <IonAlert
          isOpen={!!confirmBorrarCat}
          header={`¿Eliminar categoría?`}
          subHeader={confirmBorrarCat?.nombre || ''}
          message="Esta acción no se puede deshacer."
          backdropDismiss={false}
          buttons={[
            { text: 'Cancelar', role: 'cancel', handler: () => setConfirmBorrarCat(null) },
            { text: 'Sí, eliminar', role: 'destructive', handler: borrarCat },
          ]}
        />

        {/* Confirmación BORRAR producto */}
        <IonAlert
          isOpen={!!confirmBorrarProd}
          header={`¿Eliminar producto?`}
          subHeader={confirmBorrarProd?.nombre || ''}
          message="Esta acción no se puede deshacer."
          backdropDismiss={false}
          buttons={[
            { text: 'Cancelar', role: 'cancel', handler: () => setConfirmBorrarProd(null) },
            { text: 'Sí, eliminar', role: 'destructive', handler: borrarProd },
          ]}
        />

        {/* Confirmación 2 PASO quitar stock */}
        <IonAlert
          isOpen={!!confirmQuitarStock}
          header="Confirmar quitar stock"
          subHeader="No se puede deshacer."
          message={confirmQuitarStock?.resumen || ''}
          backdropDismiss={false}
          buttons={[
            { text: 'Cancelar', role: 'cancel', handler: () => setConfirmQuitarStock(null) },
            { text: 'Sí, continuar', role: 'destructive', handler: () => confirmQuitarStock?.ejecutar?.() },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default PerfilPage;
