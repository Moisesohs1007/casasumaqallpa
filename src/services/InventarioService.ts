// @ts-nocheck
import { db, seedUtil, type ProductoFB } from './__db__';
import { dbRemota } from './__supabase_db__';
import { CatalogoFBService } from './PosService';

const KEY_PROD = 'productosFB';
const KEY_PRES = 'presentacionesFB';

export type StockMovimiento = {
  id: string;
  fecha: string;
  delta: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo: string;
  usuarioId: string;
  referenciaId?: string;
  referenciaTipo?: string;
};

export type MoverStockResult = {
  ok: boolean;
  error?: string;
  advertencia?: 'STOCK_NEGATIVO' | 'STOCK_BAJO_MINIMO' | undefined;
  stockAnterior?: number;
  stockNuevo?: number;
  stockMinimo?: number;
  productoNombre?: string;
};

const _pushMovimiento = (obj: any, mov: StockMovimiento): any[] => {
  const arr = Array.isArray(obj?.movimientosStock) ? obj.movimientosStock.slice() : [];
  arr.unshift(mov);
  return arr.slice(0, 500);
};

const _obtenerProductoPayloadPlanos = (prod: ProductoFB & any) => {
  const stockControlActual =
    typeof prod.stockControl === 'boolean' ? prod.stockControl : (prod.payload?.stockControl ?? false);
  const stockActualActual =
    typeof prod.stockActual === 'number' ? prod.stockActual : Number(prod.payload?.stockActual ?? 0);
  const stockMinimoActual =
    typeof prod.stockMinimo === 'number' ? prod.stockMinimo : Number(prod.payload?.stockMinimo ?? 0);
  return { stockControlActual, stockActualActual, stockMinimoActual };
};

const _obtenerPresentacionPayloadPlanos = (pres: any) => {
  const stockControlActual =
    typeof pres?.stockControl === 'boolean' ? pres.stockControl : (pres?.payload?.stockControl ?? false);
  const stockActualActual =
    typeof pres?.stockActual === 'number' ? pres.stockActual : Number(pres?.payload?.stockActual ?? 0);
  const stockMinimoActual =
    typeof pres?.stockMinimo === 'number' ? pres.stockMinimo : Number(pres?.payload?.stockMinimo ?? 0);
  return { stockControlActual, stockActualActual, stockMinimoActual };
};

