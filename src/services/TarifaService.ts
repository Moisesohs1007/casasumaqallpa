// @ts-nocheck
import { db, seedUtil, type Create, type Update, type Tarifa, type Temporada, type PoliticaCancelacion, type CodigoPromocional, type ImpuestoTarifa } from './__supabase_db__';

const KEY_TAR = 'tarifas';
const KEY_TEMP = 'temporadas';
const KEY_POL = 'politicasCancelacion';
const KEY_PROM = 'codigosPromo';
const KEY_IMP = 'impuestos';
const KEY_RES = 'reservas';
const KEY_HAB = 'habitaciones';

// ===== IMPUESTOS =====
export const ImpuestoService = {
  async listarTodos(): Promise<ImpuestoTarifa[]> {
    return db.allAsync<ImpuestoTarifa>(KEY_IMP);
  },
  async buscarPorId(id: string): Promise<ImpuestoTarifa | undefined> {
    return db.getByIdAsync<ImpuestoTarifa>(KEY_IMP, id);
  },
};

// ===== TEMPORADAS =====
export const TemporadaService = {
  async listarTodas(params?: { fechaISO?: string; tipo?: Temporada['tipo'] }): Promise<Temporada[]> {
    let list = (await db.allAsync<Temporada>(KEY_TEMP)).sort(
      (a, b) => new Date(a.fechaInicio as any).getTime() - new Date(b.fechaInicio as any).getTime()
    );
    if (params?.tipo) list = list.filter((t) => t.tipo === params.tipo);
    if (params?.fechaISO) {
      const f = new Date(params.fechaISO).getTime();
      list = list.filter(
        (t) =>
          f >= new Date(t.fechaInicio as any).setHours(0, 0, 0, 0) &&
          f <= new Date(t.fechaFin as any).setHours(23, 59, 59, 999)
      );
    }
    return list;
  },
  async buscarPorId(id: string): Promise<Temporada | undefined> {
    return db.getByIdAsync<Temporada>(KEY_TEMP, id);
  },
  async crear(payload: Create<Temporada>): Promise<Temporada> {
    return db.addAsync<Temporada>(KEY_TEMP, payload);
  },
  async actualizar(id: string, changes: Update<Temporada>): Promise<Temporada | undefined> {
    return db.updateAsync<Temporada>(KEY_TEMP, id, changes);
  },
  async calcularFactorPorcentaje(fechaISO: string): Promise<number> {
    const lista = await this.listarTodas({ fechaISO });
    if (lista.length === 0) return 0;
    return lista.reduce((max, t) => Math.max(max, t.factorPrecioPorcentaje || 0), 0);
  },
};

// ===== POLÍTICAS DE CANCELACIÓN =====
export const PoliticaCancelacionService = {
  async listarTodas(): Promise<PoliticaCancelacion[]> {
    return db.allAsync<PoliticaCancelacion>(KEY_POL);
  },
  async buscarPorId(id: string): Promise<PoliticaCancelacion | undefined> {
    return db.getByIdAsync<PoliticaCancelacion>(KEY_POL, id);
  },
  async crear(payload: Create<PoliticaCancelacion>): Promise<PoliticaCancelacion> {
    return db.addAsync<PoliticaCancelacion>(KEY_POL, payload);
  },
  async actualizar(id: string, changes: Update<PoliticaCancelacion>): Promise<PoliticaCancelacion | undefined> {
    return db.updateAsync<PoliticaCancelacion>(KEY_POL, id, changes);
  },
  async calcularPenalidad(
    politicaId: string,
    montoTotalReserva: number,
    fechaCheckinISO: string,
    fechaCancelacionISO: string,
    esNoShow = false
  ): Promise<{ multaPorcentaje: number; montoMulta: number; motivo: string }> {
    const pol = await this.buscarPorId(politicaId);
    if (!pol) return { multaPorcentaje: 0, montoMulta: 0, motivo: 'Sin política aplicada' };

    if (esNoShow) {
      const monto = Number((((pol.multaPorcentajeNoShow || 0) / 100) * montoTotalReserva).toFixed(2));
      return { multaPorcentaje: pol.multaPorcentajeNoShow || 0, montoMulta: monto, motivo: 'No-Show según política' };
    }

    const horasAntelacion =
      (new Date(fechaCheckinISO).getTime() - new Date(fechaCancelacionISO).getTime()) / (1000 * 60 * 60);

    if (horasAntelacion >= (pol.plazoHorasCancelacionGratis || 0)) {
      return { multaPorcentaje: 0, montoMulta: 0, motivo: `Cancelación con ${Math.round(horasAntelacion)}h de antelación. Gratis según ${pol.nombre}` };
    }

    const multa = ((pol.multaPorcentajeCancelacionTardia || 0) / 100) * montoTotalReserva;
    return {
      multaPorcentaje: pol.multaPorcentajeCancelacionTardia || 0,
      montoMulta: Number(multa.toFixed(2)),
      motivo: `Cancelación tardía: ${Math.round(horasAntelacion)}h < ${pol.plazoHorasCancelacionGratis}h`,
    };
  },
};

