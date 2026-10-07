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
  useIonViewWillEnter,
} from '@ionic/react';
import { add, create, trash, save, close, bedOutline, buildOutline, pricetag } from 'ionicons/icons';
import { Usuario, Rol, RolUsuario, ModuloPermiso, Moneda, AuditFields, Habitacion, TipoHabitacion, EstadoHabitacion } from '../../types';
import { HabitacionService } from '../../services';
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
}

const FORM_VACIO: HabForm = { codigo:'', nombre:'', tipoHabitacionId:'', piso:'', ubicacion:'', estado:'LIBRE', precioNoche:0, notasInternas:'' };
const fmtSoles = (n: number) => `S/ ${Number(n || 0).toFixed(2)}`;

const PerfilPage: React.FC = () => {
  const [habsAdmin, setHabsAdmin] = useState<Habitacion[]>([]);
  const [tiposHab, setTiposHab] = useState<TipoHabitacion[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<HabForm>({ ...FORM_VACIO });
  const [confirmBorrar, setConfirmBorrar] = useState<{ id: string; codigo: string } | null>(null);
  const [toast, setToast] = useState('');
  const mostrarToast = (t: string) => { setToast(t); window.setTimeout(() => setToast(''), 2300); };

  const cargar = () => {
    try {
      setTiposHab(HabitacionService.listarTipos() || []);
      setHabsAdmin(HabitacionService.listarTodas() || []);
    } catch {
      setHabsAdmin([]);
      setTiposHab([]);
    }
  };
  useIonViewWillEnter(() => { cargar(); });

  const abrirNuevo = () => {
    setEditandoId(null);
    const primerTipo = tiposHab[0]?.id || '';
    setForm({ ...FORM_VACIO, tipoHabitacionId: primerTipo, estado: 'LIBRE' });
    setModalAbierto(true);
  };

  const abrirEditar = (h: Habitacion) => {
    const precio = Number(h.tipoHabitacion?.precioBaseNoche ?? 0) || 0;
    setEditandoId(h.id);
    setForm({
      codigo: h.codigo || '',
      nombre: h.nombre || '',
      tipoHabitacionId: h.tipoHabitacionId || '',
      piso: h.piso || '',
      ubicacion: h.ubicacion || '',
      estado: (h.estado as EstadoHabitacion) || 'LIBRE',
      precioNoche: precio,
      notasInternas: (h as any).notasInternas || (h as any).motivoBloqueo || '',
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
        estadoLimpieza: form.estado === 'LIBRE' ? 'LIMPIA' : form.estado === 'MANTENIMIENTO' ? 'PENDIENTE' : 'EN_PROGRESO',
        notasInternas: form.notasInternas.trim(),
        motivoBloqueo: form.estado === 'MANTENIMIENTO' ? form.notasInternas.trim() : undefined,
        createdBy: usuario.id,
        updatedBy: usuario.id,
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
      cargar();
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
    cargar();
  };

  const precioTipo = (tipoId: string) => {
    const t = tiposHab.find((x) => x.id === tipoId);
    return Number(t?.precioBaseNoche ?? 0);
  };

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

        {/* Confirmación BORRAR */}
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
      </IonContent>
    </IonPage>
  );
};

export default PerfilPage;
