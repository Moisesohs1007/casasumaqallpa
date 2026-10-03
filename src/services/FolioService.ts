// @ts-nocheck
import { db, seedUtil, type Create, type Update, type Folio, type CargoFolio, type PagoFolio, type Reserva, type Habitacion } from './__supabase_db__';
import type { EstadoFolio, EstadoPago, MetodoPago } from '../types';
import { ReservaService } from './ReservaService';
import { HabitacionService } from './HabitacionService';
import { HuespedService } from './HuespedService';
import { ImpuestoService } from './TarifaService';

const KEY_FOLIO = 'folios';
const KEY_CARGO = 'cargosFolio';
const KEY_PAGO = 'pagosFolio';

const siguienteNumeroFolio = async (): Promise<string> => {
  const fecha = new Date();
  const yyyymmdd = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}`;
  const existentes = (await db.allAsync<Folio>(KEY_FOLIO))
    .filter((f) => (f.codigo || '').includes(yyyymmdd))
    .map((f) => {
      const m = (f.codigo || '').match(/-(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
  const maxNum = existentes.reduce((max, n) => (n > max ? n : max), 0);
  return `F-${yyyymmdd}-${String(maxNum + 1).padStart(3, '0')}`;
};

export const CargoFolioService = {
  async crear(c: Create<CargoFolio>): Promise<CargoFolio> {
    const nuevo = await db.addAsync<CargoFolio>(KEY_CARGO, c);
    if (nuevo.folioId) await FolioService.recalcularTotales(nuevo.folioId, (nuevo as any).updatedBy || 'system-cargo');
    return nuevo;
  },
  async actualizar(id: string, changes: Update<CargoFolio>): Promise<CargoFolio | undefined> {
    const act = await db.updateAsync<CargoFolio>(KEY_CARGO, id, changes);
    if (act) await FolioService.recalcularTotales(act.folioId, (changes as any).updatedBy || 'system-cargo');
    return act;
  },
  async anular(id: string, motivo: string, usuarioId: string): Promise<CargoFolio | undefined> {
    const anterior = await db.getByIdAsync<CargoFolio>(KEY_CARGO, id);
    const act = await db.updateAsync<CargoFolio>(KEY_CARGO, id, {
      esAnulado: true,
      motivoAnulacion: motivo,
      estado: 'ANULADO',
      monto: 0,
      subtotal: 0,
      impuestosMontoDesglosado: (anterior?.impuestosMontoDesglosado || []).map((x) => ({ ...x, montoImpuesto: 0 })),
      updatedBy: usuarioId,
    } as unknown as Update<CargoFolio>);
    if (act) await FolioService.recalcularTotales(act.folioId, usuarioId);
    return act;
  },
  async listarPorFolio(folioId: string): Promise<CargoFolio[]> {
    return db.findManyAsync<CargoFolio>(KEY_CARGO, (c) => c.folioId === folioId && c.estado !== 'ANULADO');
  },
};

export const PagoFolioService = {
  async crear(p: Create<PagoFolio>): Promise<PagoFolio> {
    const nuevo = await db.addAsync<PagoFolio>(KEY_PAGO, p);
    if (nuevo.folioId && nuevo.estado !== 'ANULADO') {
      await FolioService.recalcularTotales(nuevo.folioId, (nuevo as any).usuarioId || 'system-pago');
    }
    return nuevo;
  },
  async listarPorFolio(folioId: string): Promise<PagoFolio[]> {
    return db.findManyAsync<PagoFolio>(KEY_PAGO, (p) => p.folioId === folioId && p.estado !== 'ANULADO');
  },
};

export const FolioService = {
  async listarTodos(params?: {
    estado?: EstadoFolio;
    habitacionId?: string;
    huespedId?: string;
    reservaId?: string;
    fechaAperturaDesde?: string;
    fechaCierreDesde?: string;
    buscar?: string;
  }): Promise<Folio[]> {
    let lista = (await db.allAsync<Folio>(KEY_FOLIO)).sort((a, b) =>
      (String(b.fechaApertura || '')).localeCompare(String(a.fechaApertura || ''))
    );
    if (params?.estado) lista = lista.filter((f) => f.estado === params.estado);
    if (params?.habitacionId) lista = lista.filter((f) => f.habitacionId === params.habitacionId);
    if (params?.huespedId) lista = lista.filter((f) => f.huespedTitularId === params.huespedId);
    if (params?.reservaId) lista = lista.filter((f) => f.reservaId === params.reservaId);
    if (params?.fechaAperturaDesde) lista = lista.filter((f) => String(f.fechaApertura) >= params.fechaAperturaDesde!);
    if (params?.buscar) {
      const q = params.buscar.toLowerCase().trim();
      lista = lista.filter((f: any) =>
        String(f.codigo || f.numeroFolio || '').toLowerCase().includes(q) ||
        String(f.huesped?.nombreCompleto || `${f.huespedTitular?.nombres || ''} ${f.huespedTitular?.apellidos || ''}`.trim() || '').toLowerCase().includes(q) ||
        String(f.habitacion?.codigo || '').toLowerCase().includes(q) ||
        String(f.reserva?.codigoReserva || '').toLowerCase().includes(q)
      );
    }
    return Promise.all(lista.map((f) => this._enriquecer(f)));
  },

  async resumenCajaHoy(): Promise<{
    foliosAbiertos: number;
    foliosCerradosHoy: number;
    saldoPendienteTotal: number;
    cobradoHoy: number;
    propinasHoy: number;
  }> {
    const hoy = seedUtil.hoy().slice(0, 10);
    const todos = await db.allAsync<Folio>(KEY_FOLIO);
    return {
      foliosAbiertos: todos.filter((f) => f.estado === 'ABIERTO').length,
      foliosCerradosHoy: todos.filter((f) => f.estado === 'CERRADO' && String(f.fechaCierre || '').startsWith(hoy)).length,
      saldoPendienteTotal: todos.filter((f) => f.estado === 'ABIERTO').reduce((s, f) => s + Number(f.saldoPendiente || 0), 0),
      cobradoHoy: todos.filter((f) => String(f.fechaCierre || '').startsWith(hoy)).reduce((s, f) => s + Number((f as any).totalPagado ?? f.pagosAplicados ?? 0), 0),
      propinasHoy: todos.filter((f) => String(f.fechaCierre || '').startsWith(hoy)).reduce((s, f) => s + Number((f as any).totalPropinas ?? 0), 0),
    };
  },

  async buscarPorId(id: string): Promise<Folio | undefined> {
    const f = await db.getByIdAsync<Folio>(KEY_FOLIO, id);
    return f ? this._enriquecer(f) : undefined;
  },

  async buscarPorHabitacionAbierta(habitacionId: string): Promise<Folio | undefined> {
    const f = await db.findOneAsync<Folio>(
      KEY_FOLIO,
      (x) => x.habitacionId === habitacionId && x.estado === 'ABIERTO'
    );
    return f ? this.buscarPorId(f.id) : undefined;
  },

  async buscarPorReserva(reservaId: string): Promise<Folio[]> {
    return this.listarTodos({ reservaId });
  },

  async _enriquecer(f: Folio): Promise<Folio> {
    const g: any = { ...f };
    if (!g.huespedTitular && g.huespedTitularId) {
      const h = await HuespedService.buscarPorId(g.huespedTitularId);
      if (h) { g.huespedTitular = h; g.huesped = h; }
    }
    if (!g.habitacion && g.habitacionId) {
      const hab = await HabitacionService.buscarPorId(g.habitacionId);
      if (hab) g.habitacion = hab;
    }
    if (!g.reserva && g.reservaId) {
      const r = await ReservaService.buscarPorId(g.reservaId);
      if (r) g.reserva = r;
    }
    g.cargos = await CargoFolioService.listarPorFolio(g.id);
    g.pagos = await PagoFolioService.listarPorFolio(g.id);
    return this._recalcularTotalesEnMemoria(g);
  },

  _recalcularTotalesEnMemoria(f: Folio): Folio {
    const cargos = (f as any).cargos || [];
    const sub = cargos.reduce((s: number, c: any) => s + Number(c.subtotal || 0), 0);
    const imp = cargos.reduce((s: number, c: any) =>
      s + (c.impuestosMontoDesglosado || []).reduce((s2: number, x: any) => s2 + Number(x.montoImpuesto || 0), 0),
      0
    );
    const desc = cargos.reduce((s: number, c: any) =>
      s + (c.descuentosMontoDesglosado || []).reduce((s2: number, x: any) => s2 + Number(x.montoDescuento || 0), 0),
      0
    );
    const totalProp = cargos.reduce((s: number, c: any) => s + Number(c.propinaMonto || 0), 0);
    const total = cargos.reduce((s: number, c: any) => s + Number(c.total || c.monto || 0), 0);
    const pagado = ((f as any).pagos || []).reduce((s: number, p: any) => s + Number(p.monto || p.total || 0), 0);
    const saldo = Number((total - pagado).toFixed(2));
    return {
      ...f,
      subTotalSinImpuestos: Number(sub.toFixed(2)),
      totalImpuestos: Number(imp.toFixed(2)),
      totalDescuentos: Number(desc.toFixed(2)),
      totalPropinas: Number(totalProp.toFixed(2)),
      totalFolio: Number(total.toFixed(2)),
      totalPagado: Number(pagado.toFixed(2)),
      saldoPendiente: saldo,
      creditoExcedido: Number((f as any).limiteCreditoAutorizado || 0) > 0 && total > Number((f as any).limiteCreditoAutorizado || 0),
    } as Folio & any;
  },

  async recalcularTotales(folioId: string, updatedBy = 'system-recalc'): Promise<Folio | undefined> {
    const f = await db.getByIdAsync<Folio>(KEY_FOLIO, folioId);
    if (!f) return undefined;
    const recalculado = this._recalcularTotalesEnMemoria({
      ...f,
      cargos: await CargoFolioService.listarPorFolio(f.id),
      pagos: await PagoFolioService.listarPorFolio(f.id),
    } as any);
    return db.updateAsync<Folio>(KEY_FOLIO, folioId, {
      ...(recalculado as any),
      updatedBy,
      updatedAt: seedUtil.nowISO(),
    } as unknown as Update<Folio>);
  },

  async registrarCheckIn(params: {
    reservaId: string;
    usuarioIdRecepcionista: string;
    llaveCodigo: string;
    cantidadLlaves?: number;
    depositoLlavesMonto?: number;
    observaciones?: string;
    pagoAdelantado?: Partial<PagoFolio>;
  }): Promise<{
    reservaActualizada?: Reserva;
    folio?: Folio;
    error?: string;
  }> {
    const reserva = await ReservaService.buscarPorId(params.reservaId);
    if (!reserva) return { error: 'Reserva no encontrada' };

    if (!['CONFIRMADA', 'PENDIENTE', 'MODIFICADA'].includes(reserva.estado)) {
      return { error: `Estado de reserva inválido para check-in: ${reserva.estado}` };
    }

    const checkInInfo: NonNullable<Reserva['checkInInfo']> = {
      fechaHoraCheckin: seedUtil.nowISO(),
      recepcionistaId: params.usuarioIdRecepcionista,
      llaveEntregadaCodigo: params.llaveCodigo,
      cantidadLlavesEntregadas: params.cantidadLlaves ?? 2,
      depositoLlavesMonto: params.depositoLlavesMonto ?? 0,
      documentoEntregado: true,
      firmaRegistroFisico: true,
      aceptaTerminosYCondiciones: true,
      aceptaPoliticaCancelacion: true,
      autorizaCargosExtras: true,
      observaciones: params.observaciones || '',
      createdAt: seedUtil.nowISO(),
      updatedAt: seedUtil.nowISO(),
      createdBy: params.usuarioIdRecepcionista,
      updatedBy: params.usuarioIdRecepcionista,
    };

    const reservaActualizada = await ReservaService.cambiarEstado(params.reservaId, 'CHECKIN', {
      usuarioResponsableId: params.usuarioIdRecepcionista,
      comentario: `Check-in realizado ${checkInInfo.fechaHoraCheckin}. Llave: ${checkInInfo.llaveEntregadaCodigo}.`,
      informacionAdicional: {
        fechaCheckinReal: checkInInfo.fechaHoraCheckin,
        checkInInfo,
      } as any,
    });

    if (!reservaActualizada) return { error: 'No se pudo actualizar la reserva' };

    for (const rh of (reservaActualizada as any).habitaciones || []) {
      await HabitacionService.cambiarEstado(rh.habitacionId, 'OCUPADA', params.usuarioIdRecepcionista);
    }

    const montoProyectadoEstadia = reservaActualizada.montoTotalReserva || 0;
    await HuespedService.incrementarVisita(
      reservaActualizada.huespedId,
      montoProyectadoEstadia,
      (reservaActualizada as any).totalNoches || 0
    );

    const folios: Folio[] = [];
    const habitacionesReserva = (reservaActualizada as any).habitaciones || [];
    for (const rh of habitacionesReserva) {
      const numeroFolio = await siguienteNumeroFolio();
      const folioSeed = await db.addAsync<Folio>(KEY_FOLIO, {
        numeroFolio,
        reservaId: reservaActualizada.id,
        checkInId: `CHECKIN-${reservaActualizada.id}`,
        huespedId: reservaActualizada.huespedId,
        habitacionId: rh.habitacionId,
        fechaApertura: seedUtil.nowISO(),
        fechaCheckout: reservaActualizada.fechaCheckout as any,
        estado: 'ABIERTO',
        esCuentaCompartida: habitacionesReserva.length > 1,
        foliosCompartidosIds: habitacionesReserva.filter((x: any) => x.habitacionId !== rh.habitacionId).map(() => '__placeholder__'),
        usuarioIdApertura: params.usuarioIdRecepcionista,
        moneda: (reservaActualizada as any).moneda,
        limiteCreditoAutorizado: 5000,
        notasInternas: `Folio creado en check-in automático. Hab: ${rh.habitacion?.codigo || rh.habitacionId}. Autoriza cargos extras: SÍ.`,
        subTotalSinImpuestos: 0,
        totalImpuestos: 0,
        totalPropinas: 0,
        totalDescuentos: 0,
        totalBonificacionesCortesia: 0,
        totalFolio: 0,
        totalPagado: 0,
        saldoPendiente: 0,
        creditoExcedido: false,
        createdAt: seedUtil.nowISO(),
        updatedAt: seedUtil.nowISO(),
        createdBy: params.usuarioIdRecepcionista,
        updatedBy: params.usuarioIdRecepcionista,
      } as unknown as Create<Folio>);

      const montoCargoAlojamiento = Number(((rh.totalNoches || 0) * (rh.precioBaseAcordadoPorNoche || 0)).toFixed(2));
      const divisor = 1.18;
      const subtotal = Number((montoCargoAlojamiento / divisor).toFixed(2));
      const impuestosIds = ['IMP-IGV-18'];
      const impuestosMontoDesglosadoArr: any[] = [];
      for (const impId of impuestosIds) {
        const imp = await ImpuestoService.buscarPorId(impId);
        if (!imp) continue;
        const montoImp = imp.tipo === 'PORCENTAJE'
          ? Number(((subtotal * (Number(imp.valor) || 0)) / 100).toFixed(2))
          : Number(imp.valor) || 0;
        impuestosMontoDesglosadoArr.push({
          impuestoId: impId,
          impuestoNombre: imp.nombre || impId,
          montoImpuesto: montoImp,
        });
      }
      const cargo: CargoFolio = {
        id: seedUtil.generateUUID(),
        folioId: folioSeed.id,
        tipo: 'ALOJAMIENTO',
        concepto: `Alojamiento ${rh.totalNoches || 0} noches - Hab ${rh.habitacion?.codigo || rh.habitacionId}`,
        descripcion: `Tarifa base S/ ${Number(rh.precioBaseAcordadoPorNoche || 0).toFixed(2)} × ${rh.totalNoches || 0} noches. ${rh.observaciones || ''}`,
        origen: 'ALOJAMIENTO_RESERVA',
        referenciaId: rh.id,
        reservaId: reservaActualizada.id,
        habitacionId: rh.habitacionId,
        huespedId: reservaActualizada.huespedId,
        productoInventarioId: null as any,
        comandaId: null as any,
        comandaDetalleId: null as any,
        cajaSesionId: null as any,
        usuarioId: params.usuarioIdRecepcionista,
        monto: montoCargoAlojamiento,
        moneda: (reservaActualizada as any).moneda,
        impuestosIds,
        impuestosMontoDesglosado: impuestosMontoDesglosadoArr,
        subtotal,
        descuentosIds: [],
        descuentosMontoDesglosado: [],
        propinaMonto: 0,
        estado: 'PENDIENTE_COBRO',
        fechaCargo: seedUtil.nowISO(),
        fechaAplicacion: reservaActualizada.fechaCheckin as any,
        fechaVencimiento: reservaActualizada.fechaCheckout as any,
        esAnulado: false,
        motivoAnulacion: '',
        comprobanteAsociadoId: null as any,
        comentarios: `Cargo automático check-in. Folio #${numeroFolio}. Reserva ${(reservaActualizada as any).codigoReserva}.`,
        createdAt: seedUtil.nowISO(),
        updatedAt: seedUtil.nowISO(),
        createdBy: params.usuarioIdRecepcionista,
        updatedBy: params.usuarioIdRecepcionista,
      };
      await db.addAsync<CargoFolio>(KEY_CARGO, cargo as Create<CargoFolio>);

      if (params.pagoAdelantado && params.pagoAdelantado.monto && params.pagoAdelantado.monto > 0) {
        const pago: PagoFolio = {
          id: seedUtil.generateUUID(),
          folioId: folioSeed.id,
          cajaSesionId: null as any,
          usuarioId: params.usuarioIdRecepcionista,
          metodoPago: (params.pagoAdelantado.metodoPago || 'TARJETA_CREDITO') as MetodoPago,
          subMetodoPago: params.pagoAdelantado.subMetodoPago || '',
          monto: params.pagoAdelantado.monto,
          moneda: params.pagoAdelantado.moneda || (reservaActualizada as any).moneda,
          tipoCambioMonedaReferencia: params.pagoAdelantado.tipoCambioMonedaReferencia || 1,
          montoMonedaOriginal: params.pagoAdelantado.montoMonedaOriginal || params.pagoAdelantado.monto,
          fechaHoraPago: seedUtil.nowISO(),
          referenciaBancaria: params.pagoAdelantado.referenciaBancaria || `PAGO-CHECKIN-${(reservaActualizada as any).codigoReserva}`,
          comprobanteAsociadoId: null as any,
          comprobanteNumero: '',
          estado: 'COMPLETADO' as EstadoPago,
          esPropina: false,
          esParcial: false,
          esDevolucion: false,
          pagoOriginalId: null as any,
          comprobanteEnvioCorreo: false,
          comprobanteEnvioWhatsApp: false,
          comprobantePDFUrl: null as any,
          cajeroNombre: null as any,
          aprobacionCodigo: params.pagoAdelantado.aprobacionCodigo || '',
          observaciones: `Pago adelantado en check-in. Reserva: ${(reservaActualizada as any).codigoReserva}. Folio: ${numeroFolio}. ${params.pagoAdelantado.observaciones || ''}`,
          createdAt: seedUtil.nowISO(),
          updatedAt: seedUtil.nowISO(),
          createdBy: params.usuarioIdRecepcionista,
          updatedBy: params.usuarioIdRecepcionista,
        };
        await db.addAsync<PagoFolio>(KEY_PAGO, pago as Create<PagoFolio>);
      }

      await this.recalcularTotales(folioSeed.id, params.usuarioIdRecepcionista);
      folios.push((await this.buscarPorId(folioSeed.id))!);
    }

    if (folios.length > 1) {
      const ids = folios.map((f) => f.id);
      for (const f of folios) {
        await db.updateAsync<Folio>(KEY_FOLIO, f.id, {
          foliosCompartidosIds: ids.filter((id) => id !== f.id),
          updatedBy: params.usuarioIdRecepcionista,
        } as unknown as Update<Folio>);
      }
    }

    return {
      reservaActualizada: await ReservaService.buscarPorId(reservaActualizada.id),
      folio: folios[0],
    };
  },

  async registrarCheckOut(params: {
    folioId?: string;
    reservaId?: string;
    usuarioIdRecepcionista: string;
    pagosFinales?: Array<Partial<PagoFolio>>;
    llavesDevueltas?: boolean;
    estadoHabitacionEntrega?: Habitacion['estado'];
    observaciones?: string;
    comprobanteTipo?: 'BOLETA' | 'FACTURA';
    comprobanteEnvioCorreo?: boolean;
    comprobanteEnvioWhatsApp?: boolean;
  }): Promise<{
    error?: string;
    foliosCerrados: Folio[];
    reservaActualizada?: Reserva;
  }> {
    const folios: Folio[] = [];

    if (params.reservaId) {
      folios.push(...(await this.listarTodos({ reservaId: params.reservaId, estado: 'ABIERTO' })));
    } else if (params.folioId) {
      const f = await this.buscarPorId(params.folioId);
      if (f && f.estado === 'ABIERTO') folios.push(f);
    }
    if (folios.length === 0) {
      return { error: 'No hay folios abiertos para cerrar.', foliosCerrados: [] };
    }

    const cerrados: Folio[] = [];
    let reservaIdFinal: string | undefined;

    for (const f of folios) {
      if (params.pagosFinales && (f.saldoPendiente || 0) > 0.01) {
        for (const pago of params.pagosFinales) {
          if (!pago.monto) continue;
          await PagoFolioService.crear({
            folioId: f.id,
            cajaSesionId: null as any,
            usuarioId: params.usuarioIdRecepcionista,
            metodoPago: (pago.metodoPago || 'EFECTIVO') as MetodoPago,
            subMetodoPago: pago.subMetodoPago || '',
            monto: pago.monto,
            moneda: pago.moneda || (f as any).moneda,
            tipoCambioMonedaReferencia: pago.tipoCambioMonedaReferencia || 1,
            montoMonedaOriginal: pago.montoMonedaOriginal || pago.monto,
            fechaHoraPago: seedUtil.nowISO(),
            referenciaBancaria: pago.referenciaBancaria || `CHECKOUT-${(f as any).numeroFolio}`,
            comprobanteAsociadoId: null as any,
            comprobanteNumero: '',
            estado: 'COMPLETADO' as EstadoPago,
            esPropina: pago.esPropina || false,
            esParcial: false,
            esDevolucion: false,
            pagoOriginalId: null as any,
            comprobanteEnvioCorreo: params.comprobanteEnvioCorreo ?? false,
            comprobanteEnvioWhatsApp: params.comprobanteEnvioWhatsApp ?? true,
            comprobantePDFUrl: null as any,
            cajeroNombre: null as any,
            aprobacionCodigo: pago.aprobacionCodigo || '',
            observaciones: `Pago checkout. Folio ${(f as any).numeroFolio}. ${pago.observaciones || ''} ${params.observaciones || ''}`,
            createdAt: seedUtil.nowISO(),
            updatedAt: seedUtil.nowISO(),
            createdBy: params.usuarioIdRecepcionista,
            updatedBy: params.usuarioIdRecepcionista,
          } as Create<PagoFolio>);
        }
      }

      await this.recalcularTotales(f.id, params.usuarioIdRecepcionista);

      const cerrado = await db.updateAsync<Folio>(KEY_FOLIO, f.id, {
        estado: 'CERRADO',
        fechaCierre: seedUtil.nowISO(),
        fechaCheckoutReal: seedUtil.nowISO(),
        usuarioIdCierre: params.usuarioIdRecepcionista,
        updatedBy: params.usuarioIdRecepcionista,
      } as unknown as Update<Folio>);
      cerrados.push((await this.buscarPorId(cerrado!.id))!);

      if ((f as any).habitacionId) {
        await HabitacionService.cambiarEstado(
          (f as any).habitacionId,
          params.estadoHabitacionEntrega || 'LIMPIEZA',
          params.usuarioIdRecepcionista
        );
      }

      reservaIdFinal = (f as any).reservaId || reservaIdFinal;
    }

    let reservaActualizada: Reserva | undefined;
    if (reservaIdFinal) {
      const reserva = await ReservaService.buscarPorId(reservaIdFinal);
      const foliosCerrados = cerrados;
      const totalCobrado = foliosCerrados.reduce((s, ff) => s + (ff.totalPagado || 0), 0);
      const totalCargos = foliosCerrados.reduce((s, ff) => s + (ff.totalFolio || 0), 0);
      reservaActualizada = await ReservaService.cambiarEstado(reservaIdFinal, 'CHECKOUT', {
        usuarioResponsableId: params.usuarioIdRecepcionista,
        comentario: `Check-out realizado ${new Date().toLocaleString('es-PE')}. Folios: ${foliosCerrados.map((f: any) => f.numeroFolio).join(', ')}. Total cobrado: S/ ${totalCobrado.toFixed(2)}.`,
        informacionAdicional: {
          fechaCheckoutReal: seedUtil.nowISO(),
          estadoPago:
            Math.abs(totalCargos - totalCobrado) < 0.05
              ? 'PAGADO_TOTAL'
              : totalCobrado > 0
              ? 'PAGO_PARCIAL'
              : 'PAGO_PENDIENTE',
          saldoPendiente: Number((totalCargos - totalCobrado).toFixed(2)),
          montoPagadoAnticipado: totalCobrado,
          checkOutInfo: {
            fechaHoraCheckout: seedUtil.nowISO(),
            recepcionistaId: params.usuarioIdRecepcionista,
            llavesDevueltas: params.llavesDevueltas ?? true,
            cantidadLlavesDevueltas: 2,
            estadoHabitacionEntregaFinal: params.estadoHabitacionEntrega || 'SUCIA',
            folioIdCerrado: foliosCerrados[0]?.id || '',
            folio: foliosCerrados[0] || null,
            totalCargosFolio: totalCargos,
            totalImpuestosFolio: foliosCerrados.reduce((s, ff) => s + (ff.totalImpuestos || 0), 0),
            descuentosAplicados: foliosCerrados.reduce((s, ff) => s + (ff.totalDescuentos || 0), 0),
            totalPagadoCheckout: totalCobrado,
            metodoPagoCheckout: (params.pagosFinales?.[0]?.metodoPago || 'EFECTIVO') as any,
            transaccionId: `TXN-CHECKOUT-${(reserva as any)?.codigoReserva || ''}`,
            comprobanteEmitidoId: `CPE-${params.comprobanteTipo || 'BOLETA'}-${String((reserva as any)?.codigoReserva || '').replace(/\D/g, '')}`,
            comprobanteNumero: `${params.comprobanteTipo === 'FACTURA' ? 'F001' : 'B001'}-${String(Math.floor(Math.random() * 9000 + 1000))}`,
            comprobanteEnviadoCorreo: params.comprobanteEnvioCorreo ?? false,
            observacionesEntrega: params.observaciones || '',
            firmaRecepcionCliente: true,
            createdAt: seedUtil.nowISO(),
            updatedAt: seedUtil.nowISO(),
            createdBy: params.usuarioIdRecepcionista,
            updatedBy: params.usuarioIdRecepcionista,
          } as NonNullable<Reserva['checkOutInfo']>,
        } as any,
      });
    }

    return { foliosCerrados: cerrados, reservaActualizada };
  },

  async crear(params: Create<Folio>): Promise<Folio> {
    return db.addAsync<Folio>(KEY_FOLIO, params);
  },
  async actualizar(id: string, changes: Update<Folio>): Promise<Folio | undefined> {
    return db.updateAsync<Folio>(KEY_FOLIO, id, changes);
  },
  reiniciarSeed(): void {
    db.reset();
  },
};

export default FolioService;
