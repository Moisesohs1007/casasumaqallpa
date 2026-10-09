// Queue persistente de escrituras pendientes en Supabase.
// Caso de uso: dual-write offline-first. Cuando dbRemota.addAsync/updateAsync/deleteAsync falla
// o el usuario está SIN INTERNET: enqueuamos el payload completo en localStorage, y reintentamos
// cada 30s o cuando window recibe evento 'online' (navegador recuperó red).
// InMemoryDB ya tiene el dato (upsertAll no lo borra) → nunca se pierde.
// Al sincronizar: borramos de la cola y mergeamos idempotentemente (no duplicamos).
// @ts-nocheck
import { db as dbRemota, type CollectionKey } from './__supabase_db__';
import { db as dbLocal } from './__db__';

export type PendingMethod = 'add' | 'update' | 'remove';
export interface PendingOp {
  id: string;
  at: number;
  key: CollectionKey;
  method: PendingMethod;
  matchId?: string;            // id del registro afectado (update/remove/add)
  payload: any;               // payload completo (para add/update)
  retries: number;            // reintentos consumidos
  lastError?: string | null;
}

const LS_KEY = 'lodge_pending_sync_ops_v1';
const MAX_RETRIES = 40;       // ~20hs (cada 30s × 40 = 20 minutos... lo dejo alto, total offline seguro 40)
const INTERVAL_MS = 30_000;   // 30s reintento

let _intervalStarted = false;
let _onlineListenerAttached = false;

function _readLs(): PendingOp[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) as PendingOp[] : [];
  } catch (_) { return []; }
}
function _writeLs(arr: PendingOp[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LS_KEY, JSON.stringify(arr || []));
  } catch (_) {}
}

