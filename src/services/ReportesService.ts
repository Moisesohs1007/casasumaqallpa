import { ComandaService, CatalogoFBService } from './PosService';
import type { Comanda, ComandaDetalle, ProductoFB } from '../types';

export interface RangoFechas {
  desdeISO: string;
  hastaISO: string;
}

export interface KpiReportes {
  totalVentas: number;
  totalComandas: number;
  ticketPromedio: number;
  totalProductosVendidos: number;
  totalImpuestos: number;
  totalDescuentos: number;
  totalPropinas: number;
  gananciaEstimada: number;
  promedioPersonasPorComanda: number;
  consumoPromedioPorPersona: number;
  tiempoPromedioAtencionMinutos: number;
  totalCortesias: number;
}

export interface ProductoVendido {
  productoId: string;
  nombre: string;
  categoriaId?: string;
  categoriaNombre: string;
  cantidad: number;
  ingreso: number;
  costoEstimado: number;
  ganancia: number;
  margenPorcentaje: number;
}

export interface VentaCategoria {
  categoriaId: string;
  categoriaNombre: string;
  cantidad: number;
  ingreso: number;
  porcentaje: number;
}

export interface VentaMetodoPago {
  metodoPago: string;
  monto: number;
  porcentaje: number;
  cantidad: number;
}

export interface VentaTipoConsumo {
  tipoConsumo: string;
  cantidad: number;
  ingreso: number;
  porcentaje: number;
}

export interface VentaPorFecha {
  fecha: string;
  fechaLabel: string;
  cantidadComandas: number;
  ventas: number;
  ticketPromedio: number;
}

export interface VentaPorMozo {
  mozoId: string;
  mozoNombre: string;
  cantidadComandas: number;
  ventas: number;
  ticketPromedio: number;
}

export interface VentaPorHora {
  hora: number;
  horaLabel: string;
  cantidadComandas: number;
  ventas: number;
}

export interface ResumenReportes {
  kpis: KpiReportes;
  topProductos: ProductoVendido[];
  todosProductos: ProductoVendido[];
  ventasPorCategoria: VentaCategoria[];
  ventasPorMetodoPago: VentaMetodoPago[];
  ventasPorTipoConsumo: VentaTipoConsumo[];
  ventasPorFecha: VentaPorFecha[];
  ventasPorMozo: VentaPorMozo[];
  ventasPorHora: VentaPorHora[];
}

const ESTADOS_COBRADOS = ['CERRADA_COBRADA', 'CARGADA_A_FOLIO', 'MIXTO_FOLIO_MAS_COBRO'];

