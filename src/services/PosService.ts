// @ts-nocheck
import { db, seedUtil, type Create, type Update, type Comanda, type ComandaDetalle, type EstadoComanda, type TipoConsumoComanda, type TipoComanda, type PrioridadComanda, type Mesa, type ProductoFB, type PuntoVenta, type CargoFolio } from './__supabase_db__';
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

export const CatalogoFBService = {
  async listarCategorias(): Promise<any[]> {
    const rows = await db.allAsync<any>(KEY_CAT);
    return rows.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  },
  async listarProductos(params?: {
    categoriaId?: string;
    soloActivos?: boolean;
    buscar?: string;
    puntoVentaId?: string;
  }): Promise<ProductoFB[]> {
    let list = await db.allAsync<ProductoFB>(KEY_PROD);
    if (params?.soloActivos !== false) list = list.filter((p) => (p as any).estado === 'ACTIVO');
    if (params?.categoriaId) list = list.filter((p) => (p as any).categoriaId === params.categoriaId);
    if (params?.buscar) {
      const q = params.buscar.toLowerCase().trim();
      list = list.filter(
        (p: any) =>
          String(p.nombre || '').toLowerCase().includes(q) ||
          String(p.codigo || '').toLowerCase().includes(q) ||
          String(p.descripcion || '').toLowerCase().includes(q)
      );
    }
    return list;
  },
  async buscarProductoPorId(id: string): Promise<ProductoFB | undefined> {
    return db.getByIdAsync<ProductoFB>(KEY_PROD, id);
  },
  async listarPresentacionesProducto(productoId: string): Promise<any[]> {
    return db.findManyAsync<any>(KEY_PRES, (x: any) => x && x.productoId === productoId);
  },
  async listarModificadoresProducto(productoId: string): Promise<any[]> {
    const prod = await this.buscarProductoPorId(productoId);
    if (!prod) return [];
    const todos = await db.allAsync<any>(KEY_MOD);
    return todos.filter((m) => {
      if (!((prod as any).modificadoresIds || []).includes(m.id)) return false;
      if (m.aplicaA === 'CUALQUIER_PRODUCTO') return true;
      if (m.aplicaA === 'PRODUCTOS_ESPECIFICOS' && (m.aplicableCategoriaIds || []).length) {
        return (m.aplicableCategoriaIds || []).includes((prod as any).categoriaId);
      }
      return true;
    });
  },
  async listarAlergenosProducto(productoId: string): Promise<any[]> {
    const prod = await this.buscarProductoPorId(productoId);
    if (!prod) return [];
    const ids = new Set((prod as any).alergenosIds || []);
    return (await db.allAsync<any>(KEY_ALERG)).filter((x) => ids.has(x.id));
  },
};

export const PuntoVentaService = {
  async listarTodos(estado?: 'ACTIVO' | 'INACTIVO'): Promise<PuntoVenta[]> {
    let lista = await db.allAsync<PuntoVenta>(KEY_PV);
    if (estado) lista = lista.filter((p) => (p as any).estado === estado);
    return lista;
  },
  async buscarPorId(id: string): Promise<PuntoVenta | undefined> {
    return db.getByIdAsync<PuntoVenta>(KEY_PV, id);
  },
};

