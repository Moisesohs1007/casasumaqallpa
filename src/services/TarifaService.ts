import { db, seedUtil, type Create, type Update, type Tarifa, type Temporada, type PoliticaCancelacion, type CodigoPromocional, type ImpuestoTarifa } from './__db__';

const KEY_TAR = 'tarifas';
const KEY_TEMP = 'temporadas';
const KEY_POL = 'politicasCancelacion';
const KEY_PROM = 'codigosPromo';
const KEY_IMP = 'impuestos';

const KEY_RES = 'reservas';
const KEY_HAB = 'habitaciones';

// ===== IMPUESTOS =====
export const ImpuestoService = {
  listarTodos(): ImpuestoTarifa[] {
    return db.all<ImpuestoTarifa>(KEY_IMP);
  },
  buscarPorId(id: string): ImpuestoTarifa | undefined {
    return db.getById<ImpuestoTarifa>(KEY_IMP, id);
  },
};

// ===== TEMPORADAS =====
export const TemporadaService = {
  listarTodas(params?: { fechaISO?: string; tipo?: Temporada['tipo'] }): Temporada[] {
    let list = db.all<Temporada>(KEY_TEMP).sort(
      (a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
    );
    if (params?.tipo) list = list.filter((t) => t.tipo === params.tipo);
    if (params?.fechaISO) {
      const f = new Date(params.fechaISO).getTime();
      list = list.filter(
        (t) =>
          f >= new Date(t.fechaInicio).setHours(0, 0, 0, 0) &&
          f <= new Date(t.fechaFin).setHours(23, 59, 59, 999)
      );
    }
    return list;
  },
  buscarPorId(id: string): Temporada | undefined {
    return db.getById<Temporada>(KEY_TEMP, id);
  },
  crear(payload: Create<Temporada>): Temporada {
    return db.add<Temporada>(KEY_TEMP, payload);
  },
  actualizar(id: string, changes: Update<Temporada>): Temporada | undefined {
    return db.update<Temporada>(KEY_TEMP, id, changes);
  },
  calcularFactorPorcentaje(fechaISO: string): number {
    // Devuelve el factor MAXIMO de temporada vigente (peor caso cobro más alto)
    const lista = this.listarTodas({ fechaISO });
    if (lista.length === 0) return 0;
    return lista.reduce((max, t) => Math.max(max, t.factorPrecioPorcentaje), 0);
  },
};

// ===== POLÍTICAS DE CANCELACIÓN =====
export const PoliticaCancelacionService = {
  listarTodas(): PoliticaCancelacion[] {
    return db.all<PoliticaCancelacion>(KEY_POL);
  },
  buscarPorId(id: string): PoliticaCancelacion | undefined {
    return db.getById<PoliticaCancelacion>(KEY_POL, id);
  },
  crear(payload: Create<PoliticaCancelacion>): PoliticaCancelacion {
    return db.add<PoliticaCancelacion>(KEY_POL, payload);
  },
  actualizar(id: string, changes: Update<PoliticaCancelacion>): PoliticaCancelacion | undefined {
    return db.update<PoliticaCancelacion>(KEY_POL, id, changes);
  },
  // Calcula multa por cancelación tardía o no-show
  calcularPenalidad(
    politicaId: string,
    montoTotalReserva: number,
    fechaCheckinISO: string,
    fechaCancelacionISO: string,
    esNoShow = false
  ): { multaPorcentaje: number; montoMulta: number; motivo: string } {
    const pol = this.buscarPorId(politicaId);
    if (!pol) return { multaPorcentaje: 0, montoMulta: 0, motivo: 'Sin política aplicada' };

    if (esNoShow) {
      const monto = Number(((pol.multaPorcentajeNoShow / 100) * montoTotalReserva).toFixed(2));
      return { multaPorcentaje: pol.multaPorcentajeNoShow, montoMulta: monto, motivo: 'No-Show según política' };
    }

    const horasAntelacion =
      (new Date(fechaCheckinISO).getTime() - new Date(fechaCancelacionISO).getTime()) / (1000 * 60 * 60);

    if (horasAntelacion >= pol.plazoHorasCancelacionGratis) {
      return { multaPorcentaje: 0, montoMulta: 0, motivo: `Cancelación con ${Math.round(horasAntelacion)}h de antelación. Gratis según ${pol.nombre}` };
    }

    const multa = (pol.multaPorcentajeCancelacionTardia / 100) * montoTotalReserva;
    return {
      multaPorcentaje: pol.multaPorcentajeCancelacionTardia,
      montoMulta: Number(multa.toFixed(2)),
      motivo: `Cancelación tardía: ${Math.round(horasAntelacion)}h < ${pol.plazoHorasCancelacionGratis}h`,
    };
  },
};

// ===== CÓDIGOS PROMOCIONALES =====
export const CodigoPromocionalService = {
  listarTodos(params?: { estado?: CodigoPromocional['estado']; soloVigentes?: boolean; fecha?: string }): CodigoPromocional[] {
    let lista = db.all<CodigoPromocional>(KEY_PROM);
    if (params?.estado) lista = lista.filter((c) => c.estado === params.estado);
    if (params?.soloVigentes) {
      const f = params.fecha ? new Date(params.fecha) : new Date();
      lista = lista.filter((c) => c.estado === 'ACTIVO' && f >= new Date(c.fechaInicio) && f <= new Date(c.fechaFin));
    }
    return lista;
  },
  buscarPorCodigo(codigo: string): CodigoPromocional | undefined {
    return db.findOne<CodigoPromocional>(KEY_PROM, (c) => c.codigo.trim().toUpperCase() === codigo.trim().toUpperCase());
  },
  buscarPorId(id: string): CodigoPromocional | undefined {
    return db.getById<CodigoPromocional>(KEY_PROM, id);
  },
  crear(payload: Create<CodigoPromocional>): CodigoPromocional {
    return db.add<CodigoPromocional>(KEY_PROM, payload);
  },
  /**
   * Valida si un promo es aplicable y devuelve el monto de descuento calculado.
   */
  validarYAplicar(params: {
    codigo: string;
    totalNoches: number;
    montoBaseReserva: number;
    tiposHabitacionIds?: string[];
    tarifasIds?: string[];
    clienteId?: string;
    fechaAplicacionISO?: string;
  }): {
    valido: boolean;
    motivo?: string;
    promo?: CodigoPromocional;
    descuentoMonto?: number;
    descuentoPorcentaje?: number;
  } {
    const promo = this.buscarPorCodigo(params.codigo);
    if (!promo) return { valido: false, motivo: 'Código no existe' };
    if (promo.estado !== 'ACTIVO') return { valido: false, motivo: 'Código inactivo' };

    const fecha = params.fechaAplicacionISO ? new Date(params.fechaAplicacionISO) : new Date();
    if (fecha < new Date(promo.fechaInicio) || fecha > new Date(promo.fechaFin)) {
      return { valido: false, promo, motivo: 'Código fuera de rango de fechas' };
    }

    if (promo.minimoNoches > 0 && params.totalNoches < promo.minimoNoches) {
      return { valido: false, promo, motivo: `Mínimo de ${promo.minimoNoches} noches (tienes ${params.totalNoches})` };
    }

    if (promo.minimoMonto > 0 && params.montoBaseReserva < promo.minimoMonto) {
      return { valido: false, promo, motivo: `Mínimo de S/ ${promo.minimoMonto.toFixed(2)} (tienes S/ ${params.montoBaseReserva.toFixed(2)})` };
    }

    if (promo.aplicaATiposHabitacionIds?.length && params.tiposHabitacionIds) {
      const cumple = params.tiposHabitacionIds.some((id) => promo.aplicaATiposHabitacionIds!.includes(id));
      if (!cumple) return { valido: false, promo, motivo: 'No aplica al tipo de habitación seleccionada' };
    }

    if (promo.aplicaATarifasIds?.length && params.tarifasIds) {
      const cumple = params.tarifasIds.some((id) => promo.aplicaATarifasIds!.includes(id));
      if (!cumple) return { valido: false, promo, motivo: 'No aplica a la tarifa seleccionada' };
    }

    // Calcular monto de descuento
    let monto = 0;
    let porcentaje = 0;
    if (promo.tipoDescuento === 'PORCENTAJE') {
      porcentaje = promo.valorDescuento;
      monto = Number(((porcentaje / 100) * params.montoBaseReserva).toFixed(2));
    } else {
      monto = promo.valorDescuento;
      porcentaje = Number(((monto / params.montoBaseReserva) * 100).toFixed(2));
    }

    return { valido: true, promo, descuentoMonto: monto, descuentoPorcentaje: porcentaje, motivo: 'Código aplicable' };
  },
  registrarUso(id: string): CodigoPromocional | undefined {
    const promo = db.getById<CodigoPromocional>(KEY_PROM, id);
    if (!promo) return undefined;
    const usos = (promo.usosActualesTotales ?? 0) + 1;
    let estado = promo.estado;
    if (promo.usosMaximosTotales > 0 && usos >= promo.usosMaximosTotales) estado = 'INACTIVO';
    return db.update<CodigoPromocional>(KEY_PROM, id, {
      usosActualesTotales: usos,
      estado,
      updatedBy: 'system-promociones',
    } as unknown as Update<CodigoPromocional>);
  },
};

// ===== TARIFAS =====
export const TarifaService = {
  listarTodas(params?: {
    tipoHabitacionId?: string;
    estado?: Tarifa['estado'];
    vigentesEnFecha?: string;
  }): Tarifa[] {
    let list = db.all<Tarifa>(KEY_TAR);
    if (params?.tipoHabitacionId) list = list.filter((t) => t.tipoHabitacionId === params.tipoHabitacionId);
    if (params?.estado) list = list.filter((t) => t.estado === params.estado);
    if (params?.vigentesEnFecha) {
      const f = params.vigentesEnFecha;
      list = list.filter((t) => t.fechaInicioVigencia <= f && t.fechaFinVigencia >= f);
    }
    return list.sort((a, b) => a.precioPorNoche - b.precioPorNoche);
  },
  buscarPorId(id: string): Tarifa | undefined {
    return db.getById<Tarifa>(KEY_TAR, id);
  },
  buscarMejorParaFecha(params: {
    tipoHabitacionId: string;
    fechaCheckinISO: string;
    noches: number;
    fechaCheckoutISO: string;
    codPromocionalAplicado?: string;
  }): {
    tarifa: Tarifa;
    precioPorNoche: number;
    factorTemporadaPorcentaje: number;
    subTotal: number;
    impuestosDetalle: { impuesto: ImpuestoTarifa; monto: number }[];
    totalConImpuestos: number;
    descuentoPromocionMonto: number;
    totalFinal: number;
  } {
    const { tipoHabitacionId, fechaCheckinISO, noches, codPromocionalAplicado } = params;
    let tarifas = this.listarTodas({
      tipoHabitacionId,
      estado: 'ACTIVO',
      vigentesEnFecha: fechaCheckinISO,
    });
    let tarifa: Tarifa;
    if (tarifas.length === 0) {
      const tipoHab = db.getById<any>('tiposHabitacion', tipoHabitacionId);
      const impuestos = ImpuestoService.listarTodos();
      tarifa = {
        id: `TAR-DYNAMIC-${tipoHabitacionId}`,
        tipoHabitacionId,
        nombre: `Tarifa Base ${tipoHab?.nombre || 'Habitación'}`,
        descripcion: 'Tarifa dinámica generada automáticamente (fallback)',
        precioPorNoche: Number(tipoHab?.precioBaseNoche) || 350,
        moneda: 'PEN',
        impuestosIds: impuestos.length ? impuestos.map((i) => i.id) : [],
        politicaCancelacionId: db.all<any>('politicasCancelacion')[0]?.id || 'POL-STANDARD',
        estado: 'ACTIVO',
        fechaInicioVigencia: seedUtil.addDaysISO(seedUtil.hoy(), -3650),
        fechaFinVigencia: seedUtil.addDaysISO(seedUtil.hoy(), 3650),
        politicaId: db.all<any>('politicasCancelacion')[0]?.id || 'POL-STANDARD',
        ...seedUtil.auditSeed(),
      } as any;
    } else {
      tarifa = tarifas[tarifas.length - 1]; // última (la más alta aplica general)
    }

    // Factor temporada por NOCHE (simplificado: fecha check-in)
    const factorPorcentaje = TemporadaService.calcularFactorPorcentaje(fechaCheckinISO);
    const multiplicador = 1 + factorPorcentaje / 100;
    const precioPorNoche = Number((tarifa.precioPorNoche * multiplicador).toFixed(2));
    const subTotal = Number((precioPorNoche * noches).toFixed(2));

    // Impuestos
    const imps = (tarifa.impuestosIds ?? []).map((id) => ImpuestoService.buscarPorId(id)).filter(Boolean) as ImpuestoTarifa[];
    const impuestosDetalle = imps.map((i) => {
      const porc = i.tipo === 'PORCENTAJE' ? i.valor : 0;
      return {
        impuesto: i,
        monto: Number(((subTotal * porc) / 100).toFixed(2)),
      };
    });
    const totalConImpuestos = Number(
      (subTotal + impuestosDetalle.reduce((s, x) => s + x.monto, 0)).toFixed(2)
    );

    // Promo
    let descuento = 0;
    if (codPromocionalAplicado) {
      const validacion = CodigoPromocionalService.validarYAplicar({
        codigo: codPromocionalAplicado,
        totalNoches: noches,
        montoBaseReserva: totalConImpuestos,
        tiposHabitacionIds: [tipoHabitacionId],
        tarifasIds: [tarifa.id],
        fechaAplicacionISO: fechaCheckinISO,
      });
      if (validacion.valido && validacion.descuentoMonto) {
        descuento = validacion.descuentoMonto;
        CodigoPromocionalService.registrarUso(validacion.promo!.id);
      }
    }

    const totalFinal = Number(Math.max(0, totalConImpuestos - descuento).toFixed(2));

    return {
      tarifa,
      precioPorNoche,
      factorTemporadaPorcentaje: factorPorcentaje,
      subTotal,
      impuestosDetalle,
      totalConImpuestos,
      descuentoPromocionMonto: descuento,
      totalFinal,
    };
  },

  crear(payload: Create<Tarifa>): Tarifa {
    return db.add<Tarifa>(KEY_TAR, payload);
  },
  actualizar(id: string, changes: Update<Tarifa>): Tarifa | undefined {
    return db.update<Tarifa>(KEY_TAR, id, changes);
  },
  eliminar(id: string): boolean {
    return db.remove(KEY_TAR, id);
  },
  reiniciarSeed(): void {
    db.reset();
  },
};

// ===== Helpers auxiliares =====
export const CalendarioReservasHelper = {
  /** Fechas ya ocupadas por habitación */
  fechasOcupadasPorHabitacion(): Record<string, Array<{ checkin: string; checkout: string; reservaId: string; estado: string }>> {
    const result: Record<string, Array<{ checkin: string; checkout: string; reservaId: string; estado: string }>> = {};
    const reservas = db.all<import('./__db__').Reserva>(KEY_RES);
    const habitaciones = db.all<import('./__db__').Habitacion>(KEY_HAB);
    for (const h of habitaciones) result[h.id] = [];
    for (const r of reservas) {
      if (r.estado === 'CANCELADA') continue;
      for (const rh of r.habitaciones) {
        const arr = result[rh.habitacionId] || [];
        arr.push({
          checkin: r.fechaCheckin,
          checkout: r.fechaCheckout,
          reservaId: r.id,
          estado: r.estado,
        });
        result[rh.habitacionId] = arr;
      }
    }
    return result;
  },

  hoyISO: () => seedUtil.hoy(),
  addDays: (iso: string, days: number) => seedUtil.addDaysISO(iso, days),
  nochesEntre: (checkinISO: string, checkoutISO: string): number => {
    const ms = new Date(checkoutISO).getTime() - new Date(checkinISO).getTime();
    return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
  },
};
