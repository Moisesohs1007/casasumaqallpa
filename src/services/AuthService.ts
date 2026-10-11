import { supabase } from './supabaseClient';
import type { Usuario, Rol } from '../types/etapa2';

const SALT_SISTEMA = 'sumaqallpa_salt_2026';
const STORAGE_SESION = 'lodge_sesion_usuario_v1';
const STORAGE_CACHE_USUARIOS = 'lodge_cache_usuarios_v1';

export interface SesionUsuario {
  id: string;
  username: string;
  nombres: string;
  apellidos: string;
  rolId?: string;
  rol?: Rol | null;
  estado: string;
  ultimoAcceso?: string;
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(SALT_SISTEMA + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function _guardarCacheUsuarios(usuarios: any[]) {
  try {
    localStorage.setItem(STORAGE_CACHE_USUARIOS, JSON.stringify(usuarios));
  } catch {}
}

function _leerCacheUsuarios(): any[] {
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_USUARIOS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const AuthService = {
  SALT_SISTEMA,

  async hashPassword(password: string): Promise<string> {
    return hashPassword(password);
  },

  async login(username: string, password: string): Promise<{ ok: boolean; usuario?: SesionUsuario; error?: string }> {
    const user = (username || '').trim();
    if (!user || !password) {
      return { ok: false, error: 'Ingresa nombre de usuario y contraseña.' };
    }

    const hashIngresado = await hashPassword(password);

    let usuarioEncontrado: any = null;
    let desdeOnline = false;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*, username:payload->>username')
        .or(`payload->>username.ilike.${user},correo_electronico.ilike.${user}`)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const reg = data as any;
        if (!reg.username && reg.payload?.username) reg.username = reg.payload.username;
        usuarioEncontrado = reg;
        desdeOnline = true;
        const cache = _leerCacheUsuarios();
        const idx = cache.findIndex((u) => u.id === reg.id);
        if (idx >= 0) cache[idx] = reg;
        else cache.push(reg);
        _guardarCacheUsuarios(cache);
      } else if (error) {
        const cache = _leerCacheUsuarios();
        usuarioEncontrado = cache.find((u) => ((u.payload?.username || u.username || u.correo_electronico || '').toLowerCase() === user.toLowerCase())) || null;
      }
    } catch {
      const cache = _leerCacheUsuarios();
      usuarioEncontrado = cache.find((u) => ((u.payload?.username || u.username || u.correo_electronico || '').toLowerCase() === user.toLowerCase())) || null;
    }

    if (!usuarioEncontrado) {
      return { ok: false, error: 'Usuario no encontrado.' };
    }

    if (String(usuarioEncontrado.estado || '').toUpperCase() !== 'ACTIVO') {
      return { ok: false, error: 'Usuario inactivo. Contacta al administrador.' };
    }

    const hashGuardado = String(usuarioEncontrado.password_hash || '');
    if (!hashGuardado || hashGuardado !== hashIngresado) {
      return { ok: false, error: 'Contraseña incorrecta.' };
    }

    let rol: Rol | null = null;
    if (usuarioEncontrado.rol_id) {
      try {
        const { data: rolData } = await supabase
          .from('roles')
          .select('*')
          .eq('id', usuarioEncontrado.rol_id)
          .limit(1)
          .maybeSingle();
        if (rolData) {
          rol = rolData as unknown as Rol;
        }
      } catch {}
    }

    const usernameFinal = usuarioEncontrado.username || usuarioEncontrado.payload?.username || usuarioEncontrado.correo_electronico || '';
    const sesion: SesionUsuario = {
      id: usuarioEncontrado.id,
      username: usernameFinal,
      nombres: usuarioEncontrado.nombres || '',
      apellidos: usuarioEncontrado.apellidos || '',
      rolId: usuarioEncontrado.rol_id,
      rol,
      estado: usuarioEncontrado.estado || 'ACTIVO',
      ultimoAcceso: usuarioEncontrado.ultimo_acceso || new Date().toISOString(),
    };

    try {
      sessionStorage.setItem(STORAGE_SESION, JSON.stringify(sesion));
      localStorage.removeItem(STORAGE_SESION);
    } catch {}

    if (desdeOnline) {
      try {
        await supabase
          .from('usuarios')
          .update({ ultimo_acceso: new Date().toISOString() })
          .eq('id', usuarioEncontrado.id);
      } catch {}
    }

    return { ok: true, usuario: sesion };
  },

  logout(): void {
    try {
      sessionStorage.removeItem(STORAGE_SESION);
      localStorage.removeItem(STORAGE_SESION);
    } catch {}
  },

  sesionActual(): SesionUsuario | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_SESION);
      return raw ? (JSON.parse(raw) as SesionUsuario) : null;
    } catch {
      return null;
    }
  },

  tienePermiso(usuario: SesionUsuario | null, modulo: string, nivel: 'LECTURA' | 'ESCRITURA' | 'ADMIN' = 'LECTURA'): boolean {
    if (!usuario) return false;
    const permisos = usuario.rol?.permisos || [];
    const match = permisos.find((p) => String(p.modulo || '').toUpperCase() === modulo.toUpperCase());
    if (!match) return false;
    const niveles: Record<string, number> = { LECTURA: 1, ESCRITURA: 2, ADMIN: 3 };
    const requerido = niveles[nivel] || 1;
    const actual = niveles[String(match.permiso || '').toUpperCase()] || 0;
    return actual >= requerido;
  },

  async cambiarContrasena(usuarioId: string, passwordNueva: string): Promise<{ ok: boolean; error?: string }> {
    if (!passwordNueva || passwordNueva.length < 4) {
      return { ok: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
    }
    const hash = await hashPassword(passwordNueva);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ password_hash: hash })
        .eq('id', usuarioId);
      if (error) return { ok: false, error: error.message };
      const cache = _leerCacheUsuarios();
      const idx = cache.findIndex((u) => u.id === usuarioId);
      if (idx >= 0) {
        cache[idx].password_hash = hash;
        _guardarCacheUsuarios(cache);
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Error de conexión.' };
    }
  },
};

export default AuthService;