export const MesaService = {
  async listarTodas(params?: {
    puntoVentaId?: string;
    zona?: Mesa['zona'];
    estado?: Mesa['estado'];
    habitacionAsignadaId?: string;
  }): Promise<Mesa[]> {
    let lista = await db.allAsync<Mesa>(KEY_MESA);
    if (params?.puntoVentaId) lista = lista.filter((m) => (m as any).puntoVentaId === params.puntoVentaId);
    if (params?.zona) lista = lista.filter((m) => (m as any).zona === params.zona);
    if (params?.estado) lista = lista.filter((m) => (m as any).estado === params.estado);
    if (params?.habitacionAsignadaId) lista = lista.filter((m) => (m as any).habitacionAsignadaId === params.habitacionAsignadaId);
    return lista;
  },
  async buscarPorId(id: string): Promise<Mesa | undefined> {
    return db.getByIdAsync<Mesa>(KEY_MESA, id);
  },
  async buscarPorHabitacion(habitacionId: string): Promise<Mesa | undefined> {
    return db.findOneAsync<Mesa>(KEY_MESA, (m: any) => m && m.habitacionAsignadaId === habitacionId);
  },
  async crearRoomServiceSiNoExiste(params: {
    habitacionId: string;
    codHab: string;
    puntoVentaId: string;
    usuarioId: string;
  }): Promise<Mesa> {
    const { habitacionId, codHab, puntoVentaId, usuarioId } = params;
    const cod = String(codHab || 'ROOM').replace(/[^a-z0-9]/gi, '').toUpperCase() || 'ROOM';
    let existing = await db.findOneAsync<Mesa>(KEY_MESA, (m: any) => m && m.habitacionAsignadaId === habitacionId);
    if (existing) return existing;
    existing = await db.findOneAsync<Mesa>(KEY_MESA, (m: any) =>
      m && (
        String(m.codigo || '').toUpperCase() === cod ||
        String(m.nombreVisible || '').toUpperCase() === `HAB. ${cod}`
      )
    );
    if (existing) {
      try {
        const upd = await db.updateAsync<Mesa>(KEY_MESA, existing.id, {
          habitacionAsignadaId: habitacionId,
          nombreVisible: `Hab. ${String(codHab || cod)}`,
          updatedBy: usuarioId,
          updatedAt: seedUtil.nowISO(),
        } as unknown as Update<Mesa>);
        if (upd) return upd;
      } catch { return existing; }
      return existing;
    }
    const sinAsignar = await db.findOneAsync<Mesa>(KEY_MESA, (m: any) =>
      m &&
      String(m.zona || '').toUpperCase() === 'ROOM_SERVICE' &&
      (!m.habitacionAsignadaId || m.estado === 'LIBRE')
    );
    if (sinAsignar) {
      try {
        const upd = await db.updateAsync<Mesa>(KEY_MESA, sinAsignar.id, {
          habitacionAsignadaId: habitacionId,
          codigo: cod,
          nombreVisible: `Hab. ${String(codHab || cod)}`,
          updatedBy: usuarioId,
          updatedAt: seedUtil.nowISO(),
        } as unknown as Update<Mesa>);
        if (upd) return upd;
      } catch { return sinAsignar; }
      return sinAsignar;
    }
    const data = {
      puntoVentaId,
      codigo: cod,
      nombreVisible: `Hab. ${String(codHab || cod)}`,
      zona: 'ROOM_SERVICE' as Mesa['zona'],
      capacidadMaxPax: 4,
      capacidadActualUsada: 0,
      tipo: 'ROOM_SERVICE' as Mesa['tipo'],
      estado: 'LIBRE' as Mesa['estado'],
      esCombinable: false,
      mesaCombinadaIds: [],
      habitacionAsignadaId: habitacionId,
      proximaLimpiezaAt: null as any,
      observaciones: 'Mesa Room Service (auto)',
    };
    return db.addAsync<Mesa>(KEY_MESA, data as unknown as Create<Mesa>);
  },
  async cambiarEstado(id: string, estado: Mesa['estado'], actualizadoPor = 'system-mesas'): Promise<Mesa | undefined> {
    return db.updateAsync<Mesa>(KEY_MESA, id, {
      estado,
      updatedBy: actualizadoPor,
      updatedAt: seedUtil.nowISO(),
    } as unknown as Update<Mesa>);
  },
  async actualizarCapacidadUsada(id: string, pax: number, actualizadoPor = 'system-mesas'): Promise<Mesa | undefined> {
    const prev = await db.getByIdAsync<Mesa>(KEY_MESA, id);
    return db.updateAsync<Mesa>(KEY_MESA, id, {
      capacidadActualUsada: pax,
      estado: pax > 0 ? 'OCUPADA' : (prev?.estado || 'LIBRE'),
      updatedBy: actualizadoPor,
      updatedAt: seedUtil.nowISO(),
    } as unknown as Update<Mesa>);
  },
};