export const InventarioService = {
  listarBajosStock(minDiferencia = 0): Array<{
    id: string;
    nombre: string;
    codigo: string;
    categoriaId?: string;
    stockActual: number;
    stockMinimo: number;
    unidadMedida?: string;
    origen: 'PRODUCTO' | 'PRESENTACION';
  }> {
    const productos = CatalogoFBService.listarProductos({ soloActivos: false }) || [];
    const results: any[] = [];
    for (const p of productos) {
      const plano = _obtenerProductoPayloadPlanos(p as any);
      if (plano.stockControlActual && plano.stockActualActual <= (plano.stockMinimoActual + minDiferencia)) {
        results.push({
          id: p.id,
          nombre: p.nombre,
          codigo: p.codigo,
          categoriaId: (p as any).categoriaId,
          stockActual: plano.stockActualActual,
          stockMinimo: plano.stockMinimoActual,
          unidadMedida: (p as any).unidadMedida || 'UND',
          origen: 'PRODUCTO',
        });
      }
    }
    return results;
  },

  moverStock(
    params: {
      productoId?: string;
      presentacionId?: string;
      delta: number;
      motivo: string;
      usuarioId?: string;
      referenciaId?: string;
      referenciaTipo?: string;
      bloquearNegativo?: boolean;
    }
  ): MoverStockResult {
    const { productoId, presentacionId, delta, motivo, usuarioId = 'system-inventario', referenciaId, referenciaTipo, bloquearNegativo = false } = params;

    if (!productoId && !presentacionId) {
      return { ok: false, error: 'Se requiere productoId o presentacionId' };
    }
    if (typeof delta !== 'number' || isNaN(delta) || delta === 0) {
      return { ok: false, error: 'Delta inválido (debe ser distinto de 0)' };
    }

    const KEY = presentacionId ? KEY_PRES : KEY_PROD;
    const idTarget = presentacionId || productoId!;
    const actual = db.getById<any>(KEY, idTarget);
    if (!actual) {
      return { ok: false, error: `${presentacionId ? 'Presentación' : 'Producto'} no encontrado` };
    }

    const plano = presentacionId ? _obtenerPresentacionPayloadPlanos(actual) : _obtenerProductoPayloadPlanos(actual as any);

    const stockControl = plano.stockControlActual;
    if (!stockControl) {
      return {
        ok: true,
        advertencia: undefined,
        stockAnterior: plano.stockActualActual,
        stockNuevo: plano.stockActualActual,
        stockMinimo: plano.stockMinimoActual,
        productoNombre: actual?.nombre || (actual as any)?.codigo || idTarget,
      };
    }

    const stockAnterior = plano.stockActualActual;
    const stockNuevo = Number((stockAnterior + delta).toFixed(4));
    const stockMinimo = plano.stockMinimoActual;

    if (bloquearNegativo && stockNuevo < -0.0001) {
      return {
        ok: false,
        error: `Stock insuficiente (actual ${stockAnterior}, se requiere ${Math.abs(delta)})`,
        stockAnterior,
        stockNuevo,
        stockMinimo,
        productoNombre: actual?.nombre || (actual as any)?.codigo || idTarget,
      };
    }

    const movimiento: StockMovimiento = {
      id: seedUtil.generateUUID(),
      fecha: seedUtil.nowISO(),
      delta,
      stockAnterior,
      stockNuevo,
      motivo: motivo || (delta > 0 ? 'Ajuste ingreso' : 'Ajuste egreso'),
      usuarioId,
      referenciaId,
      referenciaTipo,
    };

    const payloadMerge: any = (actual.payload && typeof actual.payload === 'object') ? { ...actual.payload } : {};
    payloadMerge.stockControl = true;
    payloadMerge.stockActual = stockNuevo;
    payloadMerge.stockMinimo = stockMinimo;
    payloadMerge.movimientosStock = _pushMovimiento({ ...actual, payload: payloadMerge }, movimiento);

    const deltaUpdate: any = {
      stockControl: true,
      stockActual: stockNuevo,
      stockMinimo: stockMinimo,
      payload: payloadMerge,
      updatedBy: usuarioId,
      updatedAt: seedUtil.nowISO(),
    };
    const upd = db.update<any>(KEY, idTarget, deltaUpdate);
    if (upd) {
      dbRemota.updateAsync<any>(KEY, idTarget, deltaUpdate).catch((e) =>
        console.error('[InventarioService.moverStock] remoto fail KEY=', KEY, 'id=', idTarget, e)
      );
    }

    let advertencia: MoverStockResult['advertencia'] = undefined;
    if (stockNuevo < -0.0001) advertencia = 'STOCK_NEGATIVO';
    else if (stockNuevo < stockMinimo) advertencia = 'STOCK_BAJO_MINIMO';

    return {
      ok: true,
      advertencia,
      stockAnterior,
      stockNuevo,
      stockMinimo,
      productoNombre: actual?.nombre || (actual as any)?.codigo || idTarget,
    };
  },

  moverStockProducto(productoId: string, delta: number, motivo: string, usuarioId = 'system-inventario', opts?: Partial<{ referenciaId: string; referenciaTipo: string; bloquearNegativo: boolean }>): MoverStockResult {
    return this.moverStock({ productoId, delta, motivo, usuarioId, ...(opts || {}) });
  },

  historialMovimientos(productoId?: string, presentacionId?: string, limite = 100): StockMovimiento[] {
    if (!productoId && !presentacionId) return [];
    const KEY = presentacionId ? KEY_PRES : KEY_PROD;
    const id = presentacionId || productoId!;
    const actual = db.getById<any>(KEY, id);
    if (!actual) return [];
    const arr = actual.payload?.movimientosStock || actual.movimientosStock || [];
    return (Array.isArray(arr) ? arr : []).slice(0, limite);
  },
};

export default InventarioService;
