import React, { useState } from 'react';
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
} from '@ionic/react';
import {
  add, create, trash, save, close, bedOutline, buildOutline, pricetag,
  cube, addCircle, removeCircle, archive, restaurant,
} from 'ionicons/icons';
import { Usuario, Rol, RolUsuario, ModuloPermiso, Moneda, AuditFields, Habitacion, TipoHabitacion, EstadoHabitacion } from '../../types';
import { HabitacionService, CatalogoFBService, InventarioService, type MoverStockResult } from '../../services';
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
  const cargarCatProd = () => {
    try { setCategoriasFB(CatalogoFBService.listarCategorias() || []); } catch { setCategoriasFB([]); }
    try { setProductosFB(CatalogoFBService.listarProductos({ soloActivos: false }) || []); } catch { setProductosFB([]); }
  };

  useIonViewWillEnter(() => { cargarHabs(); cargarCatProd(); });

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
        mostrarToast(`No se puede eliminar: ${prodsUso.length} producto(s) usan esta categoría.`);
        setConfirmBorrarCat(null);
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
    setFormProd({
      ...FORM_VACIO_PROD,
      categoriaId: categoriasFB[0]?.id || '',
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
      const data = {
        ...formProd,
        codigo: (formProd.codigo || formProd.nombre).trim(),
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
          <IonTitle>Perfil</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Perfil y Panel Admin</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonCard className="profile-card">
          <IonCardHeader className="profile-header">
            <IonAvatar className="profile-avatar">
              <div className="avatar-inner">{usuario.iniciales}</div>
            </IonAvatar>
            <div className="profile-info">
              <IonCardTitle>{usuario.nombres} {usuario.apellidos}</IonCardTitle>
              <IonBadge color="tertiary">{String(usuario.rol?.nombre ?? 'Administración').replace('_',' ')}</IonBadge>
            </div>
          </IonCardHeader>
          <IonCardContent>
            <p><strong>Sede:</strong> Casa Sumaq Allpa</p>
            <p><strong>Email:</strong> {usuario.correoElectronico}</p>
            {usuario.ultimoAcceso ? (
              <p><strong>Último acceso:</strong> {new Date(usuario.ultimoAcceso).toLocaleString('es-PE')}</p>
            ) : null}
            <p className="ion-text-color-danger">
              Recuerda: verifica siempre el badge <strong>"{usuario.iniciales}"</strong> antes de operaciones críticas.
            </p>
          </IonCardContent>
        </IonCard>

        {/* =============== PANEL ADMIN: GESTIÓN HABITACIONES =============== */}
        <IonCard className="admin-card">
          <IonCardHeader className="admin-header">
            <IonCardTitle>
              <IonIcon icon={buildOutline} className="admin-title-icon" />
              Panel de Administración
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent className="admin-content">
            <IonCard className="subcard">
              <IonCardHeader className="subcard-header">
                <IonCardTitle className="subcard-title">
                  <IonIcon icon={bedOutline} /> Gestión de Habitaciones
                  <IonNote slot="end" className="admin-count">{habsAdmin.length} / 5 fisicas</IonNote>
                </IonCardTitle>
                <IonButton size="small" color="success" onClick={abrirNuevo}>
                  <IonIcon slot="start" icon={add} /> Agregar
                </IonButton>
              </IonCardHeader>
              <IonCardContent className="admin-habs-list">
                {habsAdmin.length === 0 ? (
                  <div className="admin-empty">
                    <IonNote color="medium">No hay habitaciones. Pulsa <strong>Agregar</strong>.</IonNote>
                  </div>
                ) : (
                  <IonList inset lines="full">
                    {habsAdmin.map((h) => {
                      const precio = precioTipo(h.tipoHabitacionId);
                      const tipo = tiposHab.find((t) => t.id === h.tipoHabitacionId);
                      const colorEstado: Record<EstadoHabitacion, string> = {
                        LIBRE:'success', DISPONIBLE:'success', OCUPADA:'danger',
                        RESERVADA:'primary', BLOQUEADA:'medium', LIMPIEZA:'warning',
                        INSPECCIONADA:'tertiary', MANTENIMIENTO:'medium',
                      };
                      return (
                        <IonItem key={h.id} className="admin-hab-item">
                          <IonGrid className="hab-grid">
                            <IonRow>
                              <IonCol size="4" className="hab-col">
                                <div className="hab-codigo">{h.codigo}</div>
                                <div className="hab-nombre">{h.nombre}</div>
                              </IonCol>
                              <IonCol size="4" className="hab-col">
                                <IonBadge color={colorEstado[h.estado]} className="hab-badge">{h.estado}</IonBadge>
                                <IonNote className="hab-tipo">{tipo?.nombre || '—'}</IonNote>
                              </IonCol>
                              <IonCol size="2" className="hab-col hab-precio-col">
                                <div className="hab-precio">
                                  <IonIcon icon={pricetag} />
                                  <span>{fmtSoles(precio)}</span>
                                </div>
                              </IonCol>
                              <IonCol size="2" className="hab-col hab-actions-col">
                                <IonButton fill="clear" size="small" color="primary" onClick={() => abrirEditar(h)}>
                                  <IonIcon slot="icon-only" icon={create} />
                                </IonButton>
                                <IonButton fill="clear" size="small" color="danger" onClick={() => setConfirmBorrar({ id: h.id, codigo: h.codigo })}>
                                  <IonIcon slot="icon-only" icon={trash} />
                                </IonButton>
                              </IonCol>
                            </IonRow>
                          </IonGrid>
                        </IonItem>
                      );
                    })}
                  </IonList>
                )}
              </IonCardContent>
            </IonCard>

            {/* ============ 2DA SECCIÓN: GESTIÓN PRODUCTOS & STOCK (nueva) ============ */}
            <IonCard className="subcard stock-subcard">
              <IonCardHeader className="subcard-header">
                <IonCardTitle className="subcard-title">
                  <IonIcon icon={cube} /> Gestión Productos &amp; Stock
                  <IonNote slot="end" className="admin-count">{productosFB.length} prod · {categoriasFB.length} cat</IonNote>
                </IonCardTitle>
                <div className="stock-header-actions">
                  <IonButton size="small" color="tertiary" onClick={abrirNuevoCat}>
                    <IonIcon slot="start" icon={restaurant} /> Categoría
                  </IonButton>
                  <IonButton size="small" color="success" onClick={abrirNuevoProd}>
                    <IonIcon slot="start" icon={add} /> Producto
                  </IonButton>
                </div>
              </IonCardHeader>
              <IonCardContent className="admin-stock-content">

                {/* FILTROS */}
                <div className="stock-filters">
                  <IonSearchbar
                    placeholder="Buscar producto / código..."
                    value={busqProd}
                    onIonInput={(e: any) => setBusqProd(String(e.target.value || ''))}
                    className="stock-searchbar"
                    showCancelButton="never"
                    mode="md"
                    debounce={250}
                  />
                  <IonItem lines="none" className="stock-filtro-cat-item">
                    <IonSelect
                      label="Categoría"
                      labelPlacement="stacked"
                      value={filtroCatId}
                      placeholder="Todas las categorías"
                      onIonChange={(e: any) => setFiltroCatId(String(e.target.value || ''))}
                      interface="action-sheet"
                      className="stock-filtro-cat"
                    >
                      <IonSelectOption value="">Todas</IonSelectOption>
                      {(categoriasFB || []).map((c) => (
                        <IonSelectOption key={c.id} value={c.id}>{c.nombre}</IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                </div>

                {/* LISTA CATEGORIAS (rápido) */}
                {categoriasFB.length > 0 && (
                  <div className="stock-cat-chips">
                    <IonChip
                      outline={filtroCatId === ''}
                      color={filtroCatId === '' ? 'primary' : 'medium'}
                      onClick={() => setFiltroCatId('')}
                    >
                      Todas ({productosFB.length})
                    </IonChip>
                    {categoriasFB.map((c) => {
                      const cnt = productosFB.filter((p) => p.categoriaId === c.id).length;
                      return (
                        <IonChip
                          key={c.id}
                          outline={filtroCatId === c.id}
                          color={filtroCatId === c.id ? 'primary' : (c.estado === 'INACTIVO' ? 'medium' : 'tertiary')}
                          onClick={() => setFiltroCatId(filtroCatId === c.id ? '' : c.id)}
                        >
                          {c.nombre} ({cnt})
                          <IonButton
                            fill="clear" size="small" color="primary"
                            onClick={(ev: any) => { ev?.stopPropagation?.(); abrirEditarCat(c); }}
                            style={{ marginInlineStart: '4px', padding: 0, minWidth: 0 }}
                          >
                            <IonIcon slot="icon-only" icon={create} style={{ fontSize: '13px' }} />
                          </IonButton>
                          <IonButton
                            fill="clear" size="small" color="danger"
                            onClick={(ev: any) => { ev?.stopPropagation?.(); setConfirmBorrarCat({ id: c.id, nombre: c.nombre }); }}
                            style={{ marginInlineStart: '2px', padding: 0, minWidth: 0 }}
                          >
                            <IonIcon slot="icon-only" icon={trash} style={{ fontSize: '13px' }} />
                          </IonButton>
                        </IonChip>
                      );
                    })}
                  </div>
                )}

                {/* LISTA PRODUCTOS */}
                {productosFiltrados.length === 0 ? (
                  <div className="admin-empty">
                    <IonNote color="medium">
                      {categoriasFB.length === 0
                        ? 'Paso 1: crea una Categoría (Bebidas, Platos, etc.). Paso 2: crea Productos.'
                        : 'No hay productos que coincidan. Pulsa <strong>+ Producto</strong> para agregar.'}
                    </IonNote>
                  </div>
                ) : (
                  <IonList inset lines="full" className="stock-prod-list">
                    {productosFiltrados.map((p) => {
                      const plano = stockPlanoProd(p);
                      const cat = categoriasFB.find((c) => c.id === p.categoriaId);
                      const precioGanancia = Number(p.precioVentaBase || 0) - Number(p.costoAproximado || 0);
                      const colorStock =
                        !plano.stockControl ? 'medium' :
                        plano.stockActual < 0 ? 'danger' :
                        plano.stockActual < plano.stockMinimo ? 'warning' :
                        plano.stockActual === 0 ? 'medium' : 'success';
                      return (
                        <IonItem key={p.id} className="stock-prod-item">
                          <IonGrid className="stock-prod-grid">
                            <IonRow>
                              <IonCol size="5" className="stock-prod-col">
                                <div className="stock-prod-cod">{p.codigo || '—'}</div>
                                <div className="stock-prod-nombre">{p.nombre}</div>
                                <div className="stock-prod-meta">
                                  <IonChip color="light" outline className="stock-chip-mini">
                                    {cat?.nombre || 'Sin cat'}
                                  </IonChip>
                                  <IonChip color={p.estado === 'ACTIVO' ? 'success' : 'medium'} outline className="stock-chip-mini">
                                    {p.estado || 'ACTIVO'}
                                  </IonChip>
                                </div>
                              </IonCol>
                              <IonCol size="3" className="stock-prod-col stock-precios-col">
                                <div className="stock-precio">{fmtSoles(p.precioVentaBase)}</div>
                                <IonNote className="stock-costo">Costo {fmtSoles(p.costoAproximado)} · Gan. {fmtSoles(precioGanancia)}</IonNote>
                                <div className="stock-um">{p.unidadMedida || 'UND'}</div>
                              </IonCol>
                              <IonCol size="2" className="stock-prod-col stock-stock-col">
                                <IonBadge color={colorStock} className="stock-badge">
                                  <IonIcon icon={archive} />
                                  &nbsp;{plano.stockControl ? fmtNum(plano.stockActual) : 'N/A'}
                                </IonBadge>
                                {plano.stockControl && (
                                  <IonNote className="stock-min">
                                    Min {fmtNum(plano.stockMinimo)}
                                  </IonNote>
                                )}
                              </IonCol>
                              <IonCol size="2" className="stock-prod-col stock-actions-col">
                                <IonButton fill="clear" size="small" color="success" disabled={!plano.stockControl} onClick={() => abrirStockAgregar(p)} title="Agregar stock">
                                  <IonIcon slot="icon-only" icon={addCircle} />
                                </IonButton>
                                <IonButton fill="clear" size="small" color="warning" disabled={!plano.stockControl} onClick={() => abrirStockQuitar(p)} title="Quitar stock">
                                  <IonIcon slot="icon-only" icon={removeCircle} />
                                </IonButton>
                                <IonButton fill="clear" size="small" color="primary" onClick={() => abrirEditarProd(p)} title="Editar">
                                  <IonIcon slot="icon-only" icon={create} />
                                </IonButton>
                                <IonButton fill="clear" size="small" color="danger" onClick={() => setConfirmBorrarProd({ id: p.id, nombre: p.nombre })} title="Eliminar">
                                  <IonIcon slot="icon-only" icon={trash} />
                                </IonButton>
                              </IonCol>
                            </IonRow>
                          </IonGrid>
                        </IonItem>
                      );
                    })}
                  </IonList>
                )}

              </IonCardContent>
            </IonCard>
          </IonCardContent>
        </IonCard>

        <IonList inset>
          <IonItem button detail><IonLabel>Configuración de cuenta</IonLabel></IonItem>
          <IonItem button detail><IonLabel>Permisos y roles</IonLabel></IonItem>
          <IonItem button detail><IonLabel>Preferencias de notificaciones</IonLabel></IonItem>
          <IonItem button lines="none"><IonLabel className="ion-text-color-danger">Cerrar sesión</IonLabel></IonItem>
        </IonList>

        {toast && <div className="admin-toast">{toast}</div>}

        {/* ============ MODAL: Nueva / Editar Habitación ============ */}
        <IonModal isOpen={modalAbierto} onDidDismiss={() => setModalAbierto(false)} initialBreakpoint={0.88} breakpoints={[0, 0.5, 0.88, 1]}>
          <IonHeader className="ion-no-border">
            <IonToolbar color={editandoId ? 'primary' : 'success'}>
              <IonTitle>{editandoId ? 'Editar habitación' : 'Nueva habitación'}</IonTitle>
              <IonButtons slot="start">
                <IonButton onClick={() => setModalAbierto(false)}>
                  <IonIcon slot="icon-only" icon={close} />
                </IonButton>
              </IonButtons>
              <IonButtons slot="end">
                <IonButton color="light" onClick={() => setModalAbierto(false)}>Cancelar</IonButton>
                <IonButton strong onClick={guardarHab}>
                  <IonIcon slot="start" icon={save} />
                  Guardar
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList lines="inset">
              <IonItem>
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
              <IonItem>
                <IonInput
                  label="Nombre"
                  labelPlacement="stacked"
                  placeholder="Ej: Habitación Familiar"
                  value={form.nombre}
                  onIonInput={(e: any) => setForm({ ...form, nombre: String(e.target.value || '') })}
                />
              </IonItem>
              <IonItem>
                <IonSelect
                  label="Tipo habitación *"
                  labelPlacement="stacked"
                  value={form.tipoHabitacionId}
                  placeholder="Selecciona un tipo"
                  onIonChange={(e: any) => setForm({ ...form, tipoHabitacionId: e.target.value })}
                  interface="action-sheet"
                >
                  {(tiposHab || []).map((t) => (
                    <IonSelectOption key={t.id} value={t.id}>
                      {t.nombre}{t.precioBaseNoche ? `  ·  S/ ${t.precioBaseNoche}/noche` : ''}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonGrid className="hab-form-grid">
                <IonRow>
                  <IonCol size="6">
                    <IonItem>
                      <IonInput
                        label="Piso"
                        labelPlacement="stacked"
                        placeholder="Ej: 2"
                        value={form.piso}
                        onIonInput={(e: any) => setForm({ ...form, piso: String(e.target.value || '') })}
                      />
                    </IonItem>
                  </IonCol>
                  <IonCol size="6">
                    <IonItem>
                      <IonInput
                        label="Ubicación"
                        labelPlacement="stacked"
                        placeholder="Ej: Piso 2 · Frente"
                        value={form.ubicacion}
                        onIonInput={(e: any) => setForm({ ...form, ubicacion: String(e.target.value || '') })}
                      />
                    </IonItem>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="6">
                    <IonItem>
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
                  <IonCol size="6">
                    <IonItem>
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
                  <IonCol size="6">
                    <IonItem>
                      <IonInput
                        label="Capacidad máxima (pax) *"
                        labelPlacement="stacked"
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
                  </IonCol>
                  <IonCol size="6">
                    <IonItem lines="none">
                      <IonNote color="medium" className="capacidad-hint">
                        Indica cuántas personas pueden dormir en esta habitación (adultos + niños).
                      </IonNote>
                    </IonItem>
                  </IonCol>
                </IonRow>
              </IonGrid>
              <IonItem lines="none">
                <IonTextarea
                  label={form.estado === 'MANTENIMIENTO' ? 'Motivo mantenimiento / Notas internas' : 'Notas internas'}
                  labelPlacement="stacked"
                  rows={3}
                  placeholder={form.estado === 'MANTENIMIENTO' ? 'Ej: Calefón en reparación' : '(opcional)'}
                  value={form.notasInternas}
                  onIonInput={(e: any) => setForm({ ...form, notasInternas: String(e.target.value || '') })}
                />
              </IonItem>
            </IonList>
            <div className="hab-alert-actions-inline ion-padding-top">
              <IonButton size="default" color="medium" fill="outline" expand="block" onClick={() => setModalAbierto(false)}>
                <IonIcon slot="start" icon={close} /> Cancelar
              </IonButton>
              <IonButton size="default" color="success" expand="block" onClick={guardarHab}>
                <IonIcon slot="start" icon={save} /> Guardar habitación
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        {/* ============ MODAL: Nueva / Editar CATEGORIA ============ */}
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

        {/* ============ MODAL: Nueva / Editar PRODUCTO ============ */}
        <IonModal isOpen={modalProdAbierto} onDidDismiss={() => setModalProdAbierto(false)} initialBreakpoint={0.95} breakpoints={[0, 0.6, 0.95, 1]}>
          <IonHeader className="ion-no-border">
            <IonToolbar color={editandoProdId ? 'tertiary' : 'success'}>
              <IonTitle>{editandoProdId ? 'Editar producto' : 'Nuevo producto'}</IonTitle>
              <IonButtons slot="start">
                <IonButton onClick={() => setModalProdAbierto(false)}>
                  <IonIcon slot="icon-only" icon={close} />
                </IonButton>
              </IonButtons>
              <IonButtons slot="end">
                <IonButton strong onClick={guardarProd}>
                  <IonIcon slot="start" icon={save} /> Guardar
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList lines="inset">
              <IonGrid>
                <IonRow>
                  <IonCol size="5">
                    <IonItem>
                      <IonInput
                        label="Código"
                        labelPlacement="stacked"
                        placeholder="Ej: CUSQ-01"
                        value={formProd.codigo}
                        onIonInput={(e: any) => setFormProd({ ...formProd, codigo: String(e.target.value || '') })}
                      />
                    </IonItem>
                  </IonCol>
                  <IonCol size="7">
                    <IonItem>
                      <IonInput
                        label="Nombre *"
                        labelPlacement="stacked"
                        placeholder="Ej: Cusqueña Trigo 620ml"
                        value={formProd.nombre}
                        onIonInput={(e: any) => setFormProd({ ...formProd, nombre: String(e.target.value || '') })}
                      />
                    </IonItem>
                  </IonCol>
                </IonRow>
              </IonGrid>
              <IonItem lines="none">
                <IonTextarea
                  label="Descripción"
                  labelPlacement="stacked"
                  rows={2}
                  placeholder="(opcional) Descripción del producto"
                  value={formProd.descripcion}
                  onIonInput={(e: any) => setFormProd({ ...formProd, descripcion: String(e.target.value || '') })}
                />
              </IonItem>
              <IonItem>
                <IonSelect
                  label="Categoría *"
                  labelPlacement="stacked"
                  value={formProd.categoriaId}
                  placeholder="Selecciona categoría"
                  onIonChange={(e: any) => setFormProd({ ...formProd, categoriaId: e.target.value })}
                  interface="action-sheet"
                >
                  {(categoriasFB || []).map((c) => (
                    <IonSelectOption key={c.id} value={c.id}>{c.nombre}</IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonGrid>
                <IonRow>
                  <IonCol size="4">
                    <IonItem>
                      <IonInput
                        label="Precio venta (S/)"
                        labelPlacement="stacked"
                        type="number" step="0.01" inputMode="decimal"
                        placeholder="18.00"
                        value={formProd.precioVentaBase}
                        onIonInput={(e: any) => setFormProd({ ...formProd, precioVentaBase: Number(e.target.value || 0) })}
                      />
                    </IonItem>
                  </IonCol>
                  <IonCol size="4">
                    <IonItem>
                      <IonInput
                        label="Costo aprox (S/)"
                        labelPlacement="stacked"
                        type="number" step="0.01" inputMode="decimal"
                        placeholder="10.50"
                        value={formProd.costoAproximado}
                        onIonInput={(e: any) => setFormProd({ ...formProd, costoAproximado: Number(e.target.value || 0) })}
                      />
                    </IonItem>
                  </IonCol>
                  <IonCol size="4">
                    <IonItem>
                      <IonInput
                        label="Unidad medida"
                        labelPlacement="stacked"
                        placeholder="UND / L / KG"
                        value={formProd.unidadMedida}
                        onIonInput={(e: any) => setFormProd({ ...formProd, unidadMedida: String(e.target.value || 'UND').toUpperCase() })}
                      />
                    </IonItem>
                  </IonCol>
                </IonRow>
              </IonGrid>
              <IonItem>
                <IonSelect
                  label="Estado"
                  labelPlacement="stacked"
                  value={formProd.estado}
                  onIonChange={(e: any) => setFormProd({ ...formProd, estado: e.target.value as any })}
                >
                  <IonSelectOption value="ACTIVO">ACTIVO (visible en POS)</IonSelectOption>
                  <IonSelectOption value="INACTIVO">INACTIVO (oculto)</IonSelectOption>
                </IonSelect>
              </IonItem>

              {/* ===== Segment Control STOCK ===== */}
              <IonItem lines="none" className="stock-control-segment-item">
                <IonLabel className="stock-label-block">¿Controlar stock?</IonLabel>
                <IonSegment
                  value={formProd.stockControl ? 'SI' : 'NO'}
                  onIonChange={(e: any) => setFormProd({ ...formProd, stockControl: e.target.value === 'SI' })}
                  className="stock-segment"
                >
                  <IonSegmentButton value="NO" color="medium">
                    <IonLabel>NO</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="SI" color="success">
                    <IonLabel>SÍ</IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              </IonItem>

              {formProd.stockControl && (
                <IonGrid>
                  <IonRow>
                    <IonCol size="6">
                      <IonItem>
                        <IonInput
                          label="Stock actual"
                          labelPlacement="stacked"
                          type="number" step="1" min="0" inputMode="numeric"
                          placeholder="0"
                          value={formProd.stockActual}
                          onIonInput={(e: any) => setFormProd({ ...formProd, stockActual: Number(e.target.value || 0) })}
                        />
                      </IonItem>
                    </IonCol>
                    <IonCol size="6">
                      <IonItem>
                        <IonInput
                          label="Stock mínimo (alerta)"
                          labelPlacement="stacked"
                          type="number" step="1" min="0" inputMode="numeric"
                          placeholder="6"
                          value={formProd.stockMinimo}
                          onIonInput={(e: any) => setFormProd({ ...formProd, stockMinimo: Number(e.target.value || 0) })}
                        />
                      </IonItem>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              )}

              <IonItem lines="none">
                <IonTextarea
                  label="Observaciones internas"
                  labelPlacement="stacked"
                  rows={2}
                  placeholder="(opcional) Proveedor, códigos internos, etc."
                  value={formProd.observaciones}
                  onIonInput={(e: any) => setFormProd({ ...formProd, observaciones: String(e.target.value || '') })}
                />
              </IonItem>
            </IonList>
          </IonContent>
        </IonModal>

        {/* ============ MODAL: Agregar / Quitar Stock ============ */}
        <IonModal isOpen={modalStockAbierto} onDidDismiss={() => setModalStockAbierto(false)} initialBreakpoint={0.65} breakpoints={[0, 0.5, 0.65, 1]}>
          <IonHeader className="ion-no-border">
            <IonToolbar color={formStock.modo === 'AGREGAR' ? 'success' : 'warning'}>
              <IonTitle>
                <IonIcon slot="start" icon={formStock.modo === 'AGREGAR' ? addCircle : removeCircle} />
                &nbsp;{formStock.modo === 'AGREGAR' ? 'Agregar stock' : 'Quitar stock'}
              </IonTitle>
              <IonButtons slot="start">
                <IonButton onClick={() => setModalStockAbierto(false)}>
                  <IonIcon slot="icon-only" icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {formStock.productoNombre && (
              <IonCard className="stock-target-card">
                <IonCardContent className="ion-no-padding">
                  <strong>Producto:</strong> {formStock.productoNombre}
                </IonCardContent>
              </IonCard>
            )}
            <IonList lines="inset">
              <IonItem>
                <IonInput
                  label={formStock.modo === 'AGREGAR' ? 'Cantidad a agregar' : 'Cantidad a quitar'}
                  labelPlacement="stacked"
                  type="number"
                  step="1"
                  min="1"
                  inputMode="numeric"
                  placeholder="Ej: 24"
                  value={formStock.delta > 0 ? formStock.delta : ''}
                  onIonInput={(e: any) => setFormStock({ ...formStock, delta: Math.max(0, Number(e.target.value || 0)) })}
                />
              </IonItem>
              <IonItem lines="none">
                <IonTextarea
                  label="Motivo / Observación"
                  labelPlacement="stacked"
                  rows={3}
                  placeholder={formStock.modo === 'AGREGAR'
                    ? 'Ej: Compra a proveedor XYZ · Factura N° 123'
                    : 'Ej: Merma · producto vencido o Cajón 3 dañado'}
                  value={formStock.motivo}
                  onIonInput={(e: any) => setFormStock({ ...formStock, motivo: String(e.target.value || '') })}
                />
              </IonItem>
            </IonList>
            <div className="hab-alert-actions-inline ion-padding-top">
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
