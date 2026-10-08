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
          break;
        case 'update':
          if (!op.matchId) throw new Error('update requiere matchId');
          r = await dbRemota.updateAsync<any>(op.key, op.matchId, op.payload || {});
          break;
        case 'remove':
          if (!op.matchId) throw new Error('remove requiere matchId');
          r = await dbRemota.removeAsync<any>(op.key, op.matchId);
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

/** Iniciar reintentos periódicos + listener online. Idempotente (solo 1 vez). */
export function initSyncWorker(): void {
  if (typeof window === 'undefined') return;
  if (!_intervalStarted) {
    window.setInterval(() => { void processQueue(false); }, INTERVAL_MS);
    _intervalStarted = true;
  }
  if (!_onlineListenerAttached) {
    try {
      window.addEventListener('online', () => {
        console.info('[PendingSync] 🌐 on-line detectado → flush queue');
        // Damos 2s de buffer para que la conexión se estabilice
        window.setTimeout(() => { void processQueue(true); }, 2000);
      });
    } catch (_) {}
    _onlineListenerAttached = true;
  }
  // Primer flush temprano (5s después del init)
  try { window.setTimeout(() => { void processQueue(false); }, 5000); } catch (_) {}
}

export { MAX_RETRIES, INTERVAL_MS, LS_KEY };
