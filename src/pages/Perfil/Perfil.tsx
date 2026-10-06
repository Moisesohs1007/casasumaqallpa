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
} from '@ionic/react';
import { Usuario, Rol, RolUsuario, ModuloPermiso, Moneda, AuditFields } from '../../types';
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
    'DASHBOARD',
    'HABITACIONES',
    'TARIFAS',
    'RESERVAS',
    'HUESPEDES',
    'CHECKIN_CHECKOUT',
    'FOLIOS',
    'CAJA_PAGOS',
    'FACTURACION_SUNAT',
    'HOUSEKEEPING',
    'MANTENIMIENTO',
    'REPORTES',
    'POS_FB',
    'INVENTARIO',
    'USUARIOS_ROLES',
    'CONFIGURACION_SISTEMA',
    'AUDITORIA',
  ] as Array<ModuloPermiso['modulo']>).map((modulo) => ({
    modulo,
    permiso: 'ADMIN' as const,
  })) as ModuloPermiso[],
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
  preferencias: {
    idioma: 'es',
    zonaHoraria: 'America/Lima',
    monedaPorDefecto: 'PEN' as Moneda,
    paginacionPorDefecto: 25,
  },
  ultimoAcceso: nowIso,
  ...audit,
};

const PerfilPage: React.FC = () => {
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
            <IonTitle size="large">Perfil y sesión</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonCard className="profile-card">
          <IonCardHeader className="profile-header">
            <IonAvatar className="profile-avatar">
              <div className="avatar-inner">{usuario.iniciales}</div>
            </IonAvatar>
            <div className="profile-info">
              <IonCardTitle>{usuario.nombres} {usuario.apellidos}</IonCardTitle>
              <IonBadge color="tertiary">{String(usuario.rol?.nombre ?? 'Administración').replace('_', ' ')}</IonBadge>
            </div>
          </IonCardHeader>
          <IonCardContent>
            <p>
              <strong>Sede:</strong> Casa Sumaq Allpa
            </p>
            <p>
              <strong>Email:</strong> {usuario.correoElectronico}
            </p>
            {usuario.ultimoAcceso ? (
              <p>
                <strong>Último acceso:</strong> {new Date(usuario.ultimoAcceso).toLocaleString('es-PE')}
              </p>
            ) : null}
            <p className="ion-text-color-danger">
              Recuerda: verifica siempre el badge <strong>"{usuario.iniciales}"</strong> antes de operaciones críticas.
            </p>
          </IonCardContent>
        </IonCard>

        <IonList inset>
          <IonItem button detail>
            <IonLabel>Configuración de cuenta</IonLabel>
          </IonItem>
          <IonItem button detail>
            <IonLabel>Permisos y roles</IonLabel>
          </IonItem>
          <IonItem button detail>
            <IonLabel>Preferencias de notificaciones</IonLabel>
          </IonItem>
          <IonItem button lines="none">
            <IonLabel className="ion-text-color-danger">Cerrar sesión</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default PerfilPage;