// ===== CÓDIGOS PROMOCIONALES =====
export const CodigoPromocionalService = {
  async listarTodos(params?: { estado?: CodigoPromocional['estado']; soloVigentes?: boolean; fecha?: string }): Promise<CodigoPromocional[]> {
    let lista = await db.allAsync<CodigoPromocional>(KEY_PROM);
    if (params?.estado) lista = lista.filter((c) => c.estado === params.estado);
    if (params?.soloVigentes) {
      const f = params.fecha ? new Date(params.fecha) : new Date();
      lista = lista.filter((c) => c.estado === 'ACTIVO' && f >= new Date(c.fechaInicio as any) && f <= new Date(c.fechaFin as any));
    }
    return lista;
  },
  async buscarPorCodigo(codigo: string): Promise<CodigoPromocional | undefined> {
    return db.findOneAsync<CodigoPromocional>(KEY_PROM, (c) => (c.codigo || '').trim().toUpperCase() === codigo.trim().toUpperCase());
  },
  async buscarPorId(id: string): Promise<CodigoPromocional | undefined> {
    return db.getByIdAsync<CodigoPromocional>(KEY_PROM, id);
  },
  async crear(payload: Create<CodigoPromocional>): Promise<CodigoPromocional> {
    return db.addAsync<CodigoPromocional>(KEY_PROM, payload);
  },
  async validarYAplicar(params: {
    codigo: string;
    totalNoches: number;
    montoBaseReserva: number;
    tiposHabitacionIds?: string[];
    tarifasIds?: string[];
    clienteId?: string;
    fechaAplicacionISO?: string;
  }): Promise<{
    valido: boolean;
    motivo?: string;
    promo?: CodigoPromocional;
    descuentoMonto?: number;
    descuentoPorcentaje?: number;
  }> {
    const promo = await this.buscarPorCodigo(params.codigo);
    if (!promo) return { valido: false, motivo: 'Código no existe' };
    if (promo.estado !== 'ACTIVO') return { valido: false, motivo: 'Código inactivo' };

    const fecha = params.fechaAplicacionISO ? new Date(params.fechaAplicacionISO) : new Date();
    if (fecha < new Date(promo.fechaInicio as any) || fecha > new Date(promo.fechaFin as any)) {
      return { valido: false, promo, motivo: 'Código fuera de rango de fechas' };
    }

    if ((promo.minimoNoches || 0) > 0 && params.totalNoches < (promo.minimoNoches || 0)) {
      return { valido: false, promo, motivo: `Mínimo de ${promo.minimoNoches} noches (tienes ${params.totalNoches})` };
    }

    if ((promo.minimoMonto || 0) > 0 && params.montoBaseReserva < (promo.minimoMonto || 0)) {
      return { valido: false, promo, motivo: `Mínimo de S/ ${promo.minimoMonto!.toFixed(2)} (tienes S/ ${params.montoBaseReserva.toFixed(2)})` };
    }

    if ((promo.aplicaATiposHabitacionIds as any)?.length && params.tiposHabitacionIds) {
      const cumple = params.tiposHabitacionIds.some((id) => (promo.aplicaATiposHabitacionIds as any).includes(id));
      if (!cumple) return { valido: false, promo, motivo: 'No aplica al tipo de habitación seleccionada' };
    }

    if ((promo.aplicaATarifasIds as any)?.length && params.tarifasIds) {
      const cumple = params.tarifasIds.some((id) => (promo.aplicaATarifasIds as any).includes(id));
      if (!cumple) return { valido: false, promo, motivo: 'No aplica a la tarifa seleccionada' };
    }

    let monto = 0;
    let porcentaje = 0;
    if (promo.tipoDescuento === 'PORCENTAJE') {
      porcentaje = promo.valorDescuento || 0;
      monto = Number(((porcentaje / 100) * params.montoBaseReserva).toFixed(2));
    } else {
      monto = promo.valorDescuento || 0;
      porcentaje = Number(((monto / params.montoBaseReserva) * 100).toFixed(2));
    }

    return { valido: true, promo, descuentoMonto: monto, descuentoPorcentaje: porcentaje, motivo: 'Código aplicable' };
  },
  async registrarUso(id: string): Promise<CodigoPromocional | undefined> {
    const promo = await db.getByIdAsync<CodigoPromocional>(KEY_PROM, id);
    if (!promo) return undefined;
    const usos = ((promo as any).usosActualesTotales ?? 0) + 1;
    let estado = promo.estado;
    if ((promo.usosMaximosTotales || 0) > 0 && usos >= (promo.usosMaximosTotales || 0)) estado = 'INACTIVO';
    return db.updateAsync<CodigoPromocional>(KEY_PROM, id, {
      usosActualesTotales: usos,
      estado,
      updatedBy: 'system-promociones',
    } as unknown as Update<CodigoPromocional>);
  },
};

