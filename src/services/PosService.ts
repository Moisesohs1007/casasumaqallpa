import { db, seedUtil, type Create, type Update, type Comanda, type ComandaDetalle, type EstadoComanda, type TipoConsumoComanda, type TipoComanda, type PrioridadComanda, type Mesa, type ProductoFB, type PuntoVenta, type CargoFolio } from './__db__';
import { FolioService, CargoFolioService } from './FolioService';
import { ImpuestoService } from './TarifaService';

const KEY_PV = 'puntosVenta';
const KEY_MESA = 'mesas';
const KEY_COM = 'comandas';
const KEY_COMDET = 'comandasDetalles';
const KEY_CAT = 'categoriasFB';
const KEY_PROD = 'productosFB';
const KEY_PRES = 'presentacionesFB';
const KEY_MOD = 'modificadoresFB';
const KEY_ALERG = 'alergenos';

// Init detalles comandas desde seed
try {
  const existentes = db.all<ComandaDetalle>(KEY_COMDET);
  if (existentes.length === 0) {
    const comandas = db.all<Comanda>(KEY_COM);
    for (const c of comandas) {
      for (const d of c.detalles || []) {
        if (!existentes.find((x) => x.id === d.id)) {
          db.add<ComandaDetalle>(KEY_COMDET, { ...d, comandaId: c.id } as Create<ComandaDetalle>);
        }
      }
    }
  }
} catch {}

export const CatalogoFBService = {
  listarCategorias(): any[] {
    return db.all<any>(KEY_CAT).sort((a, b) => a.orden - b.orden);
  },
  listarProductos(params?: {
    categoriaId?: string;
    soloActivos?: boolean;
    buscar?: string;
    puntoVentaId?: string;
  }): ProductoFB[] {
    let list = db.all<ProductoFB>(KEY_PROD);
    if (params?.soloActivos !== false) list = list.filter((p) => p.estado === 'ACTIVO');
    if (params?.categoriaId) list = list.filter((p) => p.categoriaId === params.categoriaId);
    if (params?.buscar) {
      const q = params.buscar.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.codigo.toLowerCase().includes(q) ||
          (p.descripcion || '').toLowerCase().includes(q)
      );
    }
    return list;
  },
  buscarProductoPorId(id: string): ProductoFB | undefined {
    return db.getById<ProductoFB>(KEY_PROD, id);
  },
  listarPresentacionesProducto(productoId: string): any[] {
    return db.findMany<any>(KEY_PRES, (x: any) => x.productoId === productoId);
  },
  listarModificadoresProducto(productoId: string): any[] {
    const prod = this.buscarProductoPorId(productoId);
    if (!prod) return [];
    const todos = db.all<any>(KEY_MOD);
    return todos.filter((m) => {
      if (!prod.modificadoresIds.includes(m.id)) return false;
      if (m.aplicaA === 'CUALQUIER_PRODUCTO') return true;
      if (m.aplicaA === 'PRODUCTOS_ESPECIFICOS' && m.aplicableCategoriaIds?.length) {
        return m.aplicableCategoriaIds.includes(prod.categoriaId);
      }
      return true;
    });
  },
  listarAlergenosProducto(productoId: string): any[] {
    const prod = this.buscarProductoPorId(productoId);
    if (!prod) return [];
    return db.findMany<any>(KEY_ALERG, (x: any) => prod.alergenosIds.includes(x.id));
  },
};

export const PuntoVentaService = {
  listarTodos(estado?: 'ACTIVO' | 'INACTIVO'): PuntoVenta[] {
    let lista = db.all<PuntoVenta>(KEY_PV);
    if (estado) lista = lista.filter((p) => p.estado === estado);
    return lista;
  },
  buscarPorId(id: string): PuntoVenta | undefined {
    return db.getById<PuntoVenta>(KEY_PV, id);
  },
};

