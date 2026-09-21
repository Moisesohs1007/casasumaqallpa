import { db, seedUtil, type Create, type Update, type Folio, type CargoFolio, type PagoFolio, type Reserva, type Habitacion, type EstadoFolio, type EstadoPago, type MetodoPago } from './__db__';
import { ReservaService } from './ReservaService';
import { HabitacionService } from './HabitacionService';
import { HuespedService } from './HuespedService';
import { ImpuestoService } from './TarifaService';

const KEY_FOLIO = 'folios';
const KEY_CARGO = 'cargosFolio';
const KEY_PAGO = 'pagosFolio';

const siguienteNumeroFolio = (): string => {
  const fecha = new Date();
  const yyyymmdd = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}`;
  const existentes = db
    .all<Folio>(KEY_FOLIO)
    .filter((f) => f.numeroFolio.includes(yyyymmdd))
    .map((f) => {
      const m = f.numeroFolio.match(/-(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
  const maxNum = existentes.reduce((max, n) => (n > max ? n : max), 0);
  return `F-${yyyymmdd}-${String(maxNum + 1).padStart(3, '0')}`;
};

export const CargoFolioService = {
  crear(c: Create<CargoFolio>): CargoFolio {
    const nuevo = db.add<CargoFolio>(KEY_CARGO, c);
    const folio = db.getById<Folio>(KEY_FOLIO, nuevo.folioId);
    if (folio) FolioService.recalcularTotales(nuevo.folioId, nuevo.updatedBy || 'system-cargo');
    return nuevo;
  },
  actualizar(id: string, changes: Update<CargoFolio>): CargoFolio | undefined {
    const act = db.update<CargoFolio>(KEY_CARGO, id, changes);
    if (act) FolioService.recalcularTotales(act.folioId, changes.updatedBy || 'system-cargo');
    return act;
  },
  anular(id: string, motivo: string, usuarioId: string): CargoFolio | undefined {
    const act = db.update<CargoFolio>(KEY_CARGO, id, {
      esAnulado: true,
      motivoAnulacion: motivo,
      estado: 'ANULADO',
      monto: 0,
      subtotal: 0,
      impuestosMontoDesglosado: (db.getById<CargoFolio>(KEY_CARGO, id)?.impuestosMontoDesglosado || []).map((x) => ({ ...x, montoImpuesto: 0 })),
      updatedBy: usuarioId,
    } as unknown as Update<CargoFolio>);
    if (act) FolioService.recalcularTotales(act.folioId, usuarioId);
    return act;
  },
  listarPorFolio(folioId: string): CargoFolio[] {
    return db.findMany<CargoFolio>(KEY_CARGO, (c) => c.folioId === folioId && c.estado !== 'ANULADO');
  },
};

export const PagoFolioService = {
  crear(p: Create<PagoFolio>): PagoFolio {
    const nuevo = db.add<PagoFolio>(KEY_PAGO, p);
    if (nuevo.folioId && nuevo.estado !== 'ANULADO') {
      FolioService.recalcularTotales(nuevo.folioId, nuevo.usuarioId || 'system-pago');
    }
    return nuevo;
  },
  listarPorFolio(folioId: string): PagoFolio[] {
    return db.findMany<PagoFolio>(KEY_PAGO, (p) => p.folioId === folioId && p.estado !== 'ANULADO');
  },
};

// Inicializar cargos/pagos desde folios seed al iniciar
const initFromSeed = () => {
  const folios = db.all<Folio>(KEY_FOLIO);
  for (const f of folios) {
    // Cargos
    for (const c of f.cargos || []) {
      if (!db.findOne<CargoFolio>(KEY_CARGO, (x) => x.id === c.id)) {
        db.add<CargoFolio>(KEY_CARGO, c as Create<CargoFolio>);
      }
    }
    for (const p of f.pagos || []) {
      if (!db.findOne<PagoFolio>(KEY_PAGO, (x) => x.id === p.id)) {
        db.add<PagoFolio>(KEY_PAGO, p as Create<PagoFolio>);
      }
    }
  }
};
try { initFromSeed(); } catch (e) { /* no pasa nada */ }

export const FolioService = {
  listarTodos(params?: {
    estado?: EstadoFolio;
    habitacionId?: string;
    huespedId?: string;
    reservaId?: string;
    fechaAperturaDesde?: string;
    fechaCierreDesde?: string;
    buscar?: string;
  }): Folio[] {
    let lista = db.all<Folio>(KEY_FOLIO).sort((a, b) =>
      (b.fechaApertura || '').localeCompare(a.fechaApertura || '')
    );
    if (params?.estado) lista = lista.filter((f) => f.estado === params.estado);
    if (params?.habitacionId) lista = lista.filter((f) => f.habitacionId === params.habitacionId);
    if (params?.huespedId) lista = lista.filter((f) => f.huespedId === params.huespedId);
    if (params?.reservaId) lista = lista.filter((f) => f.reservaId === params.reservaId);
    if (params?.fechaAperturaDesde) lista = lista.filter((f) => f.fechaApertura >= params.fechaAperturaDesde!);
    if (params?.buscar) {
      const q = params.buscar.toLowerCase().trim();
      lista = lista.filter((f) =>
        f.numeroFolio.toLowerCase().includes(q) ||
        f.huesped?.nombreCompleto.toLowerCase().includes(q) ||
        f.habitacion?.codigo.toLowerCase().includes(q) ||
        (f.reserva?.codigoReserva || '').toLowerCase().includes(q)
      );
    }
    return lista.map((f) => this._enriquecer(f));
  },

  resumenCajaHoy(): {
    foliosAbiertos: number;
    foliosCerradosHoy: number;
    saldoPendienteTotal: number;
    cobradoHoy: number;
    propinasHoy: number;
  } {
    const hoy = seedUtil.hoy().slice(0, 10);
    const todos = db.all<Folio>(KEY_FOLIO);
    return {
      foliosAbiertos: todos.filter((f) => f.estado === 'ABIERTO').length,
      foliosCerradosHoy: todos.filter((f) => f.estado === 'CERRADO' && (f.fechaCierre || '').startsWith(hoy)).length,
      saldoPendienteTotal: todos.filter((f) => f.estado === 'ABIERTO').reduce((s, f) => s + Number(f.saldoPendiente || 0), 0),
      cobradoHoy: todos.filter((f) => (f.fechaCierre || '').startsWith(hoy)).reduce((s, f) => s + Number(f.totalPagado || 0), 0),
      propinasHoy: todos.filter((f) => (f.fechaCierre || '').startsWith(hoy)).reduce((s, f) => s + Number(f.totalPropinas || 0), 0),
    };
  },

  buscarPorId(id: string): Folio | undefined {
    const f = db.getById<Folio>(KEY_FOLIO, id);
    return f ? this._enriquecer(f) : undefined;
  },

  buscarPorHabitacionAbierta(habitacionId: string): Folio | undefined {
    const f = db.findOne<Folio>(
      KEY_FOLIO,
      (x) => x.habitacionId === habitacionId && x.estado === 'ABIERTO'
    );
    return f ? this.buscarPorId(f.id) : undefined;
  },

  buscarPorReserva(reservaId: string): Folio[] {
    return this.listarTodos({ reservaId });
  },

  _enriquecer(f: Folio): Folio {
    if (f && !f.huesped) {
      const h = HuespedService.buscarPorId(f.huespedId);
      if (h) f.huesped = h;
    }
    if (f && !f.habitacion) {
      const hab = HabitacionService.buscarPorId(f.habitacionId);
      if (hab) f.habitacion = hab;
    }
    if (f && !f.reserva && f.reservaId) {
      const r = ReservaService.buscarPorId(f.reservaId);
      if (r) f.reserva = r;
    }
    f.cargos = CargoFolioService.listarPorFolio(f.id);
    f.pagos = PagoFolioService.listarPorFolio(f.id);
    return this._recalcularTotalesEnMemoria(f);
  },

  _recalcularTotalesEnMemoria(f: Folio): Folio {
    const cargos = f.cargos || [];
    const sub = cargos.reduce((s, c) => s + Number(c.subtotal || 0), 0);
    const imp = cargos.reduce((s, c) =>
      s + (c.impuestosMontoDesglosado || []).reduce((s2, x) => s2 + Number(x.montoImpuesto || 0), 0),
      0
    );
    const desc = cargos.reduce((s, c) =>
      s + (c.descuentosMontoDesglosado || []).reduce((s2, x) => s2 + Number(x.montoDescuento || 0), 0),
      0
    );
    const totalProp = cargos.reduce((s, c) => s + Number(c.propinaMonto || 0), 0);
    const total = cargos.reduce((s, c) => s + Number(c.total || c.monto || 0), 0);
    const pagado = (f.pagos || []).reduce((s, p) => s + Number(p.monto || p.total || 0), 0);
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

  recalcularTotales(folioId: string, updatedBy = 'system-recalc'): Folio | undefined {
    const f = db.getById<Folio>(KEY_FOLIO, folioId);
    if (!f) return undefined;
    const recalculado = this._recalcularTotalesEnMemoria({
      ...f,
      cargos: CargoFolioService.listarPorFolio(f.id),
      pagos: PagoFolioService.listarPorFolio(f.id),
    });
    return db.update<Folio>(KEY_FOLIO, folioId, {
      ...recalculado,
      updatedBy,
      updatedAt: seedUtil.nowISO(),
    } as unknown as Update<Folio>);
  },

  /** A.3: Check-in de reserva. Crea folio, actualiza reserva a CHECKED_IN, cambia habitación a OCUPADA. */
  registrarCheckIn(params: {
    reservaId: string;
    usuarioIdRecepcionista: string;
    llaveCodigo: string;
    cantidadLlaves?: number;
    depositoLlavesMonto?: number;
    observaciones?: string;
    pagoAdelantado?: Partial<PagoFolio>;
  }): {
    reservaActualizada?: Reserva;
    folio?: Folio;
    error?: string;
  } {
    const reserva = ReservaService.buscarPorId(params.reservaId);
    if (!reserva) return { error: 'Reserva no encontrada' };

    if (!['CONFIRMADA', 'PENDIENTE', 'MODIFICADA'].includes(reserva.estado)) {
      return { error: `Estado de reserva inválido para check-in: ${reserva.estado}` };
    }

    // Crear checkInInfo
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

    // Actualizar reserva
    const reservaActualizada = ReservaService.cambiarEstado(params.reservaId, 'CHECKED_IN', {
      usuarioResponsableId: params.usuarioIdRecepcionista,
      comentario: `Check-in realizado ${checkInInfo.fechaHoraCheckin}. Llave: ${checkInInfo.llaveEntregadaCodigo}.`,
      informacionAdicional: {
        fechaCheckinReal: checkInInfo.fechaHoraCheckin,
        checkInInfo,
      },
    });

    if (!reservaActualizada) return { error: 'No se pudo actualizar la reserva' };

    // Cambiar habitaciones a OCUPADA
    for (const rh of reservaActualizada.habitaciones) {
      HabitacionService.cambiarEstado(rh.habitacionId, 'OCUPADA', params.usuarioIdRecepcionista);
    }

    // Registrar visita huésped (incrementar visitas)
    const montoProyectadoEstadia = reservaActualizada.montoTotalReserva || 0;
    HuespedService.incrementarVisita(
      reservaActualizada.huespedId,
      montoProyectadoEstadia,
      reservaActualizada.totalNoches || 0
    );

    // Crear FOLIOS (1 por habitación)
    const folios: Folio[] = [];
    for (const rh of reservaActualizada.habitaciones) {
      const numeroFolio = siguienteNumeroFolio();
      const folioSeed = db.add<Folio>(KEY_FOLIO, {
        numeroFolio,
        reservaId: reservaActualizada.id,
        checkInId: `CHECKIN-${reservaActualizada.id}`,
        huespedId: reservaActualizada.huespedId,
        habitacionId: rh.habitacionId,
        fechaApertura: seedUtil.nowISO(),
        fechaCheckout: reservaActualizada.fechaCheckout,
        estado: 'ABIERTO',
        esCuentaCompartida: reservaActualizada.habitaciones.length > 1,
        foliosCompartidosIds: reservaActualizada.habitaciones.filter((x) => x.habitacionId !== rh.habitacionId).map(() => '__placeholder__'), // lo actualizamos después
        usuarioIdApertura: params.usuarioIdRecepcionista,
        moneda: reservaActualizada.moneda,
        limiteCreditoAutorizado: 5000,
        notasInternas: `Folio creado en check-in automático. Hab: ${rh.habitacion.codigo}. Autoriza cargos extras: SÍ.`,
        subTotalSinImpuestos: 0,
        totalImpuestos: 0,
        totalPropinas: 0,
        totalDescuentos: 0,
        totalBonificacionesCortesia: 0,
        totalFolio: 0,
        totalPagado: 0,
        saldoPendiente: 0,
        creditoExcedido: false,
        cargos: [],
        pagos: [],
        createdAt: seedUtil.nowISO(),
        updatedAt: seedUtil.nowISO(),
        createdBy: params.usuarioIdRecepcionista,
        updatedBy: params.usuarioIdRecepcionista,
      } as unknown as Create<Folio>);

      // Cargo AUTOMÁTICO de alojamiento por habitación (días de la reserva)
      const montoCargoAlojamiento = Number((rh.totalNoches * rh.precioBaseAcordadoPorNoche).toFixed(2));
      const subtotal = Number((montoCargoAlojamiento / 1.23).toFixed(2));
      const impuestosIds = ['IMP-IGV-18', 'IMP-SELVA-5'];
      const cargo: CargoFolio = {
        id: seedUtil.generateUUID(),
        folioId: folioSeed.id,
        tipo: 'ALOJAMIENTO',
        concepto: `Alojamiento ${rh.totalNoches} noches - Hab ${rh.habitacion.codigo}`,
        descripcion: `Tarifa base S/ ${Number(rh.precioBaseAcordadoPorNoche).toFixed(2)} × ${rh.totalNoches} noches. ${rh.observaciones || ''}`,
        origen: 'ALOJAMIENTO_RESERVA',
        referenciaId: rh.id,
        reservaId: reservaActualizada.id,
        habitacionId: rh.habitacionId,
        huespedId: reservaActualizada.huespedId,
        productoInventarioId: null,
        comandaId: null,
        comandaDetalleId: null,
        cajaSesionId: null,
        usuarioId: params.usuarioIdRecepcionista,
        monto: montoCargoAlojamiento,
        moneda: reservaActualizada.moneda,
        impuestosIds,
        impuestosMontoDesglosado: impuestosIds.map((impId) => {
          const imp = ImpuestoService.buscarPorId(impId)!;
          const montoImp = imp.tipo === 'PORCENTAJE' ? Number(((subtotal * imp.valor) / 100).toFixed(2)) : 0;
          return { impuestoId: impId, impuestoNombre: imp.nombre, montoImpuesto: montoImp };
        }),
        subtotal,
        descuentosIds: [],
        descuentosMontoDesglosado: [],
        propinaMonto: 0,
        estado: 'PENDIENTE_COBRO',
        fechaCargo: seedUtil.nowISO(),
        fechaAplicacion: reservaActualizada.fechaCheckin,
        fechaVencimiento: reservaActualizada.fechaCheckout,
        esAnulado: false,
        motivoAnulacion: '',
        comprobanteAsociadoId: null,
        comentarios: `Cargo automático check-in. Folio #${numeroFolio}. Reserva ${reservaActualizada.codigoReserva}.`,
        createdAt: seedUtil.nowISO(),
        updatedAt: seedUtil.nowISO(),
        createdBy: params.usuarioIdRecepcionista,
        updatedBy: params.usuarioIdRecepcionista,
      };
      db.add<CargoFolio>(KEY_CARGO, cargo as Create<CargoFolio>);

      // Pago adelantado (check-in)
      if (params.pagoAdelantado && params.pagoAdelantado.monto && params.pagoAdelantado.monto > 0) {
        const pago: PagoFolio = {
          id: seedUtil.generateUUID(),
          folioId: folioSeed.id,
          cajaSesionId: null,
          usuarioId: params.usuarioIdRecepcionista,
          metodoPago: (params.pagoAdelantado.metodoPago || 'TARJETA_CREDITO') as MetodoPago,
          subMetodoPago: params.pagoAdelantado.subMetodoPago || '',
          monto: params.pagoAdelantado.monto,
          moneda: params.pagoAdelantado.moneda || reservaActualizada.moneda,
          tipoCambioMonedaReferencia: params.pagoAdelantado.tipoCambioMonedaReferencia || 1,
          montoMonedaOriginal: params.pagoAdelantado.montoMonedaOriginal || params.pagoAdelantado.monto,
          fechaHoraPago: seedUtil.nowISO(),
          referenciaBancaria: params.pagoAdelantado.referenciaBancaria || `PAGO-CHECKIN-${reservaActualizada.codigoReserva}`,
          comprobanteAsociadoId: null,
          comprobanteNumero: '',
          estado: 'COMPLETADO' as EstadoPago,
          esPropina: false,
          esParcial: false,
          esDevolucion: false,
          pagoOriginalId: null,
          comprobanteEnvioCorreo: false,
          comprobanteEnvioWhatsApp: false,
          comprobantePDFUrl: null,
          cajeroNombre: null,
          aprobacionCodigo: params.pagoAdelantado.aprobacionCodigo || '',
          observaciones: `Pago adelantado en check-in. Reserva: ${reservaActualizada.codigoReserva}. Folio: ${numeroFolio}. ${params.pagoAdelantado.observaciones || ''}`,
          createdAt: seedUtil.nowISO(),
          updatedAt: seedUtil.nowISO(),
          createdBy: params.usuarioIdRecepcionista,
          updatedBy: params.usuarioIdRecepcionista,
        };
        db.add<PagoFolio>(KEY_PAGO, pago as Create<PagoFolio>);
      }

      this.recalcularTotales(folioSeed.id, params.usuarioIdRecepcionista);
      folios.push(this.buscarPorId(folioSeed.id)!);
    }

    // Actualizar folios compartidos cross-reference
    if (folios.length > 1) {
      const ids = folios.map((f) => f.id);
      for (const f of folios) {
        db.update<Folio>(KEY_FOLIO, f.id, {
          foliosCompartidosIds: ids.filter((id) => id !== f.id),
          updatedBy: params.usuarioIdRecepcionista,
        } as unknown as Update<Folio>);
      }
    }

    return {
      reservaActualizada: ReservaService.buscarPorId(reservaActualizada.id),
      folio: folios[0],
    };
  },

  /** A.6: Check-out. Cierra folio(s), actualiza reserva a CHECKED_OUT, habitación a LIMPIEZA. */
  registrarCheckOut(params: {
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
  }): {
    error?: string;
    foliosCerrados: Folio[];
    reservaActualizada?: Reserva;
  } {
    const folios: Folio[] = [];

    if (params.reservaId) {
      folios.push(...this.listarTodos({ reservaId: params.reservaId, estado: 'ABIERTO' }));
    } else if (params.folioId) {
      const f = this.buscarPorId(params.folioId);
      if (f && f.estado === 'ABIERTO') folios.push(f);
    }
    if (folios.length === 0) {
      return { error: 'No hay folios abiertos para cerrar.', foliosCerrados: [] };
    }

    const cerrados: Folio[] = [];
    let reservaIdFinal: string | undefined;

    for (const f of folios) {
      // 1. Procesar pagos finales
      if (params.pagosFinales && f.saldoPendiente > 0.01) {
        for (const pago of params.pagosFinales) {
          if (!pago.monto) continue;
          PagoFolioService.crear({
            folioId: f.id,
            cajaSesionId: null,
            usuarioId: params.usuarioIdRecepcionista,
            metodoPago: (pago.metodoPago || 'EFECTIVO') as MetodoPago,
            subMetodoPago: pago.subMetodoPago || '',
            monto: pago.monto,
            moneda: pago.moneda || f.moneda,
            tipoCambioMonedaReferencia: pago.tipoCambioMonedaReferencia || 1,
            montoMonedaOriginal: pago.montoMonedaOriginal || pago.monto,
            fechaHoraPago: seedUtil.nowISO(),
            referenciaBancaria: pago.referenciaBancaria || `CHECKOUT-${f.numeroFolio}`,
            comprobanteAsociadoId: null,
            comprobanteNumero: '',
            estado: 'COMPLETADO' as EstadoPago,
            esPropina: pago.esPropina || false,
            esParcial: false,
            esDevolucion: false,
            pagoOriginalId: null,
            comprobanteEnvioCorreo: params.comprobanteEnvioCorreo ?? false,
            comprobanteEnvioWhatsApp: params.comprobanteEnvioWhatsApp ?? true,
            comprobantePDFUrl: null,
            cajeroNombre: null,
            aprobacionCodigo: pago.aprobacionCodigo || '',
            observaciones: `Pago checkout. Folio ${f.numeroFolio}. ${pago.observaciones || ''} ${params.observaciones || ''}`,
            createdAt: seedUtil.nowISO(),
            updatedAt: seedUtil.nowISO(),
            createdBy: params.usuarioIdRecepcionista,
            updatedBy: params.usuarioIdRecepcionista,
          } as Create<PagoFolio>);
        }
      }

      // Recalcular por si faltaba
      this.recalcularTotales(f.id, params.usuarioIdRecepcionista);

      // 2. Cerrar folio
      const cerrado = db.update<Folio>(KEY_FOLIO, f.id, {
        estado: 'CERRADO',
        fechaCierre: seedUtil.nowISO(),
        fechaCheckoutReal: seedUtil.nowISO(),
        usuarioIdCierre: params.usuarioIdRecepcionista,
        updatedBy: params.usuarioIdRecepcionista,
      } as unknown as Update<Folio>);
      cerrados.push(this.buscarPorId(cerrado!.id)!);

      // 3. Habitación a LIMPIEZA
      if (f.habitacionId) {
        HabitacionService.cambiarEstado(
          f.habitacionId,
          params.estadoHabitacionEntrega || 'LIMPIEZA',
          params.usuarioIdRecepcionista
        );
      }

      reservaIdFinal = f.reservaId || reservaIdFinal;
    }

    // 4. Actualizar reserva a CHECKED_OUT
    let reservaActualizada: Reserva | undefined;
    if (reservaIdFinal) {
      const reserva = ReservaService.buscarPorId(reservaIdFinal);
      const foliosCerrados = cerrados;
      const totalCobrado = foliosCerrados.reduce((s, ff) => s + (ff.totalPagado || 0), 0);
      const totalCargos = foliosCerrados.reduce((s, ff) => s + (ff.totalFolio || 0), 0);
      reservaActualizada = ReservaService.cambiarEstado(reservaIdFinal, 'CHECKED_OUT', {
        usuarioResponsableId: params.usuarioIdRecepcionista,
        comentario: `Check-out realizado ${new Date().toLocaleString('es-PE')}. Folios: ${foliosCerrados.map((f) => f.numeroFolio).join(', ')}. Total cobrado: S/ ${totalCobrado.toFixed(2)}.`,
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
            transaccionId: `TXN-CHECKOUT-${reserva?.codigoReserva || ''}`,
            comprobanteEmitidoId: `CPE-${params.comprobanteTipo || 'BOLETA'}-${(reserva?.codigoReserva || '').replace(/\D/g, '')}`,
            comprobanteNumero: `${params.comprobanteTipo === 'FACTURA' ? 'F001' : 'B001'}-${String(Math.floor(Math.random() * 9000 + 1000))}`,
            comprobanteEnviadoCorreo: params.comprobanteEnvioCorreo ?? false,
            observacionesEntrega: params.observaciones || '',
            firmaRecepcionCliente: true,
            createdAt: seedUtil.nowISO(),
            updatedAt: seedUtil.nowISO(),
            createdBy: params.usuarioIdRecepcionista,
            updatedBy: params.usuarioIdRecepcionista,
          } as NonNullable<Reserva['checkOutInfo']>,
        },
      });
    }

    return { foliosCerrados: cerrados, reservaActualizada };
  },

  crear(params: Create<Folio>): Folio {
    return db.add<Folio>(KEY_FOLIO, params);
  },
  actualizar(id: string, changes: Update<Folio>): Folio | undefined {
    return db.update<Folio>(KEY_FOLIO, id, changes);
  },
  reiniciarSeed(): void {
    db.reset();
    try { initFromSeed(); } catch { /* ignore */ }
  },
};
