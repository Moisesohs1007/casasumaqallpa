import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  IonSpinner,
  IonItemDivider,
  IonCheckbox,
} from '@ionic/react';
import {
  add, create, trash, save, close, bedOutline, buildOutline, pricetag,
  cube, addCircle, removeCircle, archive, restaurant,
  search, layers, fileTray, warning, checkmarkCircle,
  informationCircle, documentText, barcode, cash, people, refresh, logOutOutline, lockClosed,
  playOutline, pauseOutline, print,
} from 'ionicons/icons';
import { Usuario, Rol, RolUsuario, ModuloPermiso, Moneda, AuditFields, Habitacion, TipoHabitacion, EstadoHabitacion } from '../../types';
import { HabitacionService, CatalogoFBService, InventarioService, seedProductos, type MoverStockResult, TarifaService, PosService, pendingSync, AuthService, ReportesService, rangoHoy, rangoAyer, rangoSemana, rangoMes, rangoMesAnterior, ImpresoraConfigService, type ImpresoraConfig, type TamanoPapel, type MetodoImpresion } from '../../services';
import type { RangoFechas, ResumenReportes } from '../../services/ReportesService';
import { supabase } from '../../services/__supabase_db__';
import { aplicarEstilosTicket } from '../../utils/ticketStyles';
import './Perfil.css';

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
  const [habDetalle, setHabDetalle] = useState<Habitacion | null>(null);

  const [tabPrincipal, setTabPrincipal] = useState<'HABITACIONES' | 'PRODUCTOS' | 'REPORTES' | 'USUARIOS' | 'CUENTA'>('HABITACIONES');
  const [prodDetalle, setProdDetalle] = useState<any | null>(null);
  const [impresoraConfig, setImpresoraConfig] = useState<ImpresoraConfig>(ImpresoraConfigService.obtener());

  const sesion = AuthService.sesionActual();
  const puedeGestionarHab = AuthService.tienePermiso(sesion, 'HABITACIONES', 'ADMIN');
  const puedeCambiarEstadoHab = AuthService.tienePermiso(sesion, 'HABITACIONES', 'ESCRITURA');
  const puedeGestionarProd = AuthService.tienePermiso(sesion, 'INVENTARIO', 'ADMIN') || AuthService.tienePermiso(sesion, 'PRODUCTOS', 'ADMIN') || AuthService.tienePermiso(sesion, 'POS_FB', 'ADMIN');
  const puedeGestionarStock = AuthService.tienePermiso(sesion, 'INVENTARIO', 'ESCRITURA') || AuthService.tienePermiso(sesion, 'INVENTARIO', 'ADMIN') || AuthService.tienePermiso(sesion, 'POS_FB', 'ADMIN');
  const puedeGestionarUsuarios = AuthService.tienePermiso(sesion, 'USUARIOS_ROLES', 'ADMIN') || AuthService.tienePermiso(sesion, 'USUARIOS_ROLES', 'ESCRITURA');

  // ==================== STOCK / PRODUCTOS STATES ====================
  const [categoriasFB, setCategoriasFB] = useState<any[]>([]);
  const [productosFB, setProductosFB] = useState<any[]>([]);
  const [busqProd, setBusqProd] = useState('');
  const [filtroCatId, setFiltroCatId] = useState<string>('');
  const [catSeleccionadaId, setCatSeleccionadaId] = useState<string>('');
  const [prodSeleccionadoId, setProdSeleccionadoId] = useState<string>('');
  const [habSeleccionadaId, setHabSeleccionadaId] = useState<string>('');
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

  const [pwdActual, setPwdActual] = useState('');
  const [pwdNueva, setPwdNueva] = useState('');
  const [pwdConfirmar, setPwdConfirmar] = useState('');
  const [pwdProcesando, setPwdProcesando] = useState(false);
  const [pwdMensaje, setPwdMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // ==================== USUARIOS STATES ====================
  const [usuariosLista, setUsuariosLista] = useState<any[]>([]);
  const [rolesLista, setRolesLista] = useState<any[]>([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [modalUsuarioAbierto, setModalUsuarioAbierto] = useState(false);
  const [editandoUsuarioId, setEditandoUsuarioId] = useState<string | null>(null);
  const [formUsuario, setFormUsuario] = useState({
    nombres: '',
    apellidos: '',
    username: '',
    password: '',
    rol_id: '',
    correo_electronico: '',
    telefono: '',
  });
  const [usuarioProcesando, setUsuarioProcesando] = useState(false);
  const [usuarioMensaje, setUsuarioMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // ==================== REPORTES STATES ====================
  const [rangoRapido, setRangoRapido] = useState<string>('HOY');
  const [fechaDesde, setFechaDesde] = useState<string>(ReportesService.isoAFechaInput(rangoHoy().desdeISO));
  const [fechaHasta, setFechaHasta] = useState<string>(ReportesService.isoAFechaInput(rangoHoy().hastaISO));
  const [resumenReportes, setResumenReportes] = useState<ResumenReportes | null>(null);
  const [reportesLoading, setReportesLoading] = useState(false);
  const [tabReportes, setTabReportes] = useState<string>('RESUMEN');

  const calcularReportes = useCallback(() => {
    setReportesLoading(true);
    try {
      const rango: RangoFechas = {
        desdeISO: ReportesService.fechaInputAISO(fechaDesde, false),
        hastaISO: ReportesService.fechaInputAISO(fechaHasta, true),
      };
      const res = ReportesService.calcular(rango);
      setResumenReportes(res);
    } catch (e) {
      console.error('[Reportes] error al calcular:', e);
    } finally {
      setReportesLoading(false);
    }
  }, [fechaDesde, fechaHasta]);

  const aplicarRangoRapido = (tipo: string) => {
    setRangoRapido(tipo);
    let r: RangoFechas;
    switch (tipo) {
      case 'HOY': r = rangoHoy(); break;
      case 'AYER': r = rangoAyer(); break;
      case 'SEMANA': r = rangoSemana(); break;
      case 'MES': r = rangoMes(); break;
      case 'MES_ANTERIOR': r = rangoMesAnterior(); break;
      default: r = rangoHoy();
    }
    setFechaDesde(ReportesService.isoAFechaInput(r.desdeISO));
    setFechaHasta(ReportesService.isoAFechaInput(r.hastaISO));
  };

  const cargarUsuarios = useCallback(async () => {
    setUsuariosLoading(true);
    try {
      const [usuarios, roles] = await Promise.all([
        AuthService.listarUsuarios(),
        AuthService.listarRoles(),
      ]);
      setUsuariosLista(usuarios);
      setRolesLista(roles);
    } catch (e) {
      console.warn('Error cargando usuarios:', e);
    } finally {
      setUsuariosLoading(false);
    }
  }, []);

  const abrirNuevoUsuario = () => {
    setEditandoUsuarioId(null);
    setFormUsuario({ nombres: '', apellidos: '', username: '', password: '', rol_id: rolesLista[0]?.id || '', correo_electronico: '', telefono: '' });
    setUsuarioMensaje(null);
    setModalUsuarioAbierto(true);
  };

  const abrirEditarUsuario = (u: any) => {
    setEditandoUsuarioId(u.id);
    setFormUsuario({
      nombres: u.nombres || u.payload?.nombres || '',
      apellidos: u.apellidos || u.payload?.apellidos || '',
      username: u.username || u.payload?.username || '',
      password: '',
      rol_id: u.rol_id || '',
      correo_electronico: u.correo_electronico || u.payload?.correo_electronico || '',
      telefono: u.telefono || u.payload?.telefono || '',
    });
    setUsuarioMensaje(null);
    setModalUsuarioAbierto(true);
  };

  const guardarUsuario = async () => {
    setUsuarioMensaje(null);
    if (!formUsuario.nombres.trim() || !formUsuario.apellidos.trim()) {
      setUsuarioMensaje({ tipo: 'error', texto: 'Nombres y apellidos son obligatorios.' });
      return;
    }
    if (!formUsuario.username.trim() || formUsuario.username.trim().length < 3) {
      setUsuarioMensaje({ tipo: 'error', texto: 'El usuario debe tener al menos 3 caracteres.' });
      return;
    }
    if (!formUsuario.rol_id) {
      setUsuarioMensaje({ tipo: 'error', texto: 'Selecciona un rol.' });
      return;
    }
    if (!editandoUsuarioId && (!formUsuario.password || formUsuario.password.length < 4)) {
      setUsuarioMensaje({ tipo: 'error', texto: 'La contraseña debe tener al menos 4 caracteres.' });
      return;
    }
    setUsuarioProcesando(true);
    try {
      let res;
      if (editandoUsuarioId) {
        const datos: any = {
          nombres: formUsuario.nombres,
          apellidos: formUsuario.apellidos,
          username: formUsuario.username,
          rol_id: formUsuario.rol_id,
          correo_electronico: formUsuario.correo_electronico || null,
          telefono: formUsuario.telefono || null,
        };
        if (formUsuario.password && formUsuario.password.length >= 4) datos.password = formUsuario.password;
        res = await AuthService.actualizarUsuario(editandoUsuarioId, datos);
      } else {
        res = await AuthService.crearUsuario({
          nombres: formUsuario.nombres,
          apellidos: formUsuario.apellidos,
          username: formUsuario.username,
          password: formUsuario.password,
          rol_id: formUsuario.rol_id,
          correo_electronico: formUsuario.correo_electronico || undefined,
          telefono: formUsuario.telefono || undefined,
        });
      }
      if (!res.ok) {
        setUsuarioMensaje({ tipo: 'error', texto: res.error || 'Error al guardar.' });
        return;
      }
      setUsuarioMensaje({ tipo: 'ok', texto: editandoUsuarioId ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.' });
      await cargarUsuarios();
      setTimeout(() => setModalUsuarioAbierto(false), 800);
    } catch (e: any) {
      setUsuarioMensaje({ tipo: 'error', texto: e?.message || 'Error inesperado.' });
    } finally {
      setUsuarioProcesando(false);
    }
  };

  const toggleEstadoUsuario = async (u: any) => {
    const nuevoEstado = u.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      const res = await AuthService.cambiarEstadoUsuario(u.id, nuevoEstado as 'ACTIVO' | 'INACTIVO');
      if (res.ok) {
        setUsuariosLista((lista) => lista.map((x) => x.id === u.id ? { ...x, estado: nuevoEstado } : x));
      }
    } catch (e) {
      console.warn('Error cambiando estado:', e);
    }
  };

  const manejarCambioContrasena = async () => {
    setPwdMensaje(null);
    if (!pwdActual || !pwdNueva || !pwdConfirmar) {
      setPwdMensaje({ tipo: 'error', texto: 'Completa todos los campos.' });
      return;
    }
    if (pwdNueva.length < 4) {
      setPwdMensaje({ tipo: 'error', texto: 'La nueva contraseña debe tener al menos 4 caracteres.' });
      return;
    }
    if (pwdNueva !== pwdConfirmar) {
      setPwdMensaje({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    const sesion = AuthService.sesionActual();
    if (!sesion) {
      setPwdMensaje({ tipo: 'error', texto: 'No hay sesión activa.' });
      return;
    }
    setPwdProcesando(true);
    try {
      if (!supabase) {
        setPwdMensaje({ tipo: 'error', texto: 'Conexión no disponible.' });
        return;
      }
      const hashActual = await AuthService.hashPassword(pwdActual);
      const { data, error } = await supabase
        .from('usuarios')
        .select('password_hash')
        .eq('id', sesion.id)
        .limit(1)
        .maybeSingle();
      if (error) {
        setPwdMensaje({ tipo: 'error', texto: 'No se pudo verificar la contraseña actual.' });
        return;
      }
      if (!data || String((data as any).password_hash || '') !== hashActual) {
        setPwdMensaje({ tipo: 'error', texto: 'La contraseña actual es incorrecta.' });
        return;
      }
      const res = await AuthService.cambiarContrasena(sesion.id, pwdNueva);
      if (!res.ok) {
        setPwdMensaje({ tipo: 'error', texto: res.error || 'No se pudo cambiar la contraseña.' });
        return;
      }
      setPwdMensaje({ tipo: 'ok', texto: 'Contraseña cambiada correctamente.' });
      setPwdActual('');
      setPwdNueva('');
      setPwdConfirmar('');
    } catch (e: any) {
      setPwdMensaje({ tipo: 'error', texto: e?.message || 'Error de conexión.' });
    } finally {
      setPwdProcesando(false);
    }
  };
  const [confirmBorrarProd, setConfirmBorrarProd] = useState<{ id: string; nombre: string } | null>(null);

  const [modalStockAbierto, setModalStockAbierto] = useState(false);
  const [formStock, setFormStock] = useState<StockForm>({ modo: 'AGREGAR', delta: 0, motivo: '' });
  const [confirmQuitarStock, setConfirmQuitarStock] = useState<{ resumen: string; ejecutar: () => void } | null>(null);
  const [modalStockGlobalAbierto, setModalStockGlobalAbierto] = useState(false);
  const [busqStockGlobal, setBusqStockGlobal] = useState('');

  const [toast, setToast] = useState('');
  const mostrarToast = (t: string) => { setToast(t); window.setTimeout(() => setToast(''), 2600); };

  // Snapshots anti-parpadeo
  const snapHabs = useRef<string>('');
  const snapTipos = useRef<string>('');
  const snapCats = useRef<string>('');
  const snapProds = useRef<string>('');
  // Refs estables setState: NO recrear refrescarFuerza
  const setHabsAdminRef = useRef<typeof setHabsAdmin>(() => {});
  setHabsAdminRef.current = setHabsAdmin;
  const setTiposHabRef = useRef<typeof setTiposHab>(() => {});
  setTiposHabRef.current = setTiposHab;
  const setCategoriasFBRef = useRef<typeof setCategoriasFB>(() => {});
  setCategoriasFBRef.current = setCategoriasFB;
  const setProductosFBRef = useRef<typeof setProductosFB>(() => {});
  setProductosFBRef.current = setProductosFB;

  // ==================== HABITACIONES FUNCIONES (se mantiene) ====================
  const cargarHabs = () => {
    try {
      const tiposArr = HabitacionService.listarTipos() || [];
      const habsArr = HabitacionService.listarTodas() || [];
      const snapT = stableStringify(tiposArr);
      const snapH = stableStringify(habsArr);
      if (snapT !== snapTipos.current) { snapTipos.current = snapT; setTiposHabRef.current(tiposArr); }
      if (snapH !== snapHabs.current) { snapHabs.current = snapH; setHabsAdminRef.current(habsArr); }
    } catch {
      if (snapHabs.current !== '[]') { snapHabs.current = '[]'; setHabsAdminRef.current([]); }
      if (snapTipos.current !== '[]') { snapTipos.current = '[]'; setTiposHabRef.current([]); }
    }
  };

  const abrirNuevo = () => {
    setEditandoId(null);
    const primerTipo = tiposHab[0];
    const capTipo = primerTipo ? (Number(primerTipo.capacidadAdultos || 0) + Number(primerTipo.capacidadNinos || 0)) : 2;
    setForm({ ...FORM_VACIO_HAB, tipoHabitacionId: primerTipo?.id || '', estado: 'LIBRE', precioNoche: Number(primerTipo?.precioBaseNoche ?? 0), capacidadMaximaPax: capTipo || 2 });
    setModalAbierto(true);
  };

  const guardarImpresoraConfig = (parcial: Partial<ImpresoraConfig>) => {
    const nueva = ImpresoraConfigService.actualizar(parcial);
    setImpresoraConfig(nueva);
    aplicarEstilosTicket();
  };

  const refreshingRefPerfil = useRef(false);
  const calcularReportesRef = useRef(calcularReportes);
  calcularReportesRef.current = calcularReportes;
  const refrescarFuerzaActual = useCallback(async (postFlush = false) => {
    if (refreshingRefPerfil.current) return;
    refreshingRefPerfil.current = true;
    try {
      try {
        await Promise.all([
          HabitacionService.hidratarDesdeSupabase?.(true),
          TarifaService.hidratarDesdeSupabase?.(true),
          PosService?.hidratarDesdeSupabase?.(true),
        ]);
      } catch (_) {}
      try { pendingSync.applyPendingLocal?.(); } catch (_) {}
      try { cargarHabs(); } catch (_) {}
      try { cargarCatProd(); } catch (_) {}
      if (tabPrincipal === 'REPORTES') {
        try { calcularReportesRef.current(); } catch (_) {}
      }
    } finally {
      refreshingRefPerfil.current = false;
      if (postFlush) {
        try { pendingSync.processQueue?.(false); } catch (_) {}
        cargarHabs(); cargarCatProd();
        if (tabPrincipal === 'REPORTES') {
          try { calcularReportesRef.current(); } catch (_) {}
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabPrincipal]);
  const refrescarPerfilRef = useRef(refrescarFuerzaActual);
  refrescarPerfilRef.current = refrescarFuerzaActual;

  const abrirEditar = (h: Habitacion) => {
    refrescarPerfilRef.current();
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
      setHabSeleccionadaId('');
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
    try {
      const cats = CatalogoFBService.listarCategorias() || [];
      const snapC = stableStringify(cats);
      if (snapC !== snapCats.current) { snapCats.current = snapC; setCategoriasFBRef.current(cats); }
    } catch {
      if (snapCats.current !== '[]') { snapCats.current = '[]'; setCategoriasFBRef.current([]); }
    }
    try {
      const prods = CatalogoFBService.listarProductos({ soloActivos: false }) || [];
      const snapP = stableStringify(prods);
      if (snapP !== snapProds.current) { snapProds.current = snapP; setProductosFBRef.current(prods); }
    } catch {
      if (snapProds.current !== '[]') { snapProds.current = '[]'; setProductosFBRef.current([]); }
    }
  };

  useIonViewWillEnter(() => { refrescarPerfilRef.current(); });

  // Cargar usuarios cuando se abre la pestaña USUARIOS
  useEffect(() => {
    if (tabPrincipal === 'USUARIOS' && puedeGestionarUsuarios) {
      cargarUsuarios();
    }
  }, [tabPrincipal, puedeGestionarUsuarios, cargarUsuarios]);

  // Calcular reportes cuando se abre la pestaña REPORTES o cambian las fechas
  useEffect(() => {
    if (tabPrincipal === 'REPORTES') {
      calcularReportes();
    }
  }, [tabPrincipal, calcularReportes]);

  // === Hooks NUEVOS: Listener global + Realtime deps = [] estable ===
  useEffect(() => {
    let alive = true;
    const onEv = (e: any) => {
      if (!alive) return;
      const pg = String(e?.detail?.page || '');
      if (pg === 'PERFIL' || pg === 'TODAS') { refrescarPerfilRef.current(true); }
    };
    try { window.addEventListener(EVENTO_REFRESCAR, onEv as EventListener); } catch {}
    return () => {
      alive = false;
      try { window.removeEventListener(EVENTO_REFRESCAR, onEv as EventListener); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime deps = [] estable; NO tiene setTimeouts init que causen parpadeo
  useEffect(() => {
    let alive = true;
    let debounceId: any;
    const TABLAS_RT = ['habitaciones', 'tipos_habitacion', 'categorias_fb', 'productos_fb', 'presentaciones_fb', 'tarifas', 'temporadas', 'politicas_cancelacion', 'impuestos', 'mesas', 'puntos_venta', 'comandas', 'comandas_detalles'];
    const recargarDebounced = () => {
      if (!alive) return;
      clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        if (!alive) return;
        refrescarPerfilRef.current(false);
      }, 500);
    };

    const canales: any[] = [];
    try {
      const sb: any = (supabase as any)?.channel ? (supabase as any) : null;
      if (sb) {
        for (const t of TABLAS_RT) {
          try {
            const ch = sb.channel(`rt-perf-${t}-${Math.random().toString(36).slice(2,7)}`)
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
        const sb: any = (supabase as any)?.removeChannel ? (supabase as any) : null;
        if (sb) Promise.all(canales.map(c => sb.removeChannel?.(c))).catch(()=>{});
      } catch (_) {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando se selecciona un producto del selector → abrir modal de editar directamente
  useEffect(() => {
    if (!prodSeleccionadoId) return;
    if (modalProdAbierto) return;
    const p = productosFB.find((x) => x.id === prodSeleccionadoId);
    if (p) abrirEditarProd(p);
  }, [prodSeleccionadoId, productosFB, modalProdAbierto]);

  // Cuando se selecciona una habitación del selector → abrir modal de editar directamente
  useEffect(() => {
    if (!habSeleccionadaId) return;
    const h = habsAdmin.find((x) => x.id === habSeleccionadaId);
    if (h) abrirEditar(h);
  }, [habSeleccionadaId, habsAdmin]);

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

  const generarCodigoUnico = (categoriaIdSel: string, excluirId?: string): string => {
    const cat = categoriasFB.find(c => c.id === categoriaIdSel);
    if (!cat) return '';
    const prefijoFull = String((cat.payload?.codigo) || cat.codigo || `CAT-${String(cat.id||'').slice(0,3).toUpperCase()}`);
    const prefijo = prefijoFull.replace(/^CAT-/, '').slice(0, 6).toUpperCase();
    if (!prefijo) return '';
    const codigosExistentes = new Set(
      productosFB
        .filter((p: any) => p.id !== excluirId)
        .map((p: any) => String(p.codigo || '').toUpperCase())
    );
    let consecutivo = 1;
    let candidato = `${prefijo}-${String(consecutivo).padStart(3, '0')}`;
    while (codigosExistentes.has(candidato)) {
      consecutivo++;
      candidato = `${prefijo}-${String(consecutivo).padStart(3, '0')}`;
    }
    return candidato;
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
      codigo: catDefaultId ? generarCodigoUnico(catDefaultId) : '',
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
    refrescarFuerzaActual().catch(() => {});
  };

  // ============ IMPRIMIR INVENTARIO DE PRODUCTOS ============
  // Solo incluye productos ENVASEMBOTellados (stockControl=true), excluye platos/jugos/bebidas preparadas
  const imprimirInventarioProductos = () => {
    const hoy = new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
    const categorias = [...categoriasFB].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    // Solo productos con control de stock (envasados/embotellados)
    const productos = productosFB.filter((p) => stockPlanoProd(p).stockControl === true);
    const totalProductos = productos.length;
    let totalValor = 0;

    const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    let filas = '';
    for (const cat of categorias) {
      const prodsCat = productos.filter((p) => p.categoriaId === cat.id).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || (a.nombre || '').localeCompare(b.nombre || ''));
      if (prodsCat.length === 0) continue;
      filas += `<tr class="cat-row"><td colspan="7"><strong>${esc(cat.nombre)}</strong> <span style="color:#888;font-weight:normal">(${prodsCat.length} productos)</span></td></tr>`;
      for (const p of prodsCat) {
        const plano = stockPlanoProd(p);
        const stockActual = Number(plano.stockActual || 0);
        const precio = Number(p.precioVentaBase || 0);
        const costo = Number(p.costoAproximado || p.costoUnitario || 0);
        totalValor += stockActual * costo;
        const bajo = plano.stockControl && plano.stockMinimo > 0 && stockActual <= plano.stockMinimo;
        filas += `<tr>
          <td>${esc(p.codigo || '')}</td>
          <td>${esc(p.nombre || '')}</td>
          <td style="text-align:center">${esc(p.unidadMedida || 'UND')}</td>
          <td style="text-align:right;font-weight:600">${stockActual}</td>
          <td style="text-align:right;color:${bajo ? '#d32f2f' : '#666'}">${plano.stockMinimo || 0}</td>
          <td style="text-align:right">S/ ${precio.toFixed(2)}</td>
          <td class="fisica-col" style="border-bottom:1px solid #ccc">&nbsp;</td>
        </tr>`;
      }
    }

    if (!filas) {
      filas = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#999">No hay productos envasados/embotellados con control de stock.</td></tr>`;
    }

    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><title>Inventario de Productos - ${hoy}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;margin:12mm;color:#222}
  h1{font-size:16px;margin:0 0 2px}
  .sub{color:#666;font-size:11px;margin-bottom:10px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #ddd;padding:4px 6px;text-align:left}
  th{background:#f2f2f2;font-size:10px;text-transform:uppercase}
  .cat-row td{background:#eef4fb;border-top:2px solid #4a90d9;font-weight:700}
  .fisica-col{min-width:60px}
  tfoot td{font-weight:700;background:#fafafa}
  .totales{margin-top:12px;font-size:11px}
  .firma{margin-top:40px;display:flex;justify-content:space-between}
  .firma div{border-top:1px solid #333;width:200px;text-align:center;padding-top:4px;font-size:10px}
  @media print{body{margin:8mm}}
</style></head>
<body>
  <h1>Inventario de Productos Envasados</h1>
  <div class="sub">Casa Sumaq Allpa · Generado: ${hoy} · Total: ${totalProductos} productos con control de stock</div>
  <table>
    <thead>
      <tr>
        <th style="width:80px">Código</th>
        <th>Producto</th>
        <th style="width:50px;text-align:center">Und</th>
        <th style="width:60px;text-align:right">Stock</th>
        <th style="width:60px;text-align:right">Stock Mín</th>
        <th style="width:70px;text-align:right">Precio Vta</th>
        <th style="width:80px">Cant. Física</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
    <tfoot>
      <tr><td colspan="3" style="text-align:right">Total productos:</td><td colspan="2">${totalProductos}</td><td colspan="2"></td></tr>
    </tfoot>
  </table>
  <div class="totales">Valor total en inventario (costo): <strong>S/ ${totalValor.toFixed(2)}</strong></div>
  <div class="firma">
    <div>Responsable de almacén</div>
    <div>Administración</div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
</body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { mostrarToast('Permite ventanas emergentes para imprimir'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const guardarProd = () => {
    if (!formProd.nombre.trim()) { mostrarToast('Nombre producto es obligatorio'); return; }
    if (!formProd.categoriaId) { mostrarToast('Selecciona categoría'); return; }
    try {
      const codigoFinal = (!editandoProdId)
        ? (generarCodigoUnico(formProd.categoriaId) || formProd.nombre.trim())
        : (formProd.codigo || '').trim();
      const data = {
        ...formProd,
        codigo: codigoFinal,
        nombre: formProd.nombre.trim(),
        descripcion: formProd.descripcion.trim(),
        unidadMedida: formProd.unidadMedida || 'UND',
        precioVentaBase: Number(formProd.precioVentaBase || 0),
        costoAproximado: Number(formProd.costoAproximado || 0),
        stockControl: !!formProd.stockControl,
        stockActual: formProd.stockControl ? Number(formProd.stockActual || 0) : 0,
        stockMinimo: formProd.stockControl ? Number(formProd.stockMinimo || 0) : 0,
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
      setProdSeleccionadoId('');
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
          <IonButtons slot="end">
            <IonButton size="small" color="light" onClick={() => {
              try { window.dispatchEvent(new CustomEvent(EVENTO_REFRESCAR, { detail: { page: 'PERFIL' } })); } catch(_){}
            }}>
              <IonIcon icon={refresh} />
            </IonButton>
            <IonButton size="small" color="danger" onClick={() => {
              if (window.confirm('¿Cerrar sesión?')) {
                window.dispatchEvent(new CustomEvent('lodge:logout'));
              }
            }}>
              <IonIcon icon={logOutOutline} />
            </IonButton>
          </IonButtons>
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

        {/* =============== PESTAÑAS PRINCIPALES =============== */}
        <IonSegment
          value={tabPrincipal}
          onIonChange={(e: any) => setTabPrincipal(e.target.value)}
          className="main-tabs-segment"
          scrollable
        >
          <IonSegmentButton value="HABITACIONES" type="button">
            <IonIcon icon={bedOutline} />
            <IonLabel>Habitaciones</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="PRODUCTOS" type="button">
            <IonIcon icon={cube} />
            <IonLabel>Productos</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="REPORTES" type="button">
            <IonIcon icon={documentText} />
            <IonLabel>Reportes</IonLabel>
          </IonSegmentButton>
          {puedeGestionarUsuarios && (
          <IonSegmentButton value="USUARIOS" type="button">
            <IonIcon icon={people} />
            <IonLabel>Usuarios</IonLabel>
          </IonSegmentButton>
          )}
          <IonSegmentButton value="CUENTA" type="button">
            <IonIcon icon={lockClosed} />
            <IonLabel>Cuenta</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {/* =============== PESTAÑA: CUENTA =============== */}
        {tabPrincipal === 'CUENTA' && (
        <>
        {/* =============== CAMBIAR CONTRASEÑA =============== */}
        <IonCard className="section-card">
          <IonCardHeader className="section-header">
            <div className="section-header-title">
              <div className="section-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                <IonIcon icon={lockClosed} />
              </div>
              <div>
                <div className="section-title">Seguridad de la cuenta</div>
                <div className="section-subtitle">Cambia tu contraseña de acceso</div>
              </div>
            </div>
          </IonCardHeader>
          <IonCardContent>
            <IonItem className="login-item">
              <IonInput
                type="password"
                placeholder="Contraseña actual"
                value={pwdActual}
                onIonInput={(e) => setPwdActual((e.target as HTMLIonInputElement).value as string)}
              />
            </IonItem>
            <IonItem className="login-item">
              <IonInput
                type="password"
                placeholder="Nueva contraseña"
                value={pwdNueva}
                onIonInput={(e) => setPwdNueva((e.target as HTMLIonInputElement).value as string)}
              />
            </IonItem>
            <IonItem className="login-item">
              <IonInput
                type="password"
                placeholder="Confirmar nueva contraseña"
                value={pwdConfirmar}
                onIonInput={(e) => setPwdConfirmar((e.target as HTMLIonInputElement).value as string)}
              />
            </IonItem>
            {pwdMensaje && (
              <div style={{
                background: pwdMensaje.tipo === 'ok' ? '#ecfdf5' : '#fef2f2',
                color: pwdMensaje.tipo === 'ok' ? '#047857' : '#b91c1c',
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 13,
                margin: '12px 0',
                border: `1px solid ${pwdMensaje.tipo === 'ok' ? '#a7f3d0' : '#fecaca'}`,
              }}>
                {pwdMensaje.texto}
              </div>
            )}
            <IonButton
              expand="block"
              color="primary"
              onClick={manejarCambioContrasena}
              disabled={pwdProcesando}
            >
              {pwdProcesando ? <IonSpinner name="crescent" /> : 'Cambiar contraseña'}
            </IonButton>
          </IonCardContent>
        </IonCard>

        {/* =============== CONFIGURACIÓN DE IMPRESORA =============== */}
        <IonCard className="section-card">
          <IonCardHeader className="section-header">
            <div className="section-header-title">
              <div className="section-icon" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
                <IonIcon icon={print} />
              </div>
              <div>
                <div className="section-title">Impresora térmica</div>
                <div className="section-subtitle">Configura tu impresora de tickets (REDPOS HQ201 58mm)</div>
              </div>
            </div>
          </IonCardHeader>
          <IonCardContent>
            {/* Tamaño de papel */}
            <IonItem lines="full" style={{ '--padding-start': '0', '--padding-end': '0' }}>
              <IonLabel>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Tamaño de papel</h2>
                <p style={{ margin: '2px 0', fontSize: 12, color: 'var(--ion-color-medium)' }}>
                  REDPOS HQ201 usa rollo de 58mm
                </p>
              </IonLabel>
              <IonSelect
                slot="end"
                value={impresoraConfig.tamanoPapel}
                onIonChange={(e: any) => guardarImpresoraConfig({ tamanoPapel: e.detail.value as TamanoPapel })}
                style={{ maxWidth: 130 }}
              >
                <IonSelectOption value={58}>58 mm (estándar)</IonSelectOption>
                <IonSelectOption value={80}>80 mm (ancho)</IonSelectOption>
              </IonSelect>
            </IonItem>

            {/* Método de impresión */}
            <IonItem lines="full" style={{ '--padding-start': '0', '--padding-end': '0' }}>
              <IonLabel>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Método de impresión</h2>
                <p style={{ margin: '2px 0', fontSize: 12, color: 'var(--ion-color-medium)' }}>
                  {ImpresoraConfigService.plataforma() === 'android'
                    ? 'Android: usa Sistema + app de impresión Bluetooth'
                    : 'PC: Sistema usa el driver de Windows'}
                </p>
              </IonLabel>
              <IonSelect
                slot="end"
                value={impresoraConfig.metodoImpresion}
                onIonChange={(e: any) => guardarImpresoraConfig({ metodoImpresion: e.detail.value as MetodoImpresion })}
                style={{ maxWidth: 160 }}
              >
                <IonSelectOption value="sistema">Sistema (window.print)</IonSelectOption>
                <IonSelectOption value="webusb" disabled={!ImpresoraConfigService.soportaWebUSB()}>
                  USB directo {!ImpresoraConfigService.soportaWebUSB() ? '(no soportado)' : ''}
                </IonSelectOption>
              </IonSelect>
            </IonItem>

            {/* Nombre de empresa */}
            <IonItem lines="full" style={{ '--padding-start': '0', '--padding-end': '0' }}>
              <IonLabel position="stacked" style={{ fontSize: 13, fontWeight: 600 }}>Nombre en el ticket</IonLabel>
              <IonInput
                value={impresoraConfig.nombreEmpresa}
                onIonChange={(e: any) => guardarImpresoraConfig({ nombreEmpresa: e.detail.value })}
                placeholder="Casa Sumaq Allpa"
              />
            </IonItem>

            {/* Mostrar IGV */}
            <IonItem lines="full" style={{ '--padding-start': '0', '--padding-end': '0' }}>
              <IonLabel>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Mostrar IGV en ticket</h2>
              </IonLabel>
              <IonCheckbox
                slot="end"
                checked={impresoraConfig.mostrarIgv}
                onIonChange={(e: any) => guardarImpresoraConfig({ mostrarIgv: e.detail.checked })}
              />
            </IonItem>

            {/* Información según plataforma */}
            <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--ion-color-light)', fontSize: 12, lineHeight: 1.5 }}>
              {ImpresoraConfigService.plataforma() === 'android' && (
                <>
                  <strong>📱 Android:</strong> Para imprimir por Bluetooth instala una app de servicio de impresión como <em>PrintHand</em> o <em>Bluetooth Printer</em> en Google Play. Luego en el diálogo de impresión elige tu REDPOS HQ201.
                </>
              )}
              {ImpresoraConfigService.plataforma() === 'windows' && (
                <>
                  <strong>🖥️ Windows:</strong> Instala el driver de la REDPOS HQ201, conéctala por USB y selecciónala como impresora por defecto. El diálogo de impresión aparecerá automáticamente.
                </>
              )}
              {!['android', 'windows'].includes(ImpresoraConfigService.plataforma()) && (
                <>
                  <strong>ℹ️ Este dispositivo:</strong> La impresión por Bluetooth directa no está soportada desde el navegador. Usa una conexión USB o un dispositivo Windows/Android.
                </>
              )}
            </div>

            {/* Botón de prueba */}
            <IonButton
              expand="block"
              fill="outline"
              color="primary"
              style={{ marginTop: 12 }}
              onClick={() => {
                const w = window.open('', '_blank');
                if (!w) return;
                const ancho = impresoraConfig.tamanoPapel;
                w.document.write(`
                  <html><head><title>Prueba ticket ${ancho}mm</title>
                  <style>
                    @page { size: ${ancho}mm auto; margin: 0; }
                    body { font-family: 'Courier New', monospace; font-size: 11px; width: ${ancho}mm; margin: 0 auto; padding: 4mm 3mm; }
                    h1 { font-size: 14px; text-align: center; margin: 0 0 4px; }
                    .line { border-bottom: 1px dashed #000; margin: 6px 0; }
                    .row { display: flex; justify-content: space-between; }
                  </style></head><body>
                    <h1>${impresoraConfig.nombreEmpresa || 'Casa Sumaq Allpa'}</h1>
                    <div style="text-align:center;font-size:10px;">Ticket de prueba ${ancho}mm</div>
                    <div class="line"></div>
                    <div class="row"><span>Producto</span><span>Precio</span></div>
                    <div class="row"><span>Prueba 1</span><span>S/ 10.00</span></div>
                    <div class="row"><span>Prueba 2</span><span>S/ 25.50</span></div>
                    <div class="line"></div>
                    <div class="row"><strong>TOTAL</strong><strong>S/ 35.50</strong></div>
                    <div style="text-align:center;margin-top:8px;font-size:10px;">¡Impresión OK!</div>
                  </body></html>
                `);
                w.document.close();
                setTimeout(() => { w.print(); w.close(); }, 300);
              }}
            >
              <IonIcon icon={print} slot="start" />
              Imprimir ticket de prueba
            </IonButton>
          </IonCardContent>
        </IonCard>
        </>
        )}

        {/* =============== PESTAÑA: USUARIOS =============== */}
        {tabPrincipal === 'USUARIOS' && puedeGestionarUsuarios && (
        <>
        <IonCard className="section-card">
          <IonCardHeader className="section-header">
            <div className="section-header-title">
              <div className="section-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                <IonIcon icon={people} />
              </div>
              <div>
                <div className="section-title">Usuarios del sistema</div>
                <div className="section-subtitle">
                  {usuariosLista.length} usuario(s) · Gestiona accesos y roles
                </div>
              </div>
            </div>
            <IonButton color="primary" className="section-btn-add" onClick={abrirNuevoUsuario}>
              <IonIcon slot="start" icon={add} />
              Nuevo usuario
            </IonButton>
          </IonCardHeader>
          <IonCardContent className="section-content">
            {usuariosLoading ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <IonSpinner name="crescent" />
              </div>
            ) : usuariosLista.length === 0 ? (
              <div className="empty-state">
                <IonIcon icon={people} className="empty-state-icon" />
                <div className="empty-state-title">No hay usuarios registrados</div>
                <div className="empty-state-text">Crea el primer usuario usando el botón superior.</div>
              </div>
            ) : (
              <IonList lines="inset">
                {usuariosLista.map((u) => {
                  const rol = rolesLista.find((r) => r.id === u.rol_id);
                  const username = u.username || u.payload?.username || '(sin usuario)';
                  const esActivo = String(u.estado || '').toUpperCase() === 'ACTIVO';
                  return (
                    <IonItem key={u.id} className="usuario-item">
                      <IonAvatar slot="start" style={{ background: esActivo ? 'linear-gradient(135deg,#10b981,#059669)' : '#9ca3af' }}>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                          {(u.iniciales || `${(u.nombres||'')[0]}${(u.apellidos||'')[0]}`).toUpperCase().slice(0,2)}
                        </span>
                      </IonAvatar>
                      <IonLabel>
                        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                          {u.nombres || u.payload?.nombres} {u.apellidos || u.payload?.apellidos}
                        </h2>
                        <p style={{ margin: '2px 0', fontSize: 13, color: 'var(--ion-color-medium)' }}>
                          @{username}
                        </p>
                        <p style={{ margin: '2px 0', fontSize: 12 }}>
                          <IonBadge color={esActivo ? 'success' : 'medium'} style={{ marginRight: 6 }}>
                            {esActivo ? 'ACTIVO' : 'INACTIVO'}
                          </IonBadge>
                          <IonBadge color="tertiary">{rol?.nombre || 'Sin rol'}</IonBadge>
                        </p>
                      </IonLabel>
                      <IonButtons slot="end">
                        <IonButton fill="clear" color="primary" onClick={() => abrirEditarUsuario(u)}>
                          <IonIcon icon={create} />
                        </IonButton>
                        <IonButton
                          fill="clear"
                          color={esActivo ? 'medium' : 'success'}
                          onClick={() => toggleEstadoUsuario(u)}
                        >
                          <IonIcon icon={esActivo ? pauseOutline : playOutline} />
                        </IonButton>
                      </IonButtons>
                    </IonItem>
                  );
                })}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>
        </>
        )}

        {/* =============== PESTAÑA: HABITACIONES =============== */}
        {tabPrincipal === 'HABITACIONES' && (
        <>
        <IonCard className="section-card">
          <IonCardHeader className="section-header">
            <div className="section-header-title">
              <div className="section-icon section-icon-hab">
                <IonIcon icon={bedOutline} />
              </div>
              <div>
                <div className="section-title">Habitaciones</div>
                <div className="section-subtitle">
                  {habsAdmin.length} habitaciones · Toca para ver detalle y cambiar estado
                </div>
              </div>
            </div>
            {puedeGestionarHab && (
              <IonButton color="primary" className="section-btn-add" onClick={abrirNuevo}>
                <IonIcon slot="start" icon={add} />
                Nueva
              </IonButton>
            )}
          </IonCardHeader>

          <IonCardContent className="section-content">
            {habsAdmin.length === 0 ? (
              <div className="empty-state">
                <IonIcon icon={bedOutline} className="empty-state-icon" />
                <div className="empty-state-title">No hay habitaciones registradas</div>
                <div className="empty-state-text">Crea la primera habitación usando el botón superior.</div>
              </div>
            ) : (
              <div className="selector-field" style={{ margin: '8px 0' }}>
                <label className="selector-label">Seleccionar habitación</label>
                <IonSelect
                  interface="action-sheet"
                  placeholder="Seleccionar habitación"
                  value={habSeleccionadaId}
                  onIonChange={(e: any) => setHabSeleccionadaId(e.detail.value || '')}
                  className="prod-select"
                >
                  {habsAdmin.map((h) => {
                    const tipo = tiposHab.find((t) => t.id === h.tipoHabitacionId);
                    const estadoLbl: Record<string, string> = {
                      LIBRE: 'Libre', DISPONIBLE: 'Disponible', OCUPADA: 'Ocupada',
                      RESERVADA: 'Reservada', BLOQUEADA: 'Bloqueada', LIMPIEZA: 'Limpieza',
                      INSPECCIONADA: 'Inspeccionada', MANTENIMIENTO: 'Mantenimiento',
                    };
                    return (
                      <IonSelectOption key={h.id} value={h.id}>
                        {h.codigo} - {h.nombre || tipo?.nombre || 'Habitación'} [{estadoLbl[h.estado] || h.estado}]
                      </IonSelectOption>
                    );
                  })}
                </IonSelect>
              </div>
            )}
          </IonCardContent>
        </IonCard>
        </>
        )}

        {/* =============== PESTAÑA: PRODUCTOS =============== */}
        {tabPrincipal === 'PRODUCTOS' && (
        <>
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
              {puedeGestionarProd && (
                <IonButton size="default" color="tertiary" fill="outline" className="btn-stock-header" onClick={abrirNuevoCat}>
                  <IonIcon slot="start" icon={layers} />
                  Categoría
                </IonButton>
              )}
              {puedeGestionarProd && (
                <IonButton size="default" color="success" className="btn-stock-header" onClick={abrirNuevoProd}>
                  <IonIcon slot="start" icon={add} />
                  Producto
                </IonButton>
              )}
              <IonButton size="default" color="primary" className="btn-stock-header" onClick={() => { setBusqStockGlobal(''); setModalStockGlobalAbierto(true); }}>
                <IonIcon slot="start" icon={archive} />
                +Stock Global
              </IonButton>
              <IonButton size="default" color="medium" fill="outline" className="btn-stock-header" onClick={imprimirInventarioProductos}>
                <IonIcon slot="start" icon={print} />
                Imprimir
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
                <div className="prod-selectors-wrap">
                  <IonSearchbar
                    className="prod-searchbar"
                    placeholder="Buscar por nombre o código..."
                    value={busqProd}
                    onIonInput={(e: any) => setBusqProd(String(e.target.value || ''))}
                    showCancelButton="never"
                    debounce={250}
                    mode="ios"
                    searchIcon={search}
                  />

                  <div className="selector-row">
                    <div className="selector-field">
                      <label className="selector-label">Categoría</label>
                      <IonSelect
                        interface="action-sheet"
                        placeholder="Seleccionar categoría"
                        value={catSeleccionadaId}
                        onIonChange={(e: any) => {
                          setCatSeleccionadaId(e.detail.value || '');
                          setProdSeleccionadoId('');
                        }}
                        className="prod-select"
                      >
                        {[...categoriasFB].sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0)).map((c) => (
                          <IonSelectOption key={c.id} value={c.id}>
                            {c.nombre} ({productosFB.filter((p) => p.categoriaId === c.id).length})
                          </IonSelectOption>
                        ))}
                      </IonSelect>
                    </div>

                    <div className="selector-field">
                      <label className="selector-label">Producto</label>
                      <IonSelect
                        interface="action-sheet"
                        placeholder={catSeleccionadaId ? 'Seleccionar producto' : 'Primero elige categoría'}
                        value={prodSeleccionadoId}
                        disabled={!catSeleccionadaId}
                        onIonChange={(e: any) => setProdSeleccionadoId(e.detail.value || '')}
                        className="prod-select"
                      >
                        {productosFB
                          .filter((p) => p.categoriaId === catSeleccionadaId)
                          .filter((p) => {
                            if (!busqProd || !busqProd.trim()) return true;
                            const q = busqProd.trim().toLowerCase();
                            return (p.nombre || '').toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q);
                          })
                          .sort((a, b) => String(a.codigo || '').localeCompare(String(b.codigo || '')))
                          .map((p) => (
                            <IonSelectOption key={p.id} value={p.id}>
                              {p.codigo} - {p.nombre}
                            </IonSelectOption>
                          ))}
                      </IonSelect>
                    </div>
                  </div>

                  {!catSeleccionadaId && (
                    <div className="selector-hint">
                      <IonIcon icon={cube} /> Selecciona una categoría para ver sus productos
                    </div>
                  )}
                </div>
              </>
            )}
          </IonCardContent>
        </IonCard>
        </>
        )}

        {/* =============== PESTAÑA: REPORTES =============== */}
        {tabPrincipal === 'REPORTES' && (
          <>
            <IonCard className="section-card reportes-print-area">
              <IonCardHeader className="section-header">
                <div className="section-header-title">
                  <div className="section-icon" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
                    <IonIcon icon={documentText} />
                  </div>
                  <div>
                    <div className="section-title">Reportes de ventas</div>
                    <div className="section-subtitle">Consumos, ganancias y métodos de pago</div>
                  </div>
                </div>
              </IonCardHeader>
              <IonCardContent>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      { id: 'HOY', label: 'Hoy' },
                      { id: 'AYER', label: 'Ayer' },
                      { id: 'SEMANA', label: '7 días' },
                      { id: 'MES', label: 'Este mes' },
                      { id: 'MES_ANTERIOR', label: 'Mes anterior' },
                    ].map((b) => (
                      <IonButton
                        key={b.id}
                        size="small"
                        fill={rangoRapido === b.id ? 'solid' : 'outline'}
                        color="primary"
                        onClick={() => { aplicarRangoRapido(b.id); }}
                      >
                        {b.label}
                      </IonButton>
                    ))}
                  </div>
                  <IonButton size="small" color="success" onClick={() => window.print()} className="no-print">
                    <IonIcon slot="start" icon={documentText} /> Exportar PDF
                  </IonButton>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 140px' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Desde</div>
                    <IonInput type="date" value={fechaDesde} onIonChange={(e) => { setFechaDesde(e.detail.value!); setRangoRapido(''); }} />
                  </div>
                  <div style={{ flex: '1 1 140px' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Hasta</div>
                    <IonInput type="date" value={fechaHasta} onIonChange={(e) => { setFechaHasta(e.detail.value!); setRangoRapido(''); }} />
                  </div>
                  <IonButton color="primary" onClick={async () => {
                    setReportesLoading(true);
                    await refrescarFuerzaActual(true);
                    calcularReportes();
                  }}>
                    <IonIcon slot="start" icon={refresh} /> Actualizar
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>

            {reportesLoading && (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <IonSpinner name="crescent" />
                <div style={{ marginTop: '8px', color: '#6b7280' }}>Calculando reportes…</div>
              </div>
            )}

            {!reportesLoading && resumenReportes && (
              <>
                {/* Pestañas internas */}
                <div className="no-print" style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'RESUMEN', label: 'Resumen' },
                    { id: 'PRODUCTOS', label: 'Productos' },
                    { id: 'CATEGORIAS', label: 'Categorías' },
                    { id: 'PAGOS', label: 'Métodos de pago' },
                    { id: 'MOZOS', label: 'Mozos' },
                    { id: 'TENDENCIA', label: 'Tendencia' },
                  ].map((t) => (
                    <IonButton
                      key={t.id}
                      size="small"
                      fill={tabReportes === t.id ? 'solid' : 'outline'}
                      color={tabReportes === t.id ? 'primary' : 'medium'}
                      onClick={() => setTabReportes(t.id)}
                    >
                      {t.label}
                    </IonButton>
                  ))}
                </div>

                {resumenReportes.kpis.totalComandas === 0 ? (
                  <IonCard className="section-card reportes-print-area">
                    <IonCardContent>
                      <div className="empty-state">
                        <IonIcon icon={documentText} className="empty-state-icon" />
                        <div className="empty-state-title">Sin ventas en el período</div>
                        <div className="empty-state-text">No hay comandas cobradas entre las fechas seleccionadas.</div>
                      </div>
                    </IonCardContent>
                  </IonCard>
                ) : (
                  <>
                    {/* PESTAÑA RESUMEN */}
                    {tabReportes === 'RESUMEN' && (
                      <>
                        {/* KPIs principales */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                          <IonCard className="kpi-card reportes-print-area" style={{ margin: 0 }}>
                            <IonCardContent style={{ padding: '16px' }}>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>Ventas totales</div>
                              <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                                {ReportesService.formatearMonto(resumenReportes.kpis.totalVentas)}
                              </div>
                            </IonCardContent>
                          </IonCard>
                          <IonCard className="kpi-card reportes-print-area" style={{ margin: 0 }}>
                            <IonCardContent style={{ padding: '16px' }}>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>Comandas</div>
                              <div style={{ fontSize: '22px', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
                                {ReportesService.formatearNumero(resumenReportes.kpis.totalComandas)}
                              </div>
                            </IonCardContent>
                          </IonCard>
                          <IonCard className="kpi-card reportes-print-area" style={{ margin: 0 }}>
                            <IonCardContent style={{ padding: '16px' }}>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>Ticket promedio</div>
                              <div style={{ fontSize: '22px', fontWeight: 700, color: '#7c3aed', marginTop: '4px' }}>
                                {ReportesService.formatearMonto(resumenReportes.kpis.ticketPromedio)}
                              </div>
                            </IonCardContent>
                          </IonCard>
                          <IonCard className="kpi-card reportes-print-area" style={{ margin: 0 }}>
                            <IonCardContent style={{ padding: '16px' }}>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>Productos vendidos</div>
                              <div style={{ fontSize: '22px', fontWeight: 700, color: '#d97706', marginTop: '4px' }}>
                                {ReportesService.formatearNumero(resumenReportes.kpis.totalProductosVendidos)}
                              </div>
                            </IonCardContent>
                          </IonCard>
                          <IonCard className="kpi-card reportes-print-area" style={{ margin: 0 }}>
                            <IonCardContent style={{ padding: '16px' }}>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>Ganancia estimada</div>
                              <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                                {ReportesService.formatearMonto(resumenReportes.kpis.gananciaEstimada)}
                              </div>
                            </IonCardContent>
                          </IonCard>
                        </div>

                        {/* KPIs secundarios */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                          <IonCard className="kpi-card reportes-print-area" style={{ margin: 0 }}>
                            <IonCardContent style={{ padding: '14px' }}>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>Pers. x comanda</div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0891b2', marginTop: '2px' }}>
                                {resumenReportes.kpis.promedioPersonasPorComanda.toFixed(1)}
                              </div>
                            </IonCardContent>
                          </IonCard>
                          <IonCard className="kpi-card reportes-print-area" style={{ margin: 0 }}>
                            <IonCardContent style={{ padding: '14px' }}>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>Consumo x persona</div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0891b2', marginTop: '2px' }}>
                                {ReportesService.formatearMonto(resumenReportes.kpis.consumoPromedioPorPersona)}
                              </div>
                            </IonCardContent>
                          </IonCard>
                          <IonCard className="kpi-card reportes-print-area" style={{ margin: 0 }}>
                            <IonCardContent style={{ padding: '14px' }}>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>Tiempo atención prom.</div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0891b2', marginTop: '2px' }}>
                                {ReportesService.formatearMinutos(resumenReportes.kpis.tiempoPromedioAtencionMinutos)}
                              </div>
                            </IonCardContent>
                          </IonCard>
                          <IonCard className="kpi-card reportes-print-area" style={{ margin: 0 }}>
                            <IonCardContent style={{ padding: '14px' }}>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>Impuestos</div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                                {ReportesService.formatearMonto(resumenReportes.kpis.totalImpuestos)}
                              </div>
                            </IonCardContent>
                          </IonCard>
                          <IonCard className="kpi-card reportes-print-area" style={{ margin: 0 }}>
                            <IonCardContent style={{ padding: '14px' }}>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>Descuentos</div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#dc2626', marginTop: '2px' }}>
                                {ReportesService.formatearMonto(resumenReportes.kpis.totalDescuentos)}
                              </div>
                            </IonCardContent>
                          </IonCard>
                          <IonCard className="kpi-card reportes-print-area" style={{ margin: 0 }}>
                            <IonCardContent style={{ padding: '14px' }}>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>Propinas</div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                                {ReportesService.formatearMonto(resumenReportes.kpis.totalPropinas)}
                              </div>
                            </IonCardContent>
                          </IonCard>
                        </div>

                        {/* Top productos */}
                        <IonCard className="section-card reportes-print-area">
                          <IonCardHeader className="section-header section-header-sm">
                            <div className="section-title small">Top productos vendidos</div>
                          </IonCardHeader>
                          <IonCardContent>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {resumenReportes.topProductos.map((p, i) => (
                                <div key={p.productoId} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: i < 3 ? '#f59e0b' : '#e5e7eb', color: i < 3 ? '#fff' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                                    {i + 1}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{p.categoriaNombre} · {ReportesService.formatearNumero(p.cantidad)} uds.</div>
                                  </div>
                                  <div style={{ fontWeight: 700, color: '#059669', fontSize: '14px' }}>
                                    {ReportesService.formatearMonto(p.ingreso)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </IonCardContent>
                        </IonCard>

                        {/* Tipo de consumo */}
                        {resumenReportes.ventasPorTipoConsumo.length > 0 && (
                          <IonCard className="section-card reportes-print-area">
                            <IonCardHeader className="section-header section-header-sm">
                              <div className="section-title small">Ventas por tipo de consumo</div>
                            </IonCardHeader>
                            <IonCardContent>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {resumenReportes.ventasPorTipoConsumo.map((t) => (
                                  <div key={t.tipoConsumo}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                      <span style={{ fontWeight: 600, fontSize: '13px' }}>{ReportesService.etiquetaTipoConsumo(t.tipoConsumo)}</span>
                                      <span style={{ fontSize: '13px' }}>
                                        <b style={{ color: '#059669' }}>{ReportesService.formatearMonto(t.ingreso)}</b>
                                        <span style={{ color: '#6b7280' }}> · {t.cantidad} comandas</span>
                                      </span>
                                    </div>
                                    <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${Math.min(t.porcentaje, 100)}%`, background: 'linear-gradient(90deg, #a855f7, #7c3aed)', borderRadius: '4px' }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </IonCardContent>
                          </IonCard>
                        )}
                      </>
                    )}

                    {/* PESTAÑA PRODUCTOS */}
                    {tabReportes === 'PRODUCTOS' && (
                      <IonCard className="section-card reportes-print-area">
                        <IonCardHeader className="section-header section-header-sm">
                          <div className="section-title small">Detalle de productos vendidos ({resumenReportes.todosProductos.length})</div>
                        </IonCardHeader>
                        <IonCardContent style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ textAlign: 'left', padding: '8px', color: '#6b7280' }}>Producto</th>
                                <th style={{ textAlign: 'left', padding: '8px', color: '#6b7280' }}>Categoría</th>
                                <th style={{ textAlign: 'right', padding: '8px', color: '#6b7280' }}>Cant.</th>
                                <th style={{ textAlign: 'right', padding: '8px', color: '#6b7280' }}>Ingreso</th>
                                <th style={{ textAlign: 'right', padding: '8px', color: '#6b7280' }}>Costo</th>
                                <th style={{ textAlign: 'right', padding: '8px', color: '#6b7280' }}>Ganancia</th>
                                <th style={{ textAlign: 'right', padding: '8px', color: '#6b7280' }}>Margen</th>
                              </tr>
                            </thead>
                            <tbody>
                              {resumenReportes.todosProductos.map((p) => (
                                <tr key={p.productoId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                  <td style={{ padding: '8px', fontWeight: 500 }}>{p.nombre}</td>
                                  <td style={{ padding: '8px', color: '#6b7280' }}>{p.categoriaNombre}</td>
                                  <td style={{ padding: '8px', textAlign: 'right' }}>{ReportesService.formatearNumero(p.cantidad)}</td>
                                  <td style={{ padding: '8px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>{ReportesService.formatearMonto(p.ingreso)}</td>
                                  <td style={{ padding: '8px', textAlign: 'right', color: '#6b7280' }}>{ReportesService.formatearMonto(p.costoEstimado)}</td>
                                  <td style={{ padding: '8px', textAlign: 'right', color: p.ganancia >= 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>{ReportesService.formatearMonto(p.ganancia)}</td>
                                  <td style={{ padding: '8px', textAlign: 'right' }}>
                                    <span style={{ color: p.margenPorcentaje >= 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>{p.margenPorcentaje.toFixed(1)}%</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{ borderTop: '2px solid #e5e7eb', fontWeight: 700 }}>
                                <td style={{ padding: '8px' }} colSpan={2}>TOTAL</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{ReportesService.formatearNumero(resumenReportes.kpis.totalProductosVendidos)}</td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#059669' }}>{ReportesService.formatearMonto(resumenReportes.kpis.totalVentas)}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{ReportesService.formatearMonto(resumenReportes.todosProductos.reduce((s, p) => s + p.costoEstimado, 0))}</td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#059669' }}>{ReportesService.formatearMonto(resumenReportes.kpis.gananciaEstimada)}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{resumenReportes.kpis.totalVentas > 0 ? ((resumenReportes.kpis.gananciaEstimada / resumenReportes.kpis.totalVentas) * 100).toFixed(1) : 0}%</td>
                              </tr>
                            </tfoot>
                          </table>
                        </IonCardContent>
                      </IonCard>
                    )}

                    {/* PESTAÑA CATEGORÍAS */}
                    {tabReportes === 'CATEGORIAS' && (
                      <IonCard className="section-card reportes-print-area">
                        <IonCardHeader className="section-header section-header-sm">
                          <div className="section-title small">Ventas por categoría</div>
                        </IonCardHeader>
                        <IonCardContent>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {resumenReportes.ventasPorCategoria.map((c) => (
                              <div key={c.categoriaId}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{c.categoriaNombre}</span>
                                  <span style={{ fontSize: '13px' }}>
                                    <b style={{ color: '#059669' }}>{ReportesService.formatearMonto(c.ingreso)}</b>
                                    <span style={{ color: '#6b7280' }}> · {c.porcentaje.toFixed(1)}% · {ReportesService.formatearNumero(c.cantidad)} uds.</span>
                                  </span>
                                </div>
                                <div style={{ height: '12px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${Math.min(c.porcentaje, 100)}%`, background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: '4px' }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </IonCardContent>
                      </IonCard>
                    )}

                    {/* PESTAÑA MÉTODOS DE PAGO */}
                    {tabReportes === 'PAGOS' && (
                      <IonCard className="section-card reportes-print-area">
                        <IonCardHeader className="section-header section-header-sm">
                          <div className="section-title small">Métodos de pago</div>
                        </IonCardHeader>
                        <IonCardContent>
                          {resumenReportes.ventasPorMetodoPago.length === 0 ? (
                            <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No hay datos de métodos de pago.</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {resumenReportes.ventasPorMetodoPago.map((m) => (
                                <div key={m.metodoPago}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{ReportesService.etiquetaMetodoPago(m.metodoPago)}</span>
                                    <span style={{ fontSize: '13px' }}>
                                      <b style={{ color: '#059669' }}>{ReportesService.formatearMonto(m.monto)}</b>
                                      <span style={{ color: '#6b7280' }}> · {m.porcentaje.toFixed(1)}% · {m.cantidad} ops.</span>
                                    </span>
                                  </div>
                                  <div style={{ height: '12px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(m.porcentaje, 100)}%`, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', borderRadius: '4px' }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </IonCardContent>
                      </IonCard>
                    )}

                    {/* PESTAÑA MOZOS */}
                    {tabReportes === 'MOZOS' && (
                      <IonCard className="section-card reportes-print-area">
                        <IonCardHeader className="section-header section-header-sm">
                          <div className="section-title small">Desempeño por mozo</div>
                        </IonCardHeader>
                        <IonCardContent style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ textAlign: 'left', padding: '8px', color: '#6b7280' }}>Mozo</th>
                                <th style={{ textAlign: 'right', padding: '8px', color: '#6b7280' }}>Comandas</th>
                                <th style={{ textAlign: 'right', padding: '8px', color: '#6b7280' }}>Ventas</th>
                                <th style={{ textAlign: 'right', padding: '8px', color: '#6b7280' }}>Ticket prom.</th>
                                <th style={{ textAlign: 'right', padding: '8px', color: '#6b7280' }}>% del total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {resumenReportes.ventasPorMozo.map((m) => (
                                <tr key={m.mozoId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                  <td style={{ padding: '8px', fontWeight: 500 }}>{m.mozoNombre}</td>
                                  <td style={{ padding: '8px', textAlign: 'right' }}>{m.cantidadComandas}</td>
                                  <td style={{ padding: '8px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>{ReportesService.formatearMonto(m.ventas)}</td>
                                  <td style={{ padding: '8px', textAlign: 'right' }}>{ReportesService.formatearMonto(m.ticketPromedio)}</td>
                                  <td style={{ padding: '8px', textAlign: 'right' }}>{resumenReportes.kpis.totalVentas > 0 ? ((m.ventas / resumenReportes.kpis.totalVentas) * 100).toFixed(1) : 0}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </IonCardContent>
                      </IonCard>
                    )}

                    {/* PESTAÑA TENDENCIA */}
                    {tabReportes === 'TENDENCIA' && (
                      <>
                        {/* Ventas por día */}
                        <IonCard className="section-card reportes-print-area">
                          <IonCardHeader className="section-header section-header-sm">
                            <div className="section-title small">Ventas por día</div>
                          </IonCardHeader>
                          <IonCardContent>
                            {(() => {
                              const maxVenta = Math.max(...resumenReportes.ventasPorFecha.map((v) => v.ventas), 1);
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {resumenReportes.ventasPorFecha.map((v) => (
                                    <div key={v.fecha}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{v.fechaLabel}</span>
                                        <span style={{ fontSize: '13px' }}>
                                          <b style={{ color: '#059669' }}>{ReportesService.formatearMonto(v.ventas)}</b>
                                          <span style={{ color: '#6b7280' }}> · {v.cantidadComandas} comandas</span>
                                        </span>
                                      </div>
                                      <div style={{ height: '10px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${(v.ventas / maxVenta) * 100}%`, background: 'linear-gradient(90deg, #06b6d4, #0891b2)', borderRadius: '4px' }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </IonCardContent>
                        </IonCard>

                        {/* Ventas por hora */}
                        <IonCard className="section-card reportes-print-area">
                          <IonCardHeader className="section-header section-header-sm">
                            <div className="section-title small">Ventas por hora del día</div>
                          </IonCardHeader>
                          <IonCardContent>
                            {(() => {
                              const maxVenta = Math.max(...resumenReportes.ventasPorHora.map((v) => v.ventas), 1);
                              return (
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '160px', overflowX: 'auto' }}>
                                  {resumenReportes.ventasPorHora.map((v) => (
                                    <div key={v.hora} style={{ flex: '1 1 40px', minWidth: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                      <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600 }}>{ReportesService.formatearMonto(v.ventas).replace('S/', '')}</div>
                                      <div style={{ width: '100%', height: `${(v.ventas / maxVenta) * 120}px`, minHeight: '4px', background: 'linear-gradient(180deg, #f59e0b, #d97706)', borderRadius: '4px 4px 0 0' }} />
                                      <div style={{ fontSize: '10px', color: '#6b7280' }}>{v.horaLabel}</div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </IonCardContent>
                        </IonCard>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

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
        <IonModal isOpen={modalAbierto} onDidDismiss={() => { setModalAbierto(false); setHabSeleccionadaId(''); }}
          // @ts-expect-error cssClass works at runtime
          cssClass="modal-fit modal-form">
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
          onDidDismiss={() => { setModalProdAbierto(false); setProdSeleccionadoId(''); }}
          // @ts-expect-error cssClass works at runtime
          cssClass="modal-fit modal-form"
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
          <div style={{ background: '#f7f9fc', padding: 10, overflowY: 'auto', maxHeight: 'calc(96vh - 50px)' }}>
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
                        placeholder="Automático"
                        value={formProd.codigo}
                        readonly
                        disabled
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
                          const nuevoCodigo = (!editandoProdId && nuevaCatId) ? generarCodigoUnico(nuevaCatId) : formProd.codigo;
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
                  <IonCol size="12" sizeMd="4">
                    <IonItem className="form-item" lines="none" style={{ '--min-height': '40px', '--padding-start': 4, '--padding-end': 4 }}>
                      <IonSelect
                        label="Estado"
                        labelPlacement="stacked"
                        value={formProd.estado}
                        onIonChange={(e: any) => setFormProd({ ...formProd, estado: e.target.value as any })}
                      >
                        <IonSelectOption value="ACTIVO">✅ ACTIVO</IonSelectOption>
                        <IonSelectOption value="INACTIVO">⛔ INACTIVO</IonSelectOption>
                      </IonSelect>
                    </IonItem>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>

            {/* ===== SECCIÓN 3 · PRECIOS Y STOCK ===== */}
            <div className="modal-section" style={{ marginBottom: 8, padding: 10, background: '#fff', borderRadius: 10 }}>
              <div className="modal-section-title" style={{ fontSize: 11, marginBottom: 8, marginTop: 0 }}>
                <IonIcon icon={cash} style={{ fontSize: 13 }} />&nbsp;PRECIOS · COSTO · STOCK
              </div>
              <IonGrid style={{ padding: 0 }}>
                <IonRow>
                  <IonCol size="6">
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
                  <IonCol size="6">
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
                </IonRow>
                {Number(formProd.precioVentaBase || 0) > 0 && (
                  <div style={{ fontSize: 11, color: '#666', margin: '2px 4px 6px' }}>
                    Ganancia: <strong style={{ color: '#2dd36f' }}>{fmtSoles(Number(formProd.precioVentaBase || 0) - Number(formProd.costoAproximado || 0))}</strong>
                    ({Math.round(((Number(formProd.precioVentaBase || 0) - Number(formProd.costoAproximado || 0)) / Number(formProd.precioVentaBase || 1)) * 100)}%)
                  </div>
                )}

                {/* Checkbox: Controlar inventario */}
                <IonItem lines="none" style={{ '--min-height': '40px', '--padding-start': 0, '--padding-end': 0, marginBottom: formProd.stockControl ? 6 : 0 }}>
                  <IonCheckbox
                    slot="start"
                    checked={formProd.stockControl}
                    onIonChange={(e: any) => setFormProd({ ...formProd, stockControl: e.detail.checked, stockActual: e.detail.checked ? formProd.stockActual : 0, stockMinimo: e.detail.checked ? formProd.stockMinimo : 0 })}
                  />
                  <IonLabel style={{ fontSize: 13 }}>
                    <strong>Controlar inventario</strong>
                    <div style={{ fontSize: 11, color: '#666', fontWeight: 'normal' }}>
                      {formProd.stockControl ? 'Se contará físicamente y se descontará al venderse' : 'Producto preparado (no se controla stock)'}
                    </div>
                  </IonLabel>
                </IonItem>

                {formProd.stockControl && (
                <IonRow>
                  <IonCol size="6">
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
                  <IonCol size="6">
                    <div className="stock-input-card stock-input-warning" style={{ padding: 6, borderRadius: 8 }}>
                      <div className="stock-input-label" style={{ fontSize: 11, marginBottom: 2 }}>Stock mínimo</div>
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
                )}
              </IonGrid>
            </div>

          </div>
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

        {/* ============ MODAL: Detalle Habitación ============ */}
        {/* @ts-expect-error cssClass works at runtime for Ionic modals */}
        <IonModal isOpen={!!habDetalle} onDidDismiss={() => setHabDetalle(null)} cssClass="modal-fit">
          <IonHeader className="ion-no-border">
            <IonToolbar color="primary">
              <IonButtons slot="start">
                <IonButton onClick={() => setHabDetalle(null)}>
                  <IonIcon slot="icon-only" icon={close} />
                </IonButton>
              </IonButtons>
              <IonTitle>{habDetalle?.codigo} · {habDetalle?.nombre}</IonTitle>
            </IonToolbar>
          </IonHeader>
          <div style={{ overflowY: 'auto', maxHeight: '70vh', padding: '4px 0' }}>
            {habDetalle && (() => {
              const tipo = tiposHab.find((t) => t.id === habDetalle.tipoHabitacionId);
              const hAny = habDetalle as any;
              const capHab = Number(hAny.capacidadMaximaPax ?? hAny.capacidadPersonas ?? 2);
              const precio = precioTipo(habDetalle.tipoHabitacionId);
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
              const cambiarEstado = (estado: EstadoHabitacion) => {
                HabitacionService.cambiarEstado(habDetalle.id, estado, sesion?.id || 'perfil');
                setHabsAdmin((prev) => prev.map((h) => (h.id === habDetalle.id ? { ...h, estado } as Habitacion : h)));
                setHabDetalle(null);
              };
              return (
                <>
                  <IonList lines="inset">
                    <IonItem><IonLabel><h2>Tipo</h2><p>{tipo?.nombre || 'Sin tipo'}</p></IonLabel></IonItem>
                    <IonItem><IonLabel><h2>Capacidad</h2><p>{capHab} personas</p></IonLabel></IonItem>
                    <IonItem><IonLabel><h2>Tarifa / noche</h2><p>{fmtSoles(precio)}</p></IonLabel></IonItem>
                    {habDetalle.piso && <IonItem><IonLabel><h2>Piso</h2><p>{habDetalle.piso}</p></IonLabel></IonItem>}
                    {habDetalle.ubicacion && <IonItem><IonLabel><h2>Ubicación</h2><p>{habDetalle.ubicacion}</p></IonLabel></IonItem>}
                    <IonItem>
                      <IonLabel><h2>Estado actual</h2></IonLabel>
                      <IonBadge color={colorEstado[habDetalle.estado]} slot="end">{estadoLbl[habDetalle.estado]}</IonBadge>
                    </IonItem>
                  </IonList>

                  {puedeCambiarEstadoHab && (
                    <>
                      <IonItemDivider className="ion-padding-top">Cambiar estado</IonItemDivider>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 16px' }}>
                        <IonButton color="success" fill="outline" onClick={() => cambiarEstado('DISPONIBLE')}>Libre</IonButton>
                        <IonButton color="danger" fill="outline" onClick={() => cambiarEstado('OCUPADA')}>Ocupada</IonButton>
                        <IonButton color="warning" fill="outline" onClick={() => cambiarEstado('LIMPIEZA')}>Limpieza</IonButton>
                        <IonButton color="medium" fill="outline" onClick={() => cambiarEstado('MANTENIMIENTO')}>Mantenimiento</IonButton>
                      </div>
                    </>
                  )}

                  {puedeGestionarHab && (
                    <div style={{ display: 'flex', gap: 8, padding: '16px', marginTop: 8 }}>
                      <IonButton expand="block" color="primary" onClick={() => { setHabDetalle(null); abrirEditar(habDetalle); }}>
                        <IonIcon slot="start" icon={create} />Editar
                      </IonButton>
                      <IonButton expand="block" color="danger" onClick={() => { setConfirmBorrar({ id: habDetalle.id, codigo: habDetalle.codigo }); setHabDetalle(null); }}>
                        <IonIcon slot="start" icon={trash} />Eliminar
                      </IonButton>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </IonModal>

        {/* ============ MODAL: Detalle Producto ============ */}
        {/* @ts-expect-error cssClass works at runtime for Ionic modals */}
        <IonModal isOpen={!!prodDetalle} onDidDismiss={() => setProdDetalle(null)} cssClass="modal-fit">
          <IonHeader className="ion-no-border">
            <IonToolbar color="primary">
              <IonButtons slot="start">
                <IonButton onClick={() => setProdDetalle(null)}>
                  <IonIcon slot="icon-only" icon={close} />
                </IonButton>
              </IonButtons>
              <IonTitle>{prodDetalle?.codigo} · {prodDetalle?.nombre}</IonTitle>
            </IonToolbar>
          </IonHeader>
          <div style={{ overflowY: 'auto', maxHeight: '70vh', padding: '4px 0' }}>
            {prodDetalle && (() => {
              const plano = stockPlanoProd(prodDetalle);
              const cat = categoriasFB.find((c) => c.id === prodDetalle.categoriaId);
              const precioGanancia = Number(prodDetalle.precioVentaBase || 0) - Number(prodDetalle.costoAproximado || 0);
              const pctGan = Number(prodDetalle.precioVentaBase || 0) > 0
                ? Math.round((precioGanancia / Number(prodDetalle.precioVentaBase || 1)) * 100)
                : 0;
              return (
                <>
                  <IonList lines="inset">
                    <IonItem><IonLabel><h2>Categoría</h2><p>{cat?.nombre || 'Sin categoría'}</p></IonLabel></IonItem>
                    <IonItem><IonLabel><h2>Precio de venta</h2><p>{fmtSoles(prodDetalle.precioVentaBase)}</p></IonLabel></IonItem>
                    <IonItem><IonLabel><h2>Costo</h2><p>{fmtSoles(prodDetalle.costoAproximado)}</p></IonLabel></IonItem>
                    <IonItem><IonLabel><h2>Ganancia</h2><p style={{ color: pctGan >= 40 ? '#2dd36f' : pctGan >= 20 ? '#ffc409' : '#eb445a' }}>{fmtSoles(precioGanancia)} ({pctGan}% margen)</p></IonLabel></IonItem>
                    <IonItem><IonLabel><h2>Unidad</h2><p>{prodDetalle.unidadMedida || 'UND'}</p></IonLabel></IonItem>
                    <IonItem>
                      <IonLabel><h2>Stock</h2></IonLabel>
                      <IonBadge color={plano.stockControl ? (plano.stockActual <= (plano.stockMinimo || 0) ? 'warning' : 'success') : 'medium'} slot="end">
                        {plano.stockControl ? `${fmtNum(plano.stockActual)} uds (mín: ${fmtNum(plano.stockMinimo)})` : 'Sin control'}
                      </IonBadge>
                    </IonItem>
                    <IonItem>
                      <IonLabel><h2>Estado</h2></IonLabel>
                      <IonBadge color={prodDetalle.estado === 'ACTIVO' ? 'success' : 'medium'} slot="end">{prodDetalle.estado || 'ACTIVO'}</IonBadge>
                    </IonItem>
                  </IonList>

                  {puedeGestionarStock && plano.stockControl && (
                    <div style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
                      <IonButton expand="block" color="success" fill="outline" onClick={() => { setProdDetalle(null); abrirStockAgregar(prodDetalle); }}>
                        <IonIcon slot="start" icon={addCircle} />Agregar stock
                      </IonButton>
                      <IonButton expand="block" color="warning" fill="outline" onClick={() => { setProdDetalle(null); abrirStockQuitar(prodDetalle); }}>
                        <IonIcon slot="start" icon={removeCircle} />Quitar stock
                      </IonButton>
                    </div>
                  )}

                  {puedeGestionarProd && (
                    <div style={{ display: 'flex', gap: 8, padding: '16px', marginTop: 8 }}>
                      <IonButton expand="block" color="primary" onClick={() => { setProdDetalle(null); abrirEditarProd(prodDetalle); }}>
                        <IonIcon slot="start" icon={create} />Editar
                      </IonButton>
                      <IonButton expand="block" color="danger" onClick={() => { setConfirmBorrarProd({ id: prodDetalle.id, nombre: prodDetalle.nombre }); setProdDetalle(null); }}>
                        <IonIcon slot="start" icon={trash} />Eliminar
                      </IonButton>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </IonModal>

        {/* ============ MODAL: Nuevo / Editar USUARIO ============ */}
        <IonModal
          isOpen={modalUsuarioAbierto}
          onDidDismiss={() => { setModalUsuarioAbierto(false); setEditandoUsuarioId(null); }}
          // @ts-expect-error cssClass works at runtime
          cssClass="modal-fit modal-form"
        >
          <IonHeader className="ion-no-border">
            <IonToolbar color="primary" style={{ '--min-height': '44px' }}>
              <IonButtons slot="start">
                <IonButton onClick={() => setModalUsuarioAbierto(false)}>
                  <IonIcon slot="icon-only" icon={close} />
                </IonButton>
              </IonButtons>
              <IonTitle style={{ fontSize: 15 }}>
                <IonIcon icon={people} />&nbsp;{editandoUsuarioId ? 'Editar usuario' : 'Nuevo usuario'}
              </IonTitle>
              <IonButtons slot="end">
                <IonButton color="light" size="small" onClick={() => setModalUsuarioAbierto(false)}>Cancelar</IonButton>
                <IonButton strong size="small" onClick={guardarUsuario} disabled={usuarioProcesando}>
                  <IonIcon slot="start" icon={save} />{usuarioProcesando ? '...' : ' Guardar'}
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <div style={{ background: '#f7f9fc', padding: 12, overflowY: 'auto', maxHeight: 'calc(96vh - 50px)' }}>
            <div style={{ padding: 10, background: '#fff', borderRadius: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>DATOS PERSONALES</div>
              <IonGrid style={{ padding: 0 }}>
                <IonRow>
                  <IonCol size="12" sizeMd="6">
                    <IonItem className="form-item" lines="none" style={{ '--min-height': '40px', '--padding-start': 4, '--padding-end': 4 }}>
                      <IonInput label="Nombres" labelPlacement="stacked" value={formUsuario.nombres}
                        onIonInput={(e) => setFormUsuario({ ...formUsuario, nombres: (e.target as HTMLIonInputElement).value as string })} />
                    </IonItem>
                  </IonCol>
                  <IonCol size="12" sizeMd="6">
                    <IonItem className="form-item" lines="none" style={{ '--min-height': '40px', '--padding-start': 4, '--padding-end': 4 }}>
                      <IonInput label="Apellidos" labelPlacement="stacked" value={formUsuario.apellidos}
                        onIonInput={(e) => setFormUsuario({ ...formUsuario, apellidos: (e.target as HTMLIonInputElement).value as string })} />
                    </IonItem>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="12" sizeMd="6">
                    <IonItem className="form-item" lines="none" style={{ '--min-height': '40px', '--padding-start': 4, '--padding-end': 4 }}>
                      <IonInput label="Email (opcional)" labelPlacement="stacked" type="email" value={formUsuario.correo_electronico}
                        onIonInput={(e) => setFormUsuario({ ...formUsuario, correo_electronico: (e.target as HTMLIonInputElement).value as string })} />
                    </IonItem>
                  </IonCol>
                  <IonCol size="12" sizeMd="6">
                    <IonItem className="form-item" lines="none" style={{ '--min-height': '40px', '--padding-start': 4, '--padding-end': 4 }}>
                      <IonInput label="Teléfono (opcional)" labelPlacement="stacked" value={formUsuario.telefono}
                        onIonInput={(e) => setFormUsuario({ ...formUsuario, telefono: (e.target as HTMLIonInputElement).value as string })} />
                    </IonItem>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>

            <div style={{ padding: 10, background: '#fff', borderRadius: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>ACCESO AL SISTEMA</div>
              <IonGrid style={{ padding: 0 }}>
                <IonRow>
                  <IonCol size="12" sizeMd="6">
                    <IonItem className="form-item" lines="none" style={{ '--min-height': '40px', '--padding-start': 4, '--padding-end': 4 }}>
                      <IonInput label="Nombre de usuario" labelPlacement="stacked" value={formUsuario.username}
                        onIonInput={(e) => setFormUsuario({ ...formUsuario, username: (e.target as HTMLIonInputElement).value as string })} />
                    </IonItem>
                  </IonCol>
                  <IonCol size="12" sizeMd="6">
                    <IonItem className="form-item" lines="none" style={{ '--min-height': '40px', '--padding-start': 4, '--padding-end': 4 }}>
                      <IonSelect label="Rol" labelPlacement="stacked" value={formUsuario.rol_id}
                        onIonChange={(e) => setFormUsuario({ ...formUsuario, rol_id: e.detail.value })}>
                        {rolesLista.map((r) => (
                          <IonSelectOption key={r.id} value={r.id}>{r.nombre}</IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="12">
                    <IonItem className="form-item" lines="none" style={{ '--min-height': '40px', '--padding-start': 4, '--padding-end': 4 }}>
                      <IonInput
                        label={editandoUsuarioId ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña (mín 4 caracteres)'}
                        labelPlacement="stacked" type="password" value={formUsuario.password}
                        onIonInput={(e) => setFormUsuario({ ...formUsuario, password: (e.target as HTMLIonInputElement).value as string })} />
                    </IonItem>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>

            {usuarioMensaje && (
              <div style={{
                background: usuarioMensaje.tipo === 'ok' ? '#ecfdf5' : '#fef2f2',
                color: usuarioMensaje.tipo === 'ok' ? '#047857' : '#b91c1c',
                padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 10,
                border: `1px solid ${usuarioMensaje.tipo === 'ok' ? '#a7f3d0' : '#fecaca'}`,
              }}>
                {usuarioMensaje.texto}
              </div>
            )}
          </div>
        </IonModal>

      </IonContent>
    </IonPage>
  );
};

export default PerfilPage;