export const MesaService = {
  listarTodas(params?: {
    puntoVentaId?: string;
    zona?: Mesa['zona'];
    estado?: Mesa['estado'];
    habitacionAsignadaId?: string;
  }): Mesa[] {
    let lista = db.all<Mesa>(KEY_MESA);
    if (params?.puntoVentaId) lista = lista.filter((m) => m.puntoVentaId === params.puntoVentaId);
    if (params?.zona) lista = lista.filter((m) => m.zona === params.zona);
    if (params?.estado) lista = lista.filter((m) => m.estado === params.estado);
    if (params?.habitacionAsignadaId) lista = lista.filter((m) => m.habitacionAsignadaId === params.habitacionAsignadaId);
    return lista;
  },
  buscarPorId(id: string): Mesa | undefined {
    return db.getById<Mesa>(KEY_MESA, id);
  },
  buscarPorHabitacion(habitacionId: string): Mesa | undefined {
    return db.findOne<Mesa>(KEY_MESA, (m) => m.habitacionAsignadaId === habitacionId);
  },
  cambiarEstado(id: string, estado: Mesa['estado'], actualizadoPor = 'system-mesas'): Mesa | undefined {
    return db.update<Mesa>(KEY_MESA, id, {
      estado,
      updatedBy: actualizadoPor,
      updatedAt: seedUtil.nowISO(),
    } as unknown as Update<Mesa>);
  },
  actualizarCapacidadUsada(id: string, pax: number, actualizadoPor = 'system-mesas'): Mesa | undefined {
    return db.update<Mesa>(KEY_MESA, id, {
      capacidadActualUsada: pax,
      estado: pax > 0 ? 'OCUPADA' : db.getById<Mesa>(KEY_MESA, id)?.estado || 'LIBRE',
      updatedBy: actualizadoPor,
      updatedAt: seedUtil.nowISO(),
    } as unknown as Update<Mesa>);
  },
};