export const ComandaService = {
  async listarTodas(params?: {
    puntoVentaId?: string;
    mesaId?: string;
    habitacionId?: string;
    folioId?: string;
    estado?: EstadoComanda;
    tipo?: TipoComanda;
    buscar?: string;
    fechaDesdeISO?: string;
    fechaHastaISO?: string;
  }): Promise<Comanda[]> {
    let lista = (await db.allAsync<Comanda>(KEY_COM)).sort((a, b) =>
      String(b.fechaApertura || '').localeCompare(String(a.fechaApertura || ''))
    );
    if (params?.puntoVentaId) lista = lista.filter((c) => (c as any).puntoVentaId === params.puntoVentaId);
    if (params?.mesaId) lista = lista.filter((c) => (c as any).mesaId === params.mesaId);
    if (params?.habitacionId) lista = lista.filter((c) => (c as any).habitacionId === params.habitacionId);
    if (params?.folioId) lista = lista.filter((c) => (c as any).folioId === params.folioId);
    if (params?.estado) lista = lista.filter((c) => c.estado === params.estado);
    if (params?.tipo) lista = lista.filter((c) => (c as any).tipoComanda === params.tipo);
    if (params?.fechaDesdeISO) lista = lista.filter((c) => String(c.fechaApertura || '') >= params.fechaDesdeISO!);
    if (params?.fechaHastaISO) lista = lista.filter((c) => String(c.fechaApertura || '') <= params.fechaHastaISO!);
    if (params?.buscar) {
      const q = params.buscar.toLowerCase().trim();
      lista = lista.filter(
        (c: any) =>
          String(c.numeroCorrelativo || '').toLowerCase().includes(q) ||
          String(c.folioId || '').toLowerCase().includes(q) ||
          String(c.mesa?.nombreVisible || '').toLowerCase().includes(q) ||
          String(c.habitacion?.codigo || '').toLowerCase().includes(q)
      );
    }
    return Promise.all(lista.map((c) => this._enriquecer(c)));
  },

  async buscarPorId(id: string): Promise<Comanda | undefined> {
    const c = await db.getByIdAsync<Comanda>(KEY_COM, id);
    return c ? this._enriquecer(c) : undefined;
  },

  async _enriquecer(c: Comanda): Promise<Comanda> {
    const g: any = { ...c };
    g.detalles = await db.findManyAsync<ComandaDetalle>(KEY_COMDET, (d) => d.comandaId === c.id);
    if (g.mesaId && !g.mesa) g.mesa = await MesaService.buscarPorId(g.mesaId);
    if (g.habitacionId && !g.habitacion) g.habitacion = await db.getByIdAsync<any>('habitaciones', g.habitacionId);
    return this._recalcularTotalesEnMemoria(g);
  },

  _recalcularTotalesEnMemoria(c: Comanda): Comanda {
    const detalles = (c as any).detalles || [];
    const total = detalles.reduce((s: number, d: any) => s + Number(d.montoLinea || 0), 0);
    const subtotal = detalles.reduce((s: number, d: any) => s + Number(d.subtotal || 0), 0);
    const impuestos = detalles.reduce((s: number, d: any) =>
      s + (d.impuestosMontoDesglosado || []).reduce((s2: number, x: any) => s2 + Number(x.montoImpuesto || 0), 0),
      0
    );
    const descuentos = detalles.reduce((s: number, d: any) =>
      s + Number(d.descuentoMonto || 0), 0
    );
    const propinaSugerida = (c as any).propinaSugerida ?? Number((total * 0.10).toFixed(2));
    const impuestosDetalleMap = new Map<string, { impuestoId: string; impuestoNombre: string; montoImpuesto: number }>();
    for (const d of detalles) {
      const arr = (d.impuestosMontoDesglosado as any[]) || [];
      for (const x of arr) {
        const id = String(x.impuestoId);
        if (!id || id === 'IMP-SELVA-5') continue;
        const prev = impuestosDetalleMap.get(id) || { impuestoId: id, impuestoNombre: String(x.impuestoNombre || id), montoImpuesto: 0 };
        prev.montoImpuesto += Number(x.montoImpuesto || 0);
        impuestosDetalleMap.set(id, prev);
      }
    }
    let impuestosDetalle = Array.from(impuestosDetalleMap.values()).map((x) => ({ ...x, montoImpuesto: Number(x.montoImpuesto.toFixed(2)) }));
    if (impuestosDetalle.length === 0) {
      impuestosDetalle = [{ impuestoId: 'IMP-IGV-18', impuestoNombre: 'IGV 18%', montoImpuesto: Number((subtotal * 0.18).toFixed(2)) }];
    }
    return {
      ...c,
      totalNetoSinImpuestos: Number(subtotal.toFixed(2)),
      totalImpuestos: Number(impuestosDetalle.reduce((s, x) => s + Number(x.montoImpuesto || 0), 0).toFixed(2)),
      impuestosDetalle,
      totalDescuentos: Number(descuentos.toFixed(2)),
      propinaSugerida: Number(propinaSugerida.toFixed(2)),
      totalComanda: Number(total.toFixed(2)),
      totalFinalConPropina: Number((total + ((c as any).totalPropinas || 0)).toFixed(2)),
      saldoPendiente: Number((total + ((c as any).totalPropinas || 0) - ((c as any).totalCobrado || 0)).toFixed(2)),
    } as Comanda;
  },

  async recalcularTotales(id: string, updatedBy = 'system-comanda'): Promise<Comanda | undefined> {
    const c = await db.getByIdAsync<Comanda>(KEY_COM, id);
    if (!c) return undefined;
    const actualizados = this._recalcularTotalesEnMemoria({
      ...c,
      detalles: await db.findManyAsync<ComandaDetalle>(KEY_COMDET, (d) => d.comandaId === id),
    } as any);
    return db.updateAsync<Comanda>(KEY_COM, id, {
      ...(actualizados as any),
      updatedBy,
      updatedAt: seedUtil.nowISO(),
    } as unknown as Update<Comanda>);
  },

  async crear(params: {
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
  }): Promise<{ comanda: Comanda; cargosFolio?: CargoFolio[]; error?: string }> {
    const mesa = await MesaService.buscarPorId(params.mesaId);
    if (!mesa) return { comanda: null as any, error: 'Mesa no encontrada' };
    const puntoVenta = await PuntoVentaService.buscarPorId(params.puntoVentaId);
    if (!puntoVenta) return { comanda: null as any, error: 'Punto de venta no encontrado' };

    const esRoomService =
      params.tipoComanda === 'ROOM_SERVICE' ||
      (mesa as any).zona === 'ROOM_SERVICE' ||
      !!params.habitacionId ||
      params.tipoConsumo === 'CARGO_A_HABITACION';

    const habitacionId = params.habitacionId || (mesa as any).habitacionAsignadaId;
    let folioId = params.folioId;
    if (!folioId && habitacionId) {
      const f = await FolioService.buscarPorHabitacionAbierta(habitacionId);
      if (f) folioId = f.id;
    }

    const tipoComandaFinal = params.tipoComanda ?? (esRoomService ? 'ROOM_SERVICE' : 'MESA_RESTAURANTE');
    const tipoConsumoFinal =
      params.tipoConsumo ?? (esRoomService ? 'CARGO_A_HABITACION' : 'COBRO_DIRECTO');
    const prioridadFinal =
      params.prioridad ?? (esRoomService ? (params.paxAdultos && params.paxAdultos >= 4 ? 'ROOM_SERVICE_RAPIDO' : 'ROOM_SERVICE_NORMAL') : 'NORMAL');

    const comandaSeed = await db.addAsync<Comanda>(KEY_COM, {
      puntoVentaId: params.puntoVentaId,
      cajaSesionId: null as any,
      numeroCorrelativo: await this.siguienteNumeroCorrelativo(params.puntoVentaId, (puntoVenta as any).codigoPuntoVenta),
      mesaId: params.mesaId,
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
      turnoServicioId: null as any,
      fechaApertura: seedUtil.nowISO(),
      horaApertura: seedUtil.nowISO(),
      paxAdultos: params.paxAdultos ?? (mesa as any).capacidadActualUsada ?? 2,
      paxNinos: params.paxNinos ?? 0,
      moneda: (puntoVenta as any).monedaPredeterminada,
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
      horaEnvioKds: null as any,
      ticketsKdsIds: [],
      facturasIds: [],
      createdAt: seedUtil.nowISO(),
      updatedAt: seedUtil.nowISO(),
      createdBy: params.usuarioIdMozoApertura,
      updatedBy: params.usuarioIdMozoApertura,
    } as unknown as Create<Comanda>);

    const comandaId = comandaSeed.id;
    const cargosFolioCreados: CargoFolio[] = [];

    let numeroLineaFolio = 1;
    for (const linea of params.lineas) {
      const prod = await CatalogoFBService.buscarProductoPorId(linea.productoId);
      if (!prod) continue;
      const presentacionId = linea.presentacionId || ((prod as any).presentacionesActivasIds || [])[0] || '';
      const precio = Number((prod as any).precioVentaBase) || 0;
      const nominal = Number((linea.cantidad * precio).toFixed(2));
      const impuestosOrig = Array.isArray((prod as any).impuestosIds) && (prod as any).impuestosIds.length > 0 ? ((prod as any).impuestosIds as string[]).slice() : null;
      const selvaActivo = impuestosOrig ? impuestosOrig.includes('IMP-SELVA-5') : false;
      const igvActivo = impuestosOrig ? impuestosOrig.includes('IMP-IGV-18') : true;
      const impuestosIdsFinal: string[] = [];
      if (igvActivo) impuestosIdsFinal.push('IMP-IGV-18');
      if (selvaActivo) impuestosIdsFinal.push('IMP-SELVA-5');
      if (impuestosIdsFinal.length === 0) impuestosIdsFinal.push('IMP-IGV-18');
      const tieneSelva = impuestosIdsFinal.includes('IMP-SELVA-5');
      const divisor = tieneSelva ? 1.23 : 1.18;
      const baseImponible = Number((nominal / divisor).toFixed(2));
      const imps: any[] = [];
      for (const impId of impuestosIdsFinal) {
        const imp = await ImpuestoService.buscarPorId(impId);
        const porc = impId === 'IMP-IGV-18' ? 18 : 5;
        if (!imp) {
          imps.push({ impuestoId: impId, impuestoNombre: impId === 'IMP-IGV-18' ? 'IGV 18%' : 'IGV Selva 5%', montoImpuesto: 0 });
        } else {
          const monto = imp.tipo === 'PORCENTAJE' ? baseImponible * (porc / 100) : Number(imp.valor) || 0;
          imps.push({
            impuestoId: impId,
            impuestoNombre: imp.nombre || (impId === 'IMP-IGV-18' ? 'IGV 18%' : 'IGV Selva 5%'),
            montoImpuesto: Number(monto.toFixed(2)),
          });
        }
      }
      const totalImpuestos = Number(imps.reduce((s, x) => s + Number(x.montoImpuesto || 0), 0).toFixed(2));
      const montoLinea = nominal;
      const subtotal = baseImponible;
      const montoImpuesto = totalImpuestos;
      const detalle = await db.addAsync<ComandaDetalle>(KEY_COMDET, {
        comandaId,
        numeroLinea: 1,
        productoId: prod.id,
        presentacionId,
        cantidad: linea.cantidad,
        precioUnitario: precio,
        moneda: (puntoVenta as any).monedaPredeterminada,
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
        estacionCocinaId: ((prod as any).estacionesCocinaIds || [])[0] || null,
        usuarioIdAsignadoEstacion: null as any,
        horaSolicitado: seedUtil.nowISO(),
        horaInicioPreparacion: null as any,
        horaTerminoPreparacion: null as any,
        horaEntregado: null as any,
        esModificacion: false,
        comandaDetalleOrigenId: null as any,
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

      if (esRoomService && folioId && tipoConsumoFinal === 'CARGO_A_HABITACION') {
        const nombreUsuario = (params.usuarioIdMozoApertura === 'USR-MOISES-0001') ? 'Moisés Ochoa' : String(params.usuarioIdMozoApertura || 'Recepción');
        const monto = montoLinea;
        let folioHuespedId: string | undefined;
        if (folioId) {
          const ff = await FolioService.buscarPorId(folioId);
          if (ff) folioHuespedId = (ff as any).huespedId;
        }
        const cargoParams: Partial<CargoFolio> & any = {
          folioId,
          numeroLinea: numeroLineaFolio++,
          fechaCargo: seedUtil.nowISO(),
          concepto: `${linea.cantidad}× ${(prod as any).nombre} · ${(mesa as any).codigo}`,
          tipoConcepto: 'COMIDA_BEBIDA' as any,
          categoria: (prod as any).categoriaId || 'Comida y Bebida',
          habitacionId,
          comandaId,
          comandaDetalleId: detalle.id,
          conceptoDetalle: [
            `Comanda #${comandaSeed.numeroCorrelativo}`,
            `Hab: ${(mesa as any).codigo}`,
            `Mozo: ${nombreUsuario}`,
            ...(linea.observaciones ? [`Obs: ${linea.observaciones}`] : []),
          ],
          descripcion: `Comanda #${comandaSeed.numeroCorrelativo} · Hab ${(mesa as any).codigo} · Mozo ${params.usuarioIdMozoApertura}. ${linea.observaciones || ''}`,
          cantidad: linea.cantidad,
          unidadMedida: 'UND',
          precioUnitario: precio,
          descuentoMonto: 0,
          descuentoPorcentaje: 0,
          montoImpuesto,
          impuestoPorcentaje: (prod as any).impuestosIds?.length ? null : 23,
          subtotal,
          total: monto,
          monto,
          moneda: (puntoVenta as any).monedaPredeterminada,
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
          productoInventarioId: null as any,
          cajaSesionId: null as any,
          comprobanteAsociadoId: null as any,
          comentarios: `Cargo automático desde comanda #${comandaSeed.numeroCorrelativo}. Hab: ${habitacionId}.`,
          reservaId: params.reservaId,
          huespedId: params.huespedTitularId || folioHuespedId,
          referenciaId: detalle.id,
          referenciaExternaId: detalle.id,
          usuarioId: params.usuarioIdMozoApertura,
          estado: 'PENDIENTE_COBRO',
          tipo: 'CONSUMO_POS',
          origen: 'COMANDA_POS',
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
        const cargo = await CargoFolioService.crear(cargoParams);
        cargosFolioCreados.push(cargo);
      }
    }

    await MesaService.cambiarEstado(params.mesaId, 'OCUPADA', params.usuarioIdMozoApertura);

    const comandaActualizada = (await this.recalcularTotales(comandaId, params.usuarioIdMozoApertura))!;

    await db.updateAsync<Comanda>(KEY_COM, comandaId, {
      estado: 'EN_COCINA_BAR',
      estadoEntrega: 'EN_PROCESO',
      horaEnvioKds: seedUtil.nowISO(),
      updatedBy: params.usuarioIdMozoApertura,
      updatedAt: seedUtil.nowISO(),
    } as unknown as Update<Comanda>);

    return {
      comanda: (await this.buscarPorId(comandaId))!,
      cargosFolio: cargosFolioCreados,
    };
  },

  async siguienteNumeroCorrelativo(puntoVentaId: string, prefijo = 'C'): Promise<string> {
    const existentes = (await this.listarTodas({ puntoVentaId })).map((c) => {
      const clean = String(c.numeroCorrelativo || '').replace(/\D/g, '');
      return clean ? parseInt(clean, 10) : 0;
    });
    const max = existentes.reduce((m, n) => (n > m ? n : m), 900);
    return `${prefijo}-${max + 1}`;
  },

  async agregarLinea(comandaId: string, linea: Create<ComandaDetalle> & { usuarioId: string }): Promise<ComandaDetalle | undefined> {
    const detalle = await db.addAsync<ComandaDetalle>(KEY_COMDET, {
      comandaId,
      ...linea,
      createdBy: linea.usuarioId,
      updatedBy: linea.usuarioId,
      createdAt: seedUtil.nowISO(),
      updatedAt: seedUtil.nowISO(),
    } as unknown as Create<ComandaDetalle>);

    const comanda = await this.buscarPorId(comandaId);
    if ((comanda as any)?.folioId && (comanda as any)?.tipoConsumo === 'CARGO_A_HABITACION') {
      const prod = await CatalogoFBService.buscarProductoPorId((detalle as any).productoId);
      if (prod) {
        await CargoFolioService.crear({
          folioId: (comanda as any).folioId,
          tipo: 'CONSUMO_POS',
          concepto: `${(detalle as any).cantidad}× ${(prod as any).nombre}`,
          descripcion: `Agregado a comanda #${comanda.numeroCorrelativo}`,
          origen: 'COMANDA_POS',
          referenciaId: detalle.id,
          reservaId: (comanda as any).reservaId || undefined,
          habitacionId: (comanda as any).habitacionId || undefined,
          huespedId: (comanda as any).huespedTitularId || undefined,
          productoInventarioId: null as any,
          comandaId: comanda.id,
          comandaDetalleId: detalle.id,
          cajaSesionId: null as any,
          usuarioId: linea.usuarioId,
          monto: (detalle as any).montoLinea,
          moneda: (detalle as any).moneda || 'PEN',
          impuestosIds: (detalle as any).impuestosIds,
          impuestosMontoDesglosado: (detalle as any).impuestosMontoDesglosado,
          subtotal: (detalle as any).subtotal,
          descuentosIds: [],
          descuentosMontoDesglosado: [],
          propinaMonto: (detalle as any).esPropina ? (detalle as any).montoLinea : 0,
          estado: 'PENDIENTE_COBRO',
          fechaCargo: seedUtil.nowISO(),
          fechaAplicacion: seedUtil.nowISO(),
          fechaVencimiento: null as any,
          esAnulado: false,
          motivoAnulacion: '',
          comprobanteAsociadoId: null as any,
          comentarios: (detalle as any).observaciones || '',
          createdAt: seedUtil.nowISO(),
          updatedAt: seedUtil.nowISO(),
          createdBy: linea.usuarioId,
          updatedBy: linea.usuarioId,
        } as Create<CargoFolio>);
      }
    }

    await this.recalcularTotales(comandaId, linea.usuarioId);
    return detalle;
  },

  async cambiarEstado(comandaId: string, nuevoEstado: EstadoComanda, usuarioId: string, comentario?: string): Promise<Comanda | undefined> {
    const actualizados = await db.updateAsync<Comanda>(KEY_COM, comandaId, {
      estado: nuevoEstado,
      updatedBy: usuarioId,
      updatedAt: seedUtil.nowISO(),
      observacionesInternas: comentario,
    } as unknown as Update<Comanda>);
    return actualizados ? this.buscarPorId(actualizados.id) : undefined;
  },

  async cerrarYcobrar(params: {
    comandaId: string;
    usuarioId: string;
    metodoPago: any;
    montoTotalCobrado: number;
    montoVuelto?: number;
    referencia?: string;
    observaciones?: string;
    incluyePropinaMonto?: number;
  }): Promise<Comanda | undefined> {
    const comanda = await this.buscarPorId(params.comandaId);
    if (!comanda) return undefined;

    if ((comanda as any).mesaId && (comanda as any).mesa?.zona !== 'ROOM_SERVICE') {
      await MesaService.cambiarEstado((comanda as any).mesaId, 'SUCIA', params.usuarioId);
    }

    const cerrada = await db.updateAsync<Comanda>(KEY_COM, params.comandaId, {
      estado: 'CERRADA_COBRADA',
      estadoEntrega: 'COBRADA_Y_CERRADA',
      cierre: {
        id: seedUtil.generateUUID(),
        comandaId: params.comandaId,
        tipo: (comanda as any).tipoConsumo === 'CARGO_A_HABITACION' ? 'CARGO_A_FOLIO' : 'COBRO_DIRECTO',
        folioIdCargado: (comanda as any).folioId,
        cajaSesionId: null,
        usuarioIdCierre: params.usuarioId,
        fechaHoraCierre: seedUtil.nowISO(),
        observaciones: params.observaciones || '',
        createdAt: seedUtil.nowISO(),
        updatedAt: seedUtil.nowISO(),
        createdBy: params.usuarioId,
        updatedBy: params.usuarioId,
      } as any,
      totalCobrado: Number(((comanda as any).totalCobrado + params.montoTotalCobrado).toFixed(2)),
      totalPropinas: Number(((comanda as any).totalPropinas + (params.incluyePropinaMonto || 0)).toFixed(2)),
      propinaAplicadaMonto: params.incluyePropinaMonto || (comanda as any).propinaAplicadaMonto || 0,
      fechaCierre: seedUtil.nowISO(),
      horaCierre: seedUtil.nowISO(),
      updatedBy: params.usuarioId,
      updatedAt: seedUtil.nowISO(),
    } as unknown as Update<Comanda>);

    return cerrada ? this.buscarPorId(cerrada.id) : undefined;
  },

  reiniciarSeed(): void {
    db.reset();
  },
};

export default ComandaService;