// ===== TARIFAS =====
export const TarifaService = {
  async listarTodas(params?: {
    tipoHabitacionId?: string;
    estado?: Tarifa['estado'];
    vigentesEnFecha?: string;
  }): Promise<Tarifa[]> {
    let list = await db.allAsync<Tarifa>(KEY_TAR);
    if (params?.tipoHabitacionId) list = list.filter((t) => t.tipoHabitacionId === params.tipoHabitacionId);
    if (params?.estado) list = list.filter((t) => t.estado === params.estado);
    if (params?.vigentesEnFecha) {
      const f = params.vigentesEnFecha;
      list = list.filter((t) => (t.fechaInicioVigencia as any) <= f && (t.fechaFinVigencia as any) >= f);
    }
    return list.sort((a, b) => (a.precioPorNoche || 0) - (b.precioPorNoche || 0));
  },
  async buscarPorId(id: string): Promise<Tarifa | undefined> {
    return db.getByIdAsync<Tarifa>(KEY_TAR, id);
  },
  async buscarMejorParaFecha(params: {
    tipoHabitacionId: string;
    fechaCheckinISO: string;
    noches: number;
    fechaCheckoutISO: string;
    codPromocionalAplicado?: string;
  }): Promise<{
    tarifa: Tarifa;
    precioPorNoche: number;
    factorTemporadaPorcentaje: number;
    subTotal: number;
    impuestosDetalle: { impuesto: ImpuestoTarifa; monto: number }[];
    totalConImpuestos: number;
    descuentoPromocionMonto: number;
    totalFinal: number;
  }> {
    const { tipoHabitacionId, fechaCheckinISO, noches, codPromocionalAplicado } = params;
    const tarifas = await this.listarTodas({
      tipoHabitacionId,
      estado: 'ACTIVO',
      vigentesEnFecha: fechaCheckinISO,
    });
    let tarifa: Tarifa;
    if (tarifas.length === 0) {
      const tipoHab = (await db.getByIdAsync<any>('tiposHabitacion', tipoHabitacionId)) as any;
      const impuestos = await ImpuestoService.listarTodos();
      const pols = await db.allAsync<any>('politicasCancelacion');
      tarifa = {
        id: `TAR-DYNAMIC-${tipoHabitacionId}`,
        tipoHabitacionId,
        nombre: `Tarifa Base ${tipoHab?.nombre || 'Habitación'}`,
        descripcion: 'Tarifa dinámica generada automáticamente (fallback)',
        precioPorNoche: Number(tipoHab?.precioBaseNoche || tipoHab?.precioBaseNoche || 350),
        moneda: 'PEN',
        impuestosIds: impuestos.length ? impuestos.map((i) => i.id) : [],
        politicaCancelacionId: pols[0]?.id || 'POL-STANDARD',
        estado: 'ACTIVO',
        fechaInicioVigencia: seedUtil.addDaysISO(seedUtil.hoy(), -3650),
        fechaFinVigencia: seedUtil.addDaysISO(seedUtil.hoy(), 3650),
        politicaId: pols[0]?.id || 'POL-STANDARD',
      } as any;
    } else {
      tarifa = tarifas[tarifas.length - 1];
    }

    const factorPorcentaje = await TemporadaService.calcularFactorPorcentaje(fechaCheckinISO);
    const multiplicador = 1 + factorPorcentaje / 100;
    const precioPorNoche = Number(((tarifa.precioPorNoche || 0) * multiplicador).toFixed(2));
    const subTotal = Number((precioPorNoche * noches).toFixed(2));

    const impsPromises = (tarifa.impuestosIds ?? []).map((id) => ImpuestoService.buscarPorId(id));
    const impsRaw = await Promise.all(impsPromises);
    const imps = impsRaw.filter(Boolean) as ImpuestoTarifa[];
    const impuestosDetalle = imps.map((i) => {
      const porc = i.tipo === 'PORCENTAJE' ? i.valor : 0;
      return {
        impuesto: i,
        monto: Number((((subTotal * (porc || 0)) / 100).toFixed(2))),
      };
    });
    const totalConImpuestos = Number(
      (subTotal + impuestosDetalle.reduce((s, x) => s + x.monto, 0)).toFixed(2)
    );

    let descuento = 0;
    if (codPromocionalAplicado) {
      const validacion = await CodigoPromocionalService.validarYAplicar({
        codigo: codPromocionalAplicado,
        totalNoches: noches,
        montoBaseReserva: totalConImpuestos,
        tiposHabitacionIds: [tipoHabitacionId],
        tarifasIds: [tarifa.id],
        fechaAplicacionISO: fechaCheckinISO,
      });
      if (validacion.valido && validacion.descuentoMonto && validacion.promo) {
        descuento = validacion.descuentoMonto;
        await CodigoPromocionalService.registrarUso(validacion.promo.id);
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

  async crear(payload: Create<Tarifa>): Promise<Tarifa> {
    return db.addAsync<Tarifa>(KEY_TAR, payload);
  },
  async actualizar(id: string, changes: Update<Tarifa>): Promise<Tarifa | undefined> {
    return db.updateAsync<Tarifa>(KEY_TAR, id, changes);
  },
  async eliminar(id: string): Promise<boolean> {
    return db.removeAsync(KEY_TAR, id);
  },
  reiniciarSeed(): void {
    db.reset();
  },
};

// ===== Helpers auxiliares =====
export const CalendarioReservasHelper = {
  async fechasOcupadasPorHabitacion(): Promise<Record<string, Array<{ checkin: string; checkout: string; reservaId: string; estado: string }>>> {
    const result: Record<string, Array<{ checkin: string; checkout: string; reservaId: string; estado: string }>> = {};
    const reservas = await db.allAsync<import('./__supabase_db__').Reserva>(KEY_RES);
    const habitaciones = await db.allAsync<import('./__supabase_db__').Habitacion>(KEY_HAB);
    for (const h of habitaciones) result[h.id] = [];
    for (const r of reservas) {
      if (r.estado === 'CANCELADA') continue;
      for (const rh of (r as any).habitaciones || []) {
        const arr = result[rh.habitacionId] || [];
        arr.push({
          checkin: r.fechaCheckin as any,
          checkout: r.fechaCheckout as any,
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

export default TarifaService;