/** Genera id interno de op. */
const _opId = (): string => `op_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function countPendientes(key?: CollectionKey): number {
  const arr = _readLs();
  if (!key) return arr.length;
  return arr.filter((o) => o.key === key).length;
}
export function hayPendientes(key?: CollectionKey): boolean { return countPendientes(key) > 0; }
export function getPendientes(key?: CollectionKey): PendingOp[] {
  const arr = _readLs();
  if (!key) return arr;
  return arr.filter((o) => o.key === key);
}

/** Encolar operación. Safe idempotente: si key+method+matchId ya existe, actualiza payload y reinicia retries. */
export function enqueue(
  key: CollectionKey,
  method: PendingMethod,
  matchId: string,
  payload: any,
): PendingOp {
  const arr = _readLs();
  const existente = arr.find((o) => o.key === key && o.method === method && o.matchId === matchId);
  const op: PendingOp = existente || {
    id: _opId(),
    at: Date.now(),
    key, method,
    matchId,
    payload,
    retries: 0,
    lastError: null,
  };
  op.payload = payload;
  op.retries = existente ? Math.max(0, existente.retries) : 0;
  op.at = Date.now();
  op.lastError = null;
  const next = existente ? arr.map((o) => (o.id === op.id ? op : o)) : [...arr, op];
  _writeLs(next);
  return op;
}

export function removerOp(idOp: string): void {
  const arr = _readLs();
  _writeLs(arr.filter((o) => o.id !== idOp));
}

/** Procesar TODOS los pendientes. Retorna [ejecutadosOK, fallidos, skips]. */
export async function processQueue(force = false): Promise<[number, number, number]> {
  if (!dbRemota.isOnline()) return [0, 0, _readLs().length];
  let ok = 0, fail = 0, skip = 0;
  const arr = _readLs();
  const pending = [...arr].sort((a, b) => a.at - b.at);
  const toRemove: string[] = [];
  for (const op of pending) {
    try {
      if (!force && op.retries >= MAX_RETRIES) { skip++; continue; }
      let r: any = undefined;
      switch (op.method) {
        case 'add':
          r = await dbRemota.addAsync<any>(op.key, op.payload);
          // Escribir InMemoryDB inmediato (no esperar Realtime roundtrip)
          try {
            if (op.payload && op.payload.id) {
              const existente = dbLocal.getById<any>(op.key, op.payload.id);
              if (!existente) dbLocal.add(op.key, { ...op.payload });
              else dbLocal.update(op.key, op.payload.id, { ...op.payload });
            }
          } catch (_) {}
          break;
        case 'update':
          if (!op.matchId) throw new Error('update requiere matchId');
          r = await dbRemota.updateAsync<any>(op.key, op.matchId, op.payload || {});
          // Escribir InMemoryDB inmediato (no esperar Realtime roundtrip)
          try {
            const existente = dbLocal.getById<any>(op.key, op.matchId);
            if (existente) dbLocal.update(op.key, op.matchId, { ...(op.payload || {}) });
          } catch (_) {}
          break;
        case 'remove':
          if (!op.matchId) throw new Error('remove requiere matchId');
          r = await dbRemota.removeAsync<any>(op.key, op.matchId);
          try { dbLocal.remove(op.key, op.matchId); } catch (_) {}
          break;
      }
      toRemove.push(op.id);
      ok++;
      // Actualizar InMemoryDB idempotentemente si el remoto devolvió datos (nuevo id si corresponde)
      if (op.method === 'add' && r && r.id && op.key) {
        try {
          const localRaw = dbLocal.getById<any>(op.key, r.id);
          if (!localRaw && op.matchId && op.matchId !== r.id) {
            const otra = dbLocal.getById<any>(op.key, op.matchId);
            if (otra) {
              // caso raro: el addAsync modificó el id? No debería (enviamos id). Por seguridad no hacemos nada.
            }
          }
        } catch (_) {}
      }
    } catch (e: any) {
      fail++;
      const msg = (e?.message || String(e)).slice(0, 120);
      // Marcar error + incrementar retries
      const idx = arr.findIndex((x) => x.id === op.id);
      if (idx >= 0) {
        arr[idx] = { ...arr[idx], retries: (arr[idx].retries || 0) + 1, lastError: msg };
      }
    }
  }
  // Guardar: aplicar retries incrementados; quitar los OK
  let finalArr = arr;
  if (toRemove.length) finalArr = finalArr.filter((o) => !toRemove.includes(o.id));
  _writeLs(finalArr);
  return [ok, fail, skip];
}

/** =============== CRÍTICO OFFLINE-FIRST: Replay local de la cola pendientes ===============
 * Aplica TODOS los payloads de pendingSync DIRECTAMENTE sobre InMemoryDB (sin tocar Supabase).
 * Motivo: después de una hidratación upsertAll, los datos locales "ganadores" (check-in OCUPADA, consumo, etc.)
 *         pueden haber sido sobrescritos por un remoto viejo; este método vuelve a imponerlos desde la cola,
 *         ya que la cola representa lo que el USUARIO REALMENTE HIZO (fuente verdad sus acciones).
 * Invocar:
 *   - 1 vez al boot después de InMemoryDB constructor+seed
 *   - después de cada hidratarDesdeSupabase(force=true)
 */
export function applyPendingLocal(): number {
  try {
    const arr = _readLs();
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a.at - b.at);
    let applied = 0;
    for (const op of sorted) {
      try {
        if (op.method === 'update' && op.matchId && op.payload) {
          const existente = dbLocal.getById<any>(op.key, op.matchId);
          if (existente) {
            dbLocal.update<any>(op.key, op.matchId, { ...(op.payload || {}) } as any);
            applied++;
          }
        } else if (op.method === 'add' && op.payload && (op.payload.id || op.matchId)) {
          const id = (op.payload.id || op.matchId) as string;
          if (id) {
            const existente = dbLocal.getById<any>(op.key, id);
            if (!existente) {
              dbLocal.add<any>(op.key, { ...op.payload });
              applied++;
            } else {
              dbLocal.update<any>(op.key, id, { ...op.payload });
              applied++;
            }
          }
        } else if (op.method === 'remove' && op.matchId) {
          const existente = dbLocal.getById<any>(op.key, op.matchId);
          if (existente) {
            dbLocal.remove(op.key, op.matchId);
            applied++;
          }
        }
      } catch (_) {}
    }
    // Notificar al UI que el estado local cambió para que re-renderice badges
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent?.(new CustomEvent('lodge:pending:applied', { detail: { applied } }));
      }
    } catch (_) {}
    return applied;
  } catch (_) { return 0; }
}

/** Iniciar reintentos periódicos + listener online. Idempotente (solo 1 vez). */
export function initSyncWorker(): void {
  if (typeof window === 'undefined') return;
  // Aplicar replay local INMEDIATO después de boot (antes de cualquier hidratación async o flush remoto)
  try { window.setTimeout(() => applyPendingLocal(), 0); } catch (_) {}
  try { window.setTimeout(() => applyPendingLocal(), 800); } catch (_) {}
  try { window.setTimeout(() => applyPendingLocal(), 2200); } catch (_) {}

  if (!_intervalStarted) {
    window.setInterval(() => { void processQueue(false); }, INTERVAL_MS);
    _intervalStarted = true;
  }
  if (!_onlineListenerAttached) {
    try {
      window.addEventListener('online', () => {
        console.info('[PendingSync] 🌐 on-line detectado → flush queue + replay local');
        // Primero imponemos lo offline sobre local (por si upsertAll de hidratación lo borró)
        applyPendingLocal();
        // Luego intentamos subir
        window.setTimeout(() => { void processQueue(true); }, 2000);
      });
    } catch (_) {}
    _onlineListenerAttached = true;
  }
  // Primer flush temprano (5s después del init)
  try { window.setTimeout(() => { void processQueue(false); }, 5000); } catch (_) {}
}

export { MAX_RETRIES, INTERVAL_MS, LS_KEY };