export const ComandaService = {
  listarTodas(params?: {
    puntoVentaId?: string;
    mesaId?: string;
    habitacionId?: string;
    folioId?: string;
    estado?: EstadoComanda;
    tipo?: TipoComanda;
    buscar?: string;
    fechaDesdeISO?: string;
    fechaHastaISO?: string;
  }): Comanda[] {
    let lista = db.all<Comanda>(KEY_COM).sort((a, b) =>
      (b.fechaApertura || '').localeCompare(a.fechaApertura || '')
    );
    if (params?.puntoVentaId) lista = lista.filter((c) => c.puntoVentaId === params.puntoVentaId);
    if (params?.mesaId) lista = lista.filter((c) => c.mesaId === params.mesaId);
    if (params?.habitacionId) lista = lista.filter((c) => c.habitacionId === params.habitacionId);
    if (params?.folioId) lista = lista.filter((c) => c.folioId === params.folioId);
    if (params?.estado) lista = lista.filter((c) => c.estado === params.estado);
    if (params?.tipo) lista = lista.filter((c) => c.tipoComanda === params.tipo);
    if (params?.fechaDesdeISO) lista = lista.filter((c) => (c.fechaApertura || '') >= params.fechaDesdeISO!);
    if (params?.fechaHastaISO) lista = lista.filter((c) => (c.fechaApertura || '') <= params.fechaHastaISO!);
    if (params?.buscar) {
      const q = params.buscar.toLowerCase().trim();
      lista = lista.filter(
        (c) =>
          c.numeroCorrelativo.toLowerCase().includes(q) ||
          (c.folioId || '').toLowerCase().includes(q) ||
          (c.mesa?.nombreVisible || '').toLowerCase().includes(q) ||
          (c.habitacion?.codigo || '').toLowerCase().includes(q)
      );
    }
    return lista.map((c) => this._enriquecer(c));
  },

  buscarPorId(id: string): Comanda | undefined {
    const c = db.getById<Comanda>(KEY_COM, id);
    return c ? this._enriquecer(c) : undefined;
  },

  _enriquecer(c: Comanda): Comanda {
    c.detalles = db.findMany<ComandaDetalle>(KEY_COMDET, (d) => d.comandaId === c.id);
    if (c.mesaId && !c.mesa) c.mesa = MesaService.buscarPorId(c.mesaId);
    if (c.habitacionId && !c.habitacion) c.habitacion = (db.getById<any>('habitaciones', c.habitacionId));
    if (c.folioId && !c.folioId) { /* noop */ }
    return this._recalcularTotalesEnMemoria(c);
  },

  _recalcularTotalesEnMemoria(c: Comanda): Comanda {
    const detalles = c.detalles || [];
    const total = detalles.reduce((s, d) => s + Number(d.montoLinea || 0), 0);
    const subtotal = detalles.reduce((s, d) => s + Number(d.subtotal || 0), 0);
    const impuestos = detalles.reduce((s, d) =>
      s + (d.impuestosMontoDesglosado || []).reduce((s2, x) => s2 + Number(x.montoImpuesto || 0), 0),
      0
    );
    const descuentos = detalles.reduce((s, d) =>
      s + Number(d.descuentoMonto || 0), 0
    );
    const propinaSugerida = c.propinaSugerida ?? Number((total * 0.10).toFixed(2));
    return {
      ...c,
      totalNetoSinImpuestos: Number(subtotal.toFixed(2)),
      totalImpuestos: Number(impuestos.toFixed(2)),
      impuestosDetalle: [
        { impuestoId: 'IMP-IGV-18', impuestoNombre: 'IGV 18%', montoImpuesto: Number((subtotal * 0.18).toFixed(2)) },
        { impuestoId: 'IMP-SELVA-5', impuestoNombre: 'IGV Selva 5%', montoImpuesto: Number((subtotal * 0.05).toFixed(2)) },
      ],
      totalDescuentos: Number(descuentos.toFixed(2)),
      propinaSugerida: Number(propinaSugerida.toFixed(2)),
      totalComanda: Number(total.toFixed(2)),
      totalFinalConPropina: Number((total + c.totalPropinas).toFixed(2)),
      saldoPendiente: Number((total + c.totalPropinas - c.totalCobrado).toFixed(2)),
    };
  },

  recalcularTotales(id: string, updatedBy = 'system-comanda'): Comanda | undefined {
    const c = db.getById<Comanda>(KEY_COM, id);
    if (!c) return undefined;
    const actualizados = this._recalcularTotalesEnMemoria({
      ...c,
      detalles: db.findMany<ComandaDetalle>(KEY_COMDET, (d) => d.comandaId === id),
    });
    return db.update<Comanda>(KEY_COM, id, {
      ...actualizados,
      updatedBy,
      updatedAt: seedUtil.nowISO(),
    } as unknown as Update<Comanda>);
  },

  /** A.4: Tomar comanda nueva. Si es room service → CARGO AUTOMATICO al folio. */
  crear(params: {
    puntoVentaId: string;
    mesaId: string;
    usuarioIdMozoApertura: string;
    habitacionId?: string;
    folioId?: string;
    reservaId?: string;
    huespedTitularId?: string;
    tipoComanda?: TipoComanda;
    tipoConsumo?: TipoConsumoComanda;
    prioridad?: PrioridadComanda;
    paxAdultos?: number;
    paxNinos?: number;
    observacionesInternas?: string;
    lineas: Array<{
      productoId: string;
      presentacionId?: string;
      cantidad: number;
      observaciones?: string;
      modificadoresAplicados?: any[];
    }>;
    modoAnulacionDescuentos?: any;
  }): { comanda: Comanda; cargosFolio?: CargoFolio[]; error?: string } {
    const mesa = MesaService.buscarPorId(params.mesaId);
    if (!mesa) return { comanda: null as any, error: 'Mesa no encontrada' };
    const puntoVenta = PuntoVentaService.buscarPorId(params.puntoVentaId);
    if (!puntoVenta) return { comanda: null as any, error: 'Punto de venta no encontrado' };

    const esRoomService =
      params.tipoComanda === 'ROOM_SERVICE' ||
      mesa.zona === 'ROOM_SERVICE' ||
      !!params.habitacionId ||
      params.tipoConsumo === 'CARGO_A_HABITACION';

    const habitacionId = params.habitacionId || mesa.habitacionAsignadaId;
    const folioId = params.folioId || (habitacionId ? FolioService.buscarPorHabitacionAbierta(habitacionId)?.id : undefined);

    const tipoComandaFinal = params.tipoComanda ?? (esRoomService ? 'ROOM_SERVICE' : 'MESA_RESTAURANTE');
    const tipoConsumoFinal =
      params.tipoConsumo ?? (esRoomService ? 'CARGO_A_HABITACION' : 'COBRO_DIRECTO');
    const prioridadFinal =
      params.prioridad ?? (esRoomService ? (params.paxAdultos && params.paxAdultos >= 4 ? 'ROOM_SERVICE_RAPIDO' : 'ROOM_SERVICE_NORMAL') : 'NORMAL');

    const mesaIdNuevo = params.mesaId;
    const comandaSeed = db.add<Comanda>(KEY_COM, {
      puntoVentaId: params.puntoVentaId,
      cajaSesionId: null,
      numeroCorrelativo: this.siguienteNumeroCorrelativo(params.puntoVentaId, puntoVenta.codigoPuntoVenta),
      mesaId: mesaIdNuevo,
      habitacionId,
      folioId,
      reservaId: params.reservaId,
      huespedTitularId: params.huespedTitularId,
      tipoComanda: tipoComandaFinal,
      tipoConsumo: tipoConsumoFinal,
      prioridad: prioridadFinal,
      estado: 'ABIERTA',
      estadoEntrega: 'TOMANDO_ORDEN',
      modoAtencion: tipoComandaFinal === 'ROOM_SERVICE' ? 'ROOM_SERVICE' : 'EN_SALON',
      usuarioIdMozoApertura: params.usuarioIdMozoApertura,
      turnoServicioId: null,
      fechaApertura: seedUtil.nowISO(),
      horaApertura: seedUtil.nowISO(),
      paxAdultos: params.paxAdultos ?? mesa.capacidadActualUsada ?? 2,
      paxNinos: params.paxNinos ?? 0,
      moneda: puntoVenta.monedaPredeterminada,
      detalles: [],
      totalNetoSinImpuestos: 0,
      totalImpuestos: 0,
      impuestosDetalle: [],
      totalDescuentos: 0,
      propinaSugerida: 0,
      propinaAplicadaMonto: 0,
      totalPropinas: 0,
      totalComanda: 0,
      totalFinalConPropina: 0,
      saldoPendiente: 0,
      totalCobrado: 0,
      cobros: [],
      observacionesInternas: params.observacionesInternas || '',
      horaEnvioKds: null,
      ticketsKdsIds: [],
      facturasIds: [],
      createdAt: seedUtil.nowISO(),
      updatedAt: seedUtil.nowISO(),
      createdBy: params.usuarioIdMozoApertura,
      updatedBy: params.usuarioIdMozoApertura,
    } as unknown as Create<Comanda>);

    const comandaId = comandaSeed.id;
    const cargosFolioCreados: CargoFolio[] = [];

    // Insertar líneas
    let numeroLineaFolio = 1;
    for (const linea of params.lineas) {
      const prod = CatalogoFBService.buscarProductoPorId(linea.productoId);
      if (!prod) continue;
      const presentacionId = linea.presentacionId || prod.presentacionesActivasIds[0] || '';
      const precio = prod.precioVentaBase;
      const imps = (prod.impuestosIds && prod.impuestosIds.length ? prod.impuestosIds : ['IMP-IGV-18', 'IMP-SELVA-5']).map((impId) => {
        const imp = ImpuestoService.buscarPorId(impId);
        if (!imp) return { impuestoId: impId, impuestoNombre: impId || 'IMPUESTO', montoImpuesto: 0 };
        const base = (linea.cantidad * precio) / 1.23;
        return {
          impuestoId,
          impuestoNombre: imp.nombre || impId,
          montoImpuesto: Number((imp.tipo === 'PORCENTAJE' ? ((base * imp.valor) / 100).toFixed(2) : '0') as unknown as number),
        };
      });
      const totalImpuestos = Number(imps.reduce((s, x) => s + Number(x.montoImpuesto || 0), 0).toFixed(2));
      const montoLinea = Number((linea.cantidad * precio).toFixed(2));
      const subtotal = Number(Math.max(0, montoLinea - totalImpuestos).toFixed(2));
      const montoImpuesto = totalImpuestos;
      const detalle = db.add<ComandaDetalle>(KEY_COMDET, {
        comandaId,
        numeroLinea: 1,
        productoId: prod.id,
        presentacionId,
        cantidad: linea.cantidad,
        precioUnitario: precio,
        moneda: puntoVenta.monedaPredeterminada,
        descuentoPorcentaje: 0,
        descuentoMonto: 0,
        observaciones: linea.observaciones || '',
        seleccionModificadores: linea.modificadoresAplicados || [],
        alergenosOmitidosIds: [],
        impuestosIds: imps.map((i) => i.impuestoId),
        impuestosMontoDesglosado: imps as any,
        subtotal,
        montoLinea,
        estadoPreparacion: 'PENDIENTE',
        estacionCocinaId: prod.estacionesCocinaIds?.[0] || null,
        usuarioIdAsignadoEstacion: null,
        horaSolicitado: seedUtil.nowISO(),
        horaInicioPreparacion: null,
        horaTerminoPreparacion: null,
        horaEntregado: null,
        esModificacion: false,
        comandaDetalleOrigenId: null,
        esCortesia: false,
        motivoCortesia: '',
        esComplementoCargo: false,
        ticketImpresoKds: false,
        comentariosInternos: '',
        createdAt: seedUtil.nowISO(),
        updatedAt: seedUtil.nowISO(),
        createdBy: params.usuarioIdMozoApertura,
        updatedBy: params.usuarioIdMozoApertura,
      } as unknown as Create<ComandaDetalle>);

      // Si es ROOM_SERVICE con folio abierto → CREAR CARGO_AUTOMÁTICO al Folio
      if (esRoomService && folioId && tipoConsumoFinal === 'CARGO_A_HABITACION') {
        const nombreUsuario = (params.usuarioIdMozoApertura === 'USR-MOISES-0001') ? 'Moisés Ochoa' : String(params.usuarioIdMozoApertura || 'Recepción');
        const monto = montoLinea;
        const cargoParams: Partial<CargoFolio> & any = {
          folioId,
          numeroLinea: numeroLineaFolio++,
          fechaCargo: seedUtil.nowISO(),
          concepto: `${linea.cantidad}× ${prod.nombre} · ${mesa.codigo}`,
          tipoConcepto: 'COMIDA_BEBIDA' as any,
          categoria: prod.categoriaId || 'Comida y Bebida',
          habitacionId,
          comandaId,
          comandaDetalleId: detalle.id,
          conceptoDetalle: [
            `Comanda #${comandaSeed.numeroCorrelativo}`,
            `Hab: ${mesa.codigo}`,
            `Mozo: ${nombreUsuario}`,
            ...(linea.observaciones ? [`Obs: ${linea.observaciones}`] : []),
          ],
          descripcion: `Comanda #${comandaSeed.numeroCorrelativo} · Hab ${mesa.codigo} · Mozo ${params.usuarioIdMozoApertura}. ${linea.observaciones || ''}`,
          cantidad: linea.cantidad,
          unidadMedida: 'UND',
          precioUnitario: precio,
          descuentoMonto: 0,
          descuentoPorcentaje: 0,
          montoImpuesto,
          impuestoPorcentaje: prod.impuestosIds?.length ? null : 23,
          subtotal,
          total: monto,
          monto,
          moneda: puntoVenta.monedaPredeterminada,
          cargoAuto: true,
          origenCargo: 'ROOM_SERVICE',
          nombreUsuarioAplicaCargo: nombreUsuario,
          usuarioRegistroId: params.usuarioIdMozoApertura,
          autorizadoPor: nombreUsuario,
          anulado: false,
          esAnulado: false,
          motivoAnulacion: '',
          fechaAplicacion: seedUtil.nowISO(),
          fechaVencimiento: null as any,
          productoInventarioId: null,
          cajaSesionId: null,
          comprobanteAsociadoId: null,
          comentarios: `Cargo automático desde comanda #${comandaSeed.numeroCorrelativo}. Hab: ${habitacionId}.`,
          reservaId: params.reservaId,
          huespedId: params.huespedTitularId || (folioId ? FolioService.buscarPorId(folioId)?.huespedId : undefined),
          referenciaId: detalle.id,
          referenciaExternaId: detalle.id,
          usuarioId: params.usuarioIdMozoApertura,
          estado: 'PENDIENTE_COBRO',
          impuestosIds: imps.map((i) => i.impuestoId),
          impuestosMontoDesglosado: imps as any,
          descuentosIds: [],
          descuentosMontoDesglosado: [],
          propinaMonto: 0,
          aplicaIgv: true,
          createdAt: seedUtil.nowISO(),
          updatedAt: seedUtil.nowISO(),
          createdBy: params.usuarioIdMozoApertura,
          updatedBy: params.usuarioIdMozoApertura,
        };
        const cargo = CargoFolioService.crear(cargoParams);
        cargosFolioCreados.push(cargo);
      }
    }

    // Actualizar mesa: ocupar
    MesaService.cambiarEstado(mesaIdNuevo, 'OCUPADA', params.usuarioIdMozoApertura);

    // Recalcular totales
    const comandaActualizada = this.recalcularTotales(comandaId, params.usuarioIdMozoApertura)!;

    // Enviar a KDS marcar hora
    db.update<Comanda>(KEY_COM, comandaId, {
      estado: 'EN_COCINA_BAR',
      estadoEntrega: 'EN_PROCESO',
      horaEnvioKds: seedUtil.nowISO(),
    } as unknown as Update<Comanda>);

    return {
      comanda: this.buscarPorId(comandaId)!,
      cargosFolio: cargosFolioCreados,
    };
  },

  siguienteNumeroCorrelativo(puntoVentaId: string, prefijo = 'C'): string {
    const existentes = this.listarTodas({ puntoVentaId }).map((c) => {
      const clean = c.numeroCorrelativo.replace(/\D/g, '');
      return clean ? parseInt(clean, 10) : 0;
    });
    const max = existentes.reduce((m, n) => (n > m ? n : m), 900);
    return `${prefijo}-${max + 1}`;
  },

  agregarLinea(comandaId: string, linea: Create<ComandaDetalle> & { usuarioId: string }): ComandaDetalle | undefined {
    const detalle = db.add<ComandaDetalle>(KEY_COMDET, {
      comandaId,
      ...linea,
      createdBy: linea.usuarioId,
      updatedBy: linea.usuarioId,
      createdAt: seedUtil.nowISO(),
      updatedAt: seedUtil.nowISO(),
    } as unknown as Create<ComandaDetalle>);

    // Cargo automático si la comanda es room service
    const comanda = this.buscarPorId(comandaId);
    if (comanda?.folioId && comanda.tipoConsumo === 'CARGO_A_HABITACION') {
      const prod = CatalogoFBService.buscarProductoPorId(detalle.productoId);
      if (prod) {
        CargoFolioService.crear({
          folioId: comanda.folioId,
          tipo: 'CONSUMO_POS',
          concepto: `${detalle.cantidad}× ${prod.nombre}`,
          descripcion: `Agregado a comanda #${comanda.numeroCorrelativo}`,
          origen: 'COMANDA_POS',
          referenciaId: detalle.id,
          reservaId: comanda.reservaId || undefined,
          habitacionId: comanda.habitacionId || undefined,
          huespedId: comanda.huespedTitularId || undefined,
          productoInventarioId: null,
          comandaId: comanda.id,
          comandaDetalleId: detalle.id,
          cajaSesionId: null,
          usuarioId: linea.usuarioId,
          monto: detalle.montoLinea,
          moneda: detalle.moneda || 'PEN',
          impuestosIds: detalle.impuestosIds,
          impuestosMontoDesglosado: detalle.impuestosMontoDesglosado,
          subtotal: detalle.subtotal,
          descuentosIds: [],
          descuentosMontoDesglosado: [],
          propinaMonto: detalle.esPropina ? detalle.montoLinea : 0,
          estado: 'PENDIENTE_COBRO',
          fechaCargo: seedUtil.nowISO(),
          fechaAplicacion: seedUtil.nowISO(),
          fechaVencimiento: null as any,
          esAnulado: false,
          motivoAnulacion: '',
          comprobanteAsociadoId: null,
          comentarios: detalle.observaciones || '',
          createdAt: seedUtil.nowISO(),
          updatedAt: seedUtil.nowISO(),
          createdBy: linea.usuarioId,
          updatedBy: linea.usuarioId,
        } as Create<CargoFolio>);
      }
    }

    this.recalcularTotales(comandaId, linea.usuarioId);
    return detalle;
  },

  cambiarEstado(comandaId: string, nuevoEstado: EstadoComanda, usuarioId: string, comentario?: string): Comanda | undefined {
    const actualizados = db.update<Comanda>(KEY_COM, comandaId, {
      estado: nuevoEstado,
      updatedBy: usuarioId,
      updatedAt: seedUtil.nowISO(),
      observacionesInternas: comentario,
    } as unknown as Update<Comanda>);
    return this.buscarPorId(actualizados!.id);
  },

  /** A.5: Cerrar comanda y cobrarla. */
  cerrarYcobrar(params: {
    comandaId: string;
    usuarioId: string;
    metodoPago: any;
    montoTotalCobrado: number;
    montoVuelto?: number;
    referencia?: string;
    observaciones?: string;
    incluyePropinaMonto?: number;
  }): Comanda | undefined {
    const comanda = this.buscarPorId(params.comandaId);
    if (!comanda) return undefined;

    // Actualizar mesa a limpiar
    if (comanda.mesaId && comanda.mesa?.zona !== 'ROOM_SERVICE') {
      MesaService.cambiarEstado(comanda.mesaId, 'SUCIA', params.usuarioId);
    }

    // Cambiar estado comanda
    const cerrada = db.update<Comanda>(KEY_COM, params.comandaId, {
      estado: 'CERRADA_COBRADA',
      estadoEntrega: 'COBRADA_Y_CERRADA',
      cierre: {
        id: seedUtil.generateUUID(),
        comandaId: params.comandaId,
        tipo: comanda.tipoConsumo === 'CARGO_A_HABITACION' ? 'CARGO_A_FOLIO' : 'COBRO_DIRECTO',
        folioIdCargado: comanda.folioId,
        cajaSesionId: null,
        usuarioIdCierre: params.usuarioId,
        fechaHoraCierre: seedUtil.nowISO(),
        observaciones: params.observaciones || '',
        createdAt: seedUtil.nowISO(),
        updatedAt: seedUtil.nowISO(),
        createdBy: params.usuarioId,
        updatedBy: params.usuarioId,
      } as any,
      totalCobrado: Number((comanda.totalCobrado + params.montoTotalCobrado).toFixed(2)),
      totalPropinas: Number((comanda.totalPropinas + (params.incluyePropinaMonto || 0)).toFixed(2)),
      propinaAplicadaMonto: params.incluyePropinaMonto || comanda.propinaAplicadaMonto || 0,
      fechaCierre: seedUtil.nowISO(),
      horaCierre: seedUtil.nowISO(),
      updatedBy: params.usuarioId,
      updatedAt: seedUtil.nowISO(),
    } as unknown as Update<Comanda>);

    return this.buscarPorId(cerrada!.id);
  },

  reiniciarSeed(): void {
    db.reset();
  },
};