function _startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function _endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function _fmtFechaInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function _fmtFechaLabel(iso: string): string {
  const d = new Date(iso);
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d.getDate()}/${meses[d.getMonth()]}`;
}

export const rangoHoy = (): RangoFechas => {
  const hoy = new Date();
  return {
    desdeISO: _startOfDay(hoy).toISOString(),
    hastaISO: _endOfDay(hoy).toISOString(),
  };
};

export const rangoAyer = (): RangoFechas => {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  return {
    desdeISO: _startOfDay(ayer).toISOString(),
    hastaISO: _endOfDay(ayer).toISOString(),
  };
};

export const rangoSemana = (): RangoFechas => {
  const hoy = new Date();
  const inicio = new Date(hoy);
  inicio.setDate(hoy.getDate() - 6);
  return {
    desdeISO: _startOfDay(inicio).toISOString(),
    hastaISO: _endOfDay(hoy).toISOString(),
  };
};

export const rangoMes = (): RangoFechas => {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return {
    desdeISO: inicio.toISOString(),
    hastaISO: _endOfDay(hoy).toISOString(),
  };
};

export const rangoMesAnterior = (): RangoFechas => {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
  return {
    desdeISO: inicio.toISOString(),
    hastaISO: _endOfDay(fin).toISOString(),
  };
};

function _obtenerComandasFiltradas(rango: RangoFechas): Comanda[] {
  const todas = ComandaService.listarTodas({});
  return todas.filter((c) => {
    if (c.anulada) return false;
    if (!ESTADOS_COBRADOS.includes(c.estado)) return false;
    const fecha = c.fechaCierre || c.fechaApertura;
    if (!fecha) return false;
    return fecha >= rango.desdeISO && fecha <= rango.hastaISO;
  });
}

export const ReportesService = {
  calcular(rango: RangoFechas): ResumenReportes {
    const comandas = _obtenerComandasFiltradas(rango);

    let totalVentas = 0;
    let totalImpuestos = 0;
    let totalDescuentos = 0;
    let totalPropinas = 0;
    let totalProductosVendidos = 0;
    let gananciaEstimada = 0;
    let totalCortesias = 0;
    let sumaPersonas = 0;
    let sumaTiempoAtencionMin = 0;
    let comandasConTiempo = 0;

    const mapProducto = new Map<string, ProductoVendido>();
    const mapCategoria = new Map<string, VentaCategoria>();
    const mapMetodoPago = new Map<string, VentaMetodoPago>();
    const mapTipoConsumo = new Map<string, VentaTipoConsumo>();
    const mapFecha = new Map<string, VentaPorFecha>();
    const mapMozo = new Map<string, VentaPorMozo>();
    const mapHora = new Map<number, VentaPorHora>();

    for (const c of comandas) {
      totalVentas += c.totalComanda || 0;
      totalImpuestos += (c as any).impuestos || (c as any).totalImpuestos || 0;
      totalDescuentos += (c as any).descuentosTotal || (c as any).totalDescuentos || 0;
      totalPropinas += (c as any).propinas || (c as any).totalPropinas || 0;
      sumaPersonas += (c as any).cantidadPersonas || (c as any).paxAdultos || 0;

      if (c.fechaApertura && c.fechaCierre) {
        const mins = (new Date(c.fechaCierre).getTime() - new Date(c.fechaApertura).getTime()) / 60000;
        if (mins > 0 && mins < 1440) {
          sumaTiempoAtencionMin += mins;
          comandasConTiempo += 1;
        }
      }

      const fechaCierre = c.fechaCierre || c.fechaApertura;
      const fechaKey = fechaCierre ? fechaCierre.substring(0, 10) : 'sin-fecha';
      if (!mapFecha.has(fechaKey)) {
        mapFecha.set(fechaKey, { fecha: fechaKey, fechaLabel: _fmtFechaLabel(fechaCierre || ''), cantidadComandas: 0, ventas: 0, ticketPromedio: 0 });
      }
      const vf = mapFecha.get(fechaKey)!;
      vf.cantidadComandas += 1;
      vf.ventas += c.totalComanda || 0;

      const mozoId = (c as any).mozoAsignadoId || (c as any).usuarioIdMozoApertura || 'sin-mozo';
      const mozoNombre = (c as any).mozoAsignadoNombre || (c as any).usuarioIdMozoApertura || 'Sin mozo';
      if (!mapMozo.has(mozoId)) {
        mapMozo.set(mozoId, { mozoId, mozoNombre, cantidadComandas: 0, ventas: 0, ticketPromedio: 0 });
      }
      const vm = mapMozo.get(mozoId)!;
      vm.cantidadComandas += 1;
      vm.ventas += c.totalComanda || 0;

      if (fechaCierre) {
        const hora = new Date(fechaCierre).getHours();
        if (!mapHora.has(hora)) {
          mapHora.set(hora, { hora, horaLabel: `${String(hora).padStart(2, '0')}:00`, cantidadComandas: 0, ventas: 0 });
        }
        const vh = mapHora.get(hora)!;
        vh.cantidadComandas += 1;
        vh.ventas += c.totalComanda || 0;
      }

      const tipo = c.tipoConsumo || 'OTRO';
      if (!mapTipoConsumo.has(tipo)) {
        mapTipoConsumo.set(tipo, { tipoConsumo: tipo, cantidad: 0, ingreso: 0, porcentaje: 0 });
      }
      const tc = mapTipoConsumo.get(tipo)!;
      tc.cantidad += 1;
      tc.ingreso += c.totalComanda || 0;

      const detalles = c.detalles || c.items || [];
      for (const det of detalles) {
        if (det.anulada) continue;
        const prodId = (det as any).productoId || (det as any).productoFBId;
        const prod = CatalogoFBService.buscarProductoPorId(prodId);
        const catId = prod?.categoriaId || 'sin-categoria';
        const catObj = catId !== 'sin-categoria' ? CatalogoFBService.buscarCategoriaPorId(catId) : null;
        const catNombre = catObj?.nombre || prod?.categoria?.nombre || 'Sin categoría';
        const costoProd = (prod as any)?.costoAproximado || (prod as any)?.costoEstimado || (prod as any)?.precioCostoPromedio || 0;
        const cantidad = Number(det.cantidad || 0);
        const ingreso = Number((det as any).montoLinea || (det as any).totalLineaConImpuestos || 0);

        totalProductosVendidos += cantidad;

        const costo = costoProd * cantidad;
        gananciaEstimada += ingreso - costo;

        if (det.cortesiaLinea || det.sinCobro) totalCortesias += cantidad;

        const prodNombre = (det as any).nombreProductoAlMomento || prod?.nombre || 'Producto';

        if (!mapProducto.has(prodId)) {
          mapProducto.set(prodId, {
            productoId: prodId,
            nombre: prodNombre,
            categoriaId: catId,
            categoriaNombre: catNombre,
            cantidad: 0,
            ingreso: 0,
            costoEstimado: 0,
            ganancia: 0,
            margenPorcentaje: 0,
          });
        }
        const pv = mapProducto.get(prodId)!;
        pv.cantidad += cantidad;
        pv.ingreso += ingreso;
        pv.costoEstimado += costo;
        pv.ganancia += ingreso - costo;

        if (!mapCategoria.has(catId)) {
          mapCategoria.set(catId, { categoriaId: catId, categoriaNombre: catNombre, cantidad: 0, ingreso: 0, porcentaje: 0 });
        }
        const vc = mapCategoria.get(catId)!;
        vc.cantidad += cantidad;
        vc.ingreso += ingreso;
      }

      const cierre = (c as any).cierre;
      if (cierre && cierre.metodoPago) {
        const mp = cierre.metodoPago;
        const monto = Number(cierre.montoTotalCobrado || c.totalComanda || 0);
        if (!mapMetodoPago.has(mp)) {
          mapMetodoPago.set(mp, { metodoPago: mp, monto: 0, porcentaje: 0, cantidad: 0 });
        }
        const vmp = mapMetodoPago.get(mp)!;
        vmp.monto += monto;
        vmp.cantidad += 1;
      }
    }

    const totalComandas = comandas.length;
    const ticketPromedio = totalComandas > 0 ? totalVentas / totalComandas : 0;
    const promedioPersonasPorComanda = totalComandas > 0 ? sumaPersonas / totalComandas : 0;
    const consumoPromedioPorPersona = sumaPersonas > 0 ? totalVentas / sumaPersonas : 0;
    const tiempoPromedioAtencionMinutos = comandasConTiempo > 0 ? sumaTiempoAtencionMin / comandasConTiempo : 0;

    const todosProductos = Array.from(mapProducto.values())
      .map((p) => ({
        ...p,
        margenPorcentaje: p.ingreso > 0 ? (p.ganancia / p.ingreso) * 100 : 0,
      }))
      .sort((a, b) => b.ingreso - a.ingreso);

    const topProductos = todosProductos.slice(0, 10);

    const ventasPorCategoria = Array.from(mapCategoria.values())
      .sort((a, b) => b.ingreso - a.ingreso)
      .map((v) => ({
        ...v,
        porcentaje: totalVentas > 0 ? (v.ingreso / totalVentas) * 100 : 0,
      }));

    const totalPagos = Array.from(mapMetodoPago.values()).reduce((s, v) => s + v.monto, 0);
    const ventasPorMetodoPago = Array.from(mapMetodoPago.values())
      .sort((a, b) => b.monto - a.monto)
      .map((v) => ({
        ...v,
        porcentaje: totalPagos > 0 ? (v.monto / totalPagos) * 100 : 0,
      }));

    const ventasPorTipoConsumo = Array.from(mapTipoConsumo.values())
      .sort((a, b) => b.ingreso - a.ingreso)
      .map((v) => ({
        ...v,
        porcentaje: totalVentas > 0 ? (v.ingreso / totalVentas) * 100 : 0,
      }));

    const ventasPorFecha = Array.from(mapFecha.values())
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((v) => ({
        ...v,
        ticketPromedio: v.cantidadComandas > 0 ? v.ventas / v.cantidadComandas : 0,
      }));

    const ventasPorMozo = Array.from(mapMozo.values())
      .sort((a, b) => b.ventas - a.ventas)
      .map((v) => ({
        ...v,
        ticketPromedio: v.cantidadComandas > 0 ? v.ventas / v.cantidadComandas : 0,
      }));

    const ventasPorHora = Array.from(mapHora.values())
      .sort((a, b) => a.hora - b.hora);

    return {
      kpis: {
        totalVentas,
        totalComandas,
        ticketPromedio,
        totalProductosVendidos,
        totalImpuestos,
        totalDescuentos,
        totalPropinas,
        gananciaEstimada,
        promedioPersonasPorComanda,
        consumoPromedioPorPersona,
        tiempoPromedioAtencionMinutos,
        totalCortesias,
      },
      topProductos,
      todosProductos,
      ventasPorCategoria,
      ventasPorMetodoPago,
      ventasPorTipoConsumo,
      ventasPorFecha,
      ventasPorMozo,
      ventasPorHora,
    };
  },

  formatearMonto(valor: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
    }).format(valor || 0);
  },

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-PE').format(valor || 0);
  },

  formatearMinutos(min: number): string {
    if (!min || min <= 0) return '0 min';
    if (min < 60) return `${Math.round(min)} min`;
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  },

  etiquetaTipoConsumo(tipo: string): string {
    const mapa: Record<string, string> = {
      A_HABITACION: 'A habitación',
      MESA_RESTAURANTE: 'Mesa restaurante',
      PARA_LLEVAR: 'Para llevar',
      DELIVERY: 'Delivery',
      ROOM_SERVICE: 'Room service',
      PISCINA: 'Piscina',
      TERRAZA: 'Terraza',
      EVENTO: 'Evento',
      OTRO: 'Otro',
    };
    return mapa[tipo] || tipo;
  },

  etiquetaMetodoPago(mp: string): string {
    const mapa: Record<string, string> = {
      EFECTIVO_PEN: 'Efectivo PEN',
      EFECTIVO_USD: 'Efectivo USD',
      YAPE: 'Yape',
      PLIN: 'Plin',
      NIUBIZ: 'Niubiz',
      IZIPAY: 'Izipay',
      QR_CCI: 'QR CCI',
      DEBITO: 'Débito',
      CREDITO: 'Crédito',
      TRANSFERENCIA_BANCARIA: 'Transferencia',
      CORTESIA: 'Cortesía',
      CUENTA_POR_COBRAR: 'Cuenta x cobrar',
      OTRO: 'Otro',
    };
    return mapa[mp] || mp;
  },

  fechaInputADate(fechaInput: string): Date {
    const [y, m, d] = fechaInput.split('-').map(Number);
    return new Date(y, m - 1, d);
  },

  fechaInputAISO(fechaInput: string, finDeDia = false): string {
    const d = this.fechaInputADate(fechaInput);
    return (finDeDia ? _endOfDay(d) : _startOfDay(d)).toISOString();
  },

  isoAFechaInput(iso: string): string {
    return _fmtFechaInput(new Date(iso));
  },
};
