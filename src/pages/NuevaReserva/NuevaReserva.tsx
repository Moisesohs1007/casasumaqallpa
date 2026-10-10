import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle,
  IonCardTitle, IonCol, IonContent, IonDatetime, IonGrid, IonHeader, IonIcon, IonInput,
  IonItem, IonLabel, IonList, IonNote, IonPage, IonRow, IonSelect, IonSelectOption,
  IonTitle, IonToolbar, IonAlert, IonTextarea, IonChip, IonBadge, IonToast, useIonViewWillEnter,
} from '@ionic/react';
import { addCircle, addCircleOutline, arrowForwardOutline, checkmark, closeOutline, bed, checkmarkDone, person, cash, ticket, calendar, time, documentText, pricetags, checkmarkCircle, alertCircle, arrowBackOutline, cloudOfflineOutline, cloudOutline, cloudDoneOutline, trash } from 'ionicons/icons';

import {
  HuespedService,
  HabitacionService,
  ReservaService,
  TarifaService,
  pendingSync,
} from '../../services';

import type {
  Huesped,
  Habitacion,
  OrigenReserva,
  TipoDocumento,
  Reserva,
} from '../../types';
import { seedUtil } from '../../services/__db__';

const hoyMas = (dias = 1): string => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

const origenOpciones: Array<{ label: string; value: OrigenReserva; icon: any; color: string }> = [
  { label: 'Página Web Oficial', value: 'WEB_OFICIAL', icon: pricetags, color: 'primary' },
  { label: 'WhatsApp / RRSS', value: 'WHATSAPP', icon: pricetags, color: 'success' },
  { label: 'Llamada / Recepción', value: 'TELEFONO', icon: pricetags, color: 'warning' },
  { label: 'Booking / OTA', value: 'BOOKING', icon: pricetags, color: 'medium' },
  { label: 'Agencia de viajes', value: 'AGENCIA_VIAJES', icon: pricetags, color: 'tertiary' },
  { label: 'Walk-in directo', value: 'WALK_IN', icon: pricetags, color: 'secondary' },
];

const NuevaReserva: React.FC = () => {
  const PASOS = [
    { id: 1, titulo: 'Huésped', icono: person },
    { id: 2, titulo: 'Fechas & Hab.', icono: bed },
    { id: 3, titulo: 'Tarifa y Promo', icono: ticket },
    { id: 4, titulo: 'Confirmar', icono: cash },
  ] as const;
  type PasoId = typeof PASOS[number]['id'];
  const [paso, setPaso] = useState<PasoId>(1);
  const retrocederPaso = (ant: PasoId) => setPaso(ant);

  // ====== Paso 1: Huésped ======
  const [buscarTipoDoc, setBuscarTipoDoc] = useState<TipoDocumento>('DNI');
  const [buscarDoc, setBuscarDoc] = useState('');
  const [buscarTexto, setBuscarTexto] = useState('');
  const [huespedEncontrado, setHuespedEncontrado] = useState<Huesped | null>(null);
  const [busquedas, setBusquedas] = useState<Huesped[]>([]);
  const [nuevoHuesped, setNuevoHuesped] = useState<Partial<Huesped>>({
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    nombres: '',
    apellidos: '',
    nacionalidad: 'PERU',
    telefonoCelular: '',
    email: '',
    direccion: '',
  });
  const [huespedFinal, setHuespedFinal] = useState<Huesped | null>(null);

  // ====== Paso 2: Habitación + fechas ======
  const [checkin, setCheckin] = useState<string>(hoyMas(1));
  const [checkout, setCheckout] = useState<string>(hoyMas(4));
  const [adultos, setAdultos] = useState<number>(2);
  const [ninos, setNinos] = useState<number>(0);
  const [habitacionesDisponibles, setHabitacionesDisponibles] = useState<Habitacion[]>([]);
  const [habitacionSeleccionada, setHabitacionSeleccionada] = useState<Habitacion | null>(null);
  const noches = useMemo(() => {
    if (!checkin || !checkout) return 0;
    return Math.max(1, Math.round(
      (new Date(checkout).getTime() - new Date(checkin).getTime()) / (1000 * 60 * 60 * 24)
    ));
  }, [checkin, checkout]);

  // ====== Paso 3: Rangos Tarifarios DINÁMICOS (core: Σ precio/noche × rango.noches) ======
  type RangoTarifario = {
    id: string;
    fechaInicio: string;
    fechaFin: string;
    precioPorNoche: number;
  };
  const [rangosTarifarios, setRangosTarifarios] = useState<RangoTarifario[]>([]);

  const calcularPrecioBaseSugerido = (fechaRefISO?: string): number => {
    if (!habitacionSeleccionada) return 0;
    const tipoHab = HabitacionService.listarTipos().find((t) => t.id === habitacionSeleccionada.tipoHabitacionId);
    let precioBase = Number(tipoHab?.precioBaseNoche) || 0;
    const baseTarifas = (TarifaService as any).listarTodas?.({
      tipoHabitacionId: habitacionSeleccionada.tipoHabitacionId,
      estado: 'ACTIVO',
      vigentesEnFecha: fechaRefISO || `${checkin}T15:00:00.000Z`,
    }) ?? [];
    if (Array.isArray(baseTarifas) && baseTarifas.length > 0) {
      const tPreferida = baseTarifas[baseTarifas.length - 1];
      precioBase = Number(tPreferida?.precioPorNoche) || precioBase;
      try {
        const factorPct = (TarifaService as any).TemporadaService?.calcularFactorPorcentaje?.(fechaRefISO || `${checkin}T15:00:00.000Z`) ?? 0;
        if (!isNaN(factorPct)) precioBase = Number((precioBase * (1 + factorPct / 100)).toFixed(2));
      } catch { /* ignore */ }
    }
    // NUEVA REGLA USUARIO: NUNCA forzar precio por defecto "350" si habitacion no tiene tarifario.
    // Si no hay dato (precioBase=0) => dejar 0 (input vacío para que el operador ponga manualmente).
    return Number(precioBase) > 0 ? Number(precioBase) : 0;
  };

  const calcularNochesRango = (r: { fechaInicio: string; fechaFin: string }): number => {
    if (!r.fechaInicio || !r.fechaFin) return 0;
    const ms = new Date(r.fechaFin).getTime() - new Date(r.fechaInicio).getTime();
    return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
  };

  const calcularSubtotalRango = (r: { fechaInicio: string; fechaFin: string; precioPorNoche: number }): number => {
    return Number((calcularNochesRango(r) * Number(r.precioPorNoche || 0)).toFixed(2));
  };

  // Efecto: (a) primera vez o CAMBIO HABITACIÓN / RANGO FECHAS INCOMPATIBLE → RESET a 1 solo bloque VACÍO (precio 0 manual)
  //         (b) fechas compatibles pero bloque 1 inicio < checkin o ultimo bloque fin > checkout: ajustar suavemente fechas limites
  const habIdRef = useRef<string>('');
  const fechasKeyRef = useRef<string>('');
  useEffect(() => {
    if (!checkin || !checkout || noches < 1) return;
    const fechasKey = `${checkin}__${checkout}`;
    const habitacionCambio = habitacionSeleccionada?.id !== habIdRef.current;
    const rangoIncompatible = fechasKey !== fechasKeyRef.current;
    habIdRef.current = habitacionSeleccionada?.id || '';
    fechasKeyRef.current = fechasKey;
    setRangosTarifarios((prev) => {
      // RESET COMPLETO si cambió habitación O si el rango general NO coincide con rangos que tenemos (fechas completamente distintas)
      const ultFin = prev[prev.length - 1]?.fechaFin;
      const primerIni = prev[0]?.fechaInicio;
      const fechasCompatiblesConPrev = Array.isArray(prev) && prev.length > 0 &&
        ultFin && primerIni &&
        new Date(primerIni) >= new Date(checkin) && new Date(ultFin) <= new Date(checkout);
      const needsReset = habitacionCambio || (rangoIncompatible && !fechasCompatiblesConPrev);
      if (needsReset) {
        // NUEVO: siempre inicializa bloque SIN PRECIO (precioPorNoche=0) para que operador ponga el monto manualmente.
        return [{ id: seedUtil.generateUUID(), fechaInicio: checkin, fechaFin: checkout, precioPorNoche: 0 }];
      }
      // Ajuste suave (sin reset): bloques 1 y ultimo ajustar bordes para coincidir con general; no tocar precio.
      let cambiado = false;
      const next = prev.map((r, i) => {
        let { fechaInicio, fechaFin, precioPorNoche } = r;
        if (i === 0 && new Date(fechaInicio) > new Date(checkin)) { fechaInicio = checkin; cambiado = true; }
        if (i === prev.length - 1 && new Date(fechaFin) < new Date(checkout)) { fechaFin = checkout; cambiado = true; }
        if (i === 0 && new Date(fechaInicio) < new Date(checkin)) { fechaInicio = checkin; cambiado = true; }
        if (i === prev.length - 1 && new Date(fechaFin) > new Date(checkout)) { fechaFin = checkout; cambiado = true; }
        return { ...r, fechaInicio, fechaFin, precioPorNoche };
      });
      return cambiado ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkin, checkout, habitacionSeleccionada?.id]);

  const agregarNuevoRango = () => {
    if (rangosTarifarios.length === 0) {
      // No hay rangos: crear 1er rango = rango general completo VACÍO (precio 0)
      setRangosTarifarios([{ id: seedUtil.generateUUID(), fechaInicio: checkin, fechaFin: checkout, precioPorNoche: 0 }]);
      return;
    }
    // Hay rangos: tomar último rango, crear uno nuevo 1 día después del fin del último (para encadenar sin huecos por defecto)
    const ult = rangosTarifarios[rangosTarifarios.length - 1];
    const siguienteInicio = (() => {
      if (!ult.fechaFin) return checkin;
      const d = new Date(ult.fechaFin);
      const iso = d.toISOString().slice(0, 10);
      if (new Date(iso) > new Date(checkout)) return checkout;
      return iso;
    })();
    const siguienteFin = (() => {
      if (new Date(siguienteInicio) >= new Date(checkout)) {
        return checkout;
      }
      return checkout;
    })();
    if (new Date(siguienteInicio) >= new Date(siguienteFin)) {
      // Ya no hay más días libres para agregar rangos (todos cubiertos). No crear bloque hueco.
      return;
    }
    // NUEVO: Rango nuevo siempre inicia con precio VACÍO.
    const nr: RangoTarifario = { id: seedUtil.generateUUID(), fechaInicio: siguienteInicio, fechaFin: siguienteFin, precioPorNoche: 0 };
    setRangosTarifarios([...rangosTarifarios, nr]);
  };

  const eliminarRangoPorId = (id: string) => {
    setRangosTarifarios((prev) => prev.filter((r) => r.id !== id));
  };

  const actualizarRangoPorId = (id: string, patch: Partial<RangoTarifario>) => {
    setRangosTarifarios((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  // Validación COBERTURA 100% + NO SOLAPAMIENTOS (regla 2=A):
  // Retorna { valido:boolean, cobertura: [fecha1 -> 0/1/2 veces cubierta], faltantes:string[], solapados:string[] }
  const validacionRangosCompleta = useMemo<{
    valido: boolean;
    coberturaMap: Record<string, number>;
    faltantesNochesStr: string[];
    solapadosNochesStr: string[];
    erroresCount: number;
  }>(() => {
    const coberturaMap: Record<string, number> = {};
    if (noches < 1 || !checkin || !checkout) {
      return { valido: false, coberturaMap, faltantesNochesStr: [], solapadosNochesStr: [], erroresCount: 99 };
    }
    // Generar cada "noche individual" del rango general = fechaInicioNoche (fecha que hace noche esa fecha)
    const nochesStr: string[] = [];
    const fecIni = new Date(checkin);
    const fecFin = new Date(checkout);
    for (let d = new Date(fecIni); d < fecFin; d.setDate(d.getDate() + 1)) {
      nochesStr.push(d.toISOString().slice(0, 10));
    }
    nochesStr.forEach((n) => (coberturaMap[n] = 0));
    for (const r of rangosTarifarios) {
      if (!r.fechaInicio || !r.fechaFin) continue;
      const r0 = new Date(r.fechaInicio);
      const r1 = new Date(r.fechaFin);
      // Limitar al rango general (evitar días fuera)
      const rIni = r0 > fecIni ? r0 : fecIni;
      const rFin = r1 < fecFin ? r1 : fecFin;
      for (let d = new Date(rIni); d < rFin; d.setDate(d.getDate() + 1)) {
        const k = d.toISOString().slice(0, 10);
        if (!(k in coberturaMap)) continue;
        coberturaMap[k] += 1;
      }
    }
    const faltantesNochesStr: string[] = [];
    const solapadosNochesStr: string[] = [];
    nochesStr.forEach((n) => {
      const c = coberturaMap[n] || 0;
      if (c === 0) faltantesNochesStr.push(n);
      if (c >= 2) solapadosNochesStr.push(n);
    });
    const erroresCount = faltantesNochesStr.length + solapadosNochesStr.length + (nochesStr.length === 0 ? 1 : 0);
    return { valido: erroresCount === 0, coberturaMap, faltantesNochesStr, solapadosNochesStr, erroresCount };
  }, [rangosTarifarios, checkin, checkout, noches]);

  const totalSumaRangos = Number(rangosTarifarios.reduce((s, r) => s + calcularSubtotalRango(r), 0).toFixed(2));

  const avanzarPaso = (sig: PasoId) => {
    if (paso === 1 && !huespedFinal) {
      setErrorMsg('Selecciona o crea un huésped antes de continuar.'); return;
    }
    if (paso === 2 && (!habitacionSeleccionada || noches < 1)) {
      setErrorMsg('Selecciona fechas y una habitación disponible.'); return;
    }
    if (paso === 3) {
      if (rangosTarifarios.length === 0) {
        setErrorMsg('Paso 3: Agrega al menos 1 rango de precios con el botón [+ Agregar rango].'); return;
      }
      if (!validacionRangosCompleta.valido) {
        let mensajeE = 'Paso 3: Revisa rangos. ';
        if (validacionRangosCompleta.faltantesNochesStr.length > 0) {
          mensajeE += `Faltan ${validacionRangosCompleta.faltantesNochesStr.length} noche(s) por asignar precio: ${validacionRangosCompleta.faltantesNochesStr.slice(0, 5).join(', ')}${validacionRangosCompleta.faltantesNochesStr.length > 5 ? '...' : ''}. `;
        }
        if (validacionRangosCompleta.solapadosNochesStr.length > 0) {
          mensajeE += `Hay ${validacionRangosCompleta.solapadosNochesStr.length} noche(s) solapadas (precio doble): ${validacionRangosCompleta.solapadosNochesStr.slice(0, 5).join(', ')}${validacionRangosCompleta.solapadosNochesStr.length > 5 ? '...' : ''}. `;
        }
        setErrorMsg(mensajeE); return;
      }
      if (!resumenTarifa) { setErrorMsg('Paso 3: Calcula tarifa antes de continuar.'); return; }
    }
    setPaso(sig);
  };

  // ====== Paso 3: Promo (codigo promocional + descuento) ======
  const [codPromoInput, setCodPromoInput] = useState('');
  const [promoValidacionMsg, setPromoValidacionMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const tarifasDisponiblesParaHab = useMemo(() => {
    if (!habitacionSeleccionada) return [];
    const base = (TarifaService as any).listarTodas?.({
      tipoHabitacionId: habitacionSeleccionada.tipoHabitacionId,
      estado: 'ACTIVO',
      vigentesEnFecha: `${checkin}T15:00:00.000Z`,
    }) ?? [];
    const tipoHab = HabitacionService.listarTipos().find((t) => t.id === habitacionSeleccionada.tipoHabitacionId);
    if (base.length === 0 && tipoHab) {
      base.push({
        id: `TAR-DYN-${tipoHab.id}`,
        tipoHabitacionId: tipoHab.id,
        nombre: `Tarifa Base ${tipoHab.nombre} (auto)`,
        descripcion: 'Tarifa por defecto tipo de habitación',
        precioPorNoche: Number(tipoHab.precioBaseNoche) || 350,
        moneda: 'PEN',
      });
    }
    return base;
  }, [habitacionSeleccionada, checkin]);

  const resumenTarifa = useMemo(() => {
    if (!habitacionSeleccionada || noches < 1) return null;

    // ===== MODO NUEVO: TARIFICACIÓN POR RANGOS DINÁMICOS (default 1 bloque completo) =====
    // Si hay rangos y todos son válidos (o al menos hay rangos y suma>0) → usamos totalSumaRangos
    const sumaRangosBruta = Number(rangosTarifarios.reduce((s, r) => s + calcularSubtotalRango(r), 0).toFixed(2));
    const usarModoRangos = rangosTarifarios.length > 0 && sumaRangosBruta > 0;

    // (1) Determinar valores base de cálculo (subTotalSinImpuestos + precioNoche promedio + tarifaNombre)
    let precioNoche: number = 0;
    let tarifaNombre = '';
    let tarifaId: string | null = null;
    let subTotalSinImpuestos: number;
    let montoImpuestos: number;

    if (usarModoRangos) {
      // totalSumaRangos = Σ r.noches × r.precioPorNoche  (precio base de rango se asume es precio CON impuestos incluidos = standar peruano SUNAT)
      const totalConImpuestosRangos = sumaRangosBruta;
      subTotalSinImpuestos = Number((totalConImpuestosRangos / 1.18).toFixed(2));
      montoImpuestos = Number((totalConImpuestosRangos - subTotalSinImpuestos).toFixed(2));
      const diff = totalConImpuestosRangos - Number((subTotalSinImpuestos + montoImpuestos).toFixed(2));
      if (Math.abs(diff) > 0.001) subTotalSinImpuestos = Number((subTotalSinImpuestos + diff).toFixed(2));
      // precioNoche "promedio ponderado" (solo para visualizar en el resumen)
      let totalNochesCubiertas = 0;
      for (const r of rangosTarifarios) totalNochesCubiertas += calcularNochesRango(r);
      precioNoche = totalNochesCubiertas > 0 ? Number((totalConImpuestosRangos / totalNochesCubiertas).toFixed(2)) : 0;
      tarifaNombre = rangosTarifarios.length === 1 ? 'Tarifa 1 rango' : `Tarifa ${rangosTarifarios.length} rangos (días distintos)`;
      tarifaId = rangosTarifarios[0]?.id || null;
    } else {
      // ====== MODO LEGACY: Tarifa seleccionada o precio manual (1 solo precio noche × noches) ======
      let _precioNoche: number;
      let _tarifaNombre = '';
      let _tarifaId: string | null = null;
      const _precioNocheManualStr = ''; // legacy deshabilitado (ahora solo rangos). Si quieres volver, usar el viejo precioNocheManual.
      if (_precioNocheManualStr.trim() && !isNaN(Number(_precioNocheManualStr)) && Number(_precioNocheManualStr) > 0) {
        _precioNoche = Number(_precioNocheManualStr);
        _tarifaNombre = 'Precio manual (override)';
      } else {
        let tarifa: any = null;
        if (!tarifa && tarifasDisponiblesParaHab.length > 0) {
          tarifa = tarifasDisponiblesParaHab[tarifasDisponiblesParaHab.length - 1];
        }
        if (!tarifa) {
          const tipoHab = HabitacionService.listarTipos().find((t) => t.id === habitacionSeleccionada.tipoHabitacionId);
          _precioNoche = Number(tipoHab?.precioBaseNoche) || 350;
          _tarifaNombre = `Tarifa Base ${tipoHab?.nombre || 'Habitación'}`;
        } else {
          const factorPct = (TarifaService as any).TemporadaService?.calcularFactorPorcentaje?.(`${checkin}T15:00:00.000Z`) ?? 0;
          _precioNoche = Number((Number(tarifa.precioPorNoche || 0) * (1 + factorPct / 100)).toFixed(2));
          _tarifaNombre = tarifa.nombre;
          _tarifaId = tarifa.id;
        }
      }
      precioNoche = _precioNoche;
      tarifaNombre = _tarifaNombre;
      tarifaId = _tarifaId;
      subTotalSinImpuestos = Number((precioNoche * noches).toFixed(2));
      montoImpuestos = Number((subTotalSinImpuestos * 0.18).toFixed(2));
    }

    // (2) Impuestos detalle (SOLO IGV 18% - regla SUNAT). Se arma impuestosDetalle para el render.
    const imps = (TarifaService as any).ImpuestoService?.listarTodos?.() ?? [];
    const impuestosDetalle = imps.length > 0 ? imps.map((i: any) => {
      const porc = i.tipo === 'PORCENTAJE' ? i.valor : 0;
      return {
        impuesto: i,
        monto: Number(((subTotalSinImpuestos * porc) / 100).toFixed(2)),
      };
    }) : [
      { impuesto: { id: 'IGV-18', nombre: 'IGV', valor: 18, tipo: 'PORCENTAJE' }, monto: montoImpuestos },
    ];
    const subTotalConImpuestos = Number((subTotalSinImpuestos + montoImpuestos).toFixed(2));

    // (3) Promo (aplica sobre subTotalConImpuestos)
    let descuentoPromo = 0;
    let promoAplicada: any = null;
    let promoValida = false;
    if (codPromoInput.trim()) {
      const cod = codPromoInput.trim().toUpperCase();
      try {
        const validacion = (TarifaService as any).CodigoPromocionalService?.validarYAplicar?.({
          codigo: cod,
          totalNoches: noches,
          montoBaseReserva: subTotalConImpuestos,
          tiposHabitacionIds: [habitacionSeleccionada.tipoHabitacionId],
          tarifasIds: tarifaId ? [tarifaId] : undefined,
          fechaAplicacionISO: `${checkin}T15:00:00.000Z`,
        }) ?? {};
        if (validacion.valido && validacion.descuentoMonto) {
          descuentoPromo = Number(validacion.descuentoMonto);
          promoAplicada = validacion.promo;
          promoValida = true;
        }
      } catch { /* ignore */ }
    }

    const totalFinal = Number(Math.max(0, subTotalConImpuestos - descuentoPromo).toFixed(2));

    return {
      tarifaNombre,
      tarifaId,
      precioNoche,
      subTotalSinImpuestos,
      impuestosDetalle,
      montoImpuestos,
      subTotalConImpuestos,
      descuentoPromo,
      promoAplicada,
      promoValida,
      totalFinal,
      // nuevas props para Rangos:
      modoRangos: usarModoRangos,
      totalRangosConImpuestos: sumaRangosBruta,
      rangosResumen: rangosTarifarios.map((r) => ({
        id: r.id,
        fechaInicio: r.fechaInicio,
        fechaFin: r.fechaFin,
        precioPorNoche: Number(r.precioPorNoche || 0),
        noches: calcularNochesRango(r),
        subtotal: calcularSubtotalRango(r),
      })),
    } as any;
  }, [habitacionSeleccionada, noches, tarifasDisponiblesParaHab, codPromoInput, checkin, rangosTarifarios]);

  // ====== Paso 4: Origen + Crear ======
  const [origen, setOrigen] = useState<OrigenReserva>('WEB_OFICIAL');
  const [notasInternas, setNotasInternas] = useState('');
  const [observacionesHuesped, setObservacionesHuesped] = useState('');
  const [reservaCreada, setReservaCreada] = useState<Reserva | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [creandoReserva, setCreandoReserva] = useState(false);
  type SyncStatus = 'IDLE' | 'SAVING_CLOUD' | 'SYNCED' | 'PENDING';
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('IDLE');
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'warning' | 'danger' | 'primary'>('primary');

  // Evitar salir/cerrar pestaña si hay reservas pendientes de sincronizar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (ev: BeforeUnloadEvent): string | undefined => {
      const pendientes = pendingSync.countPendientes?.() || 0;
      if (syncStatus === 'SAVING_CLOUD' || pendientes > 0) {
        const m = pendientes > 0
          ? `Hay ${pendientes} cambios SIN SINCRONIZAR con la nube. Si cierras ahora, se reintentará en la próxima apertura. ¿Continuar?`
          : 'Se está guardando la reserva en la nube en este momento. Si cierras ahora podría no guardarse. ¿Continuar?';
        try { (ev as any).returnValue = m; } catch (_) {}
        return m;
      }
      return undefined;
    };
    window.addEventListener('beforeunload', handler);
    return () => { window.removeEventListener('beforeunload', handler); };
  }, [syncStatus]);

  // ===== Acciones Paso 1 =====
  const doBuscarPorDoc = () => {
    setErrorMsg(null);
    if (!buscarDoc.trim()) {
      setBusquedas([]);
      setHuespedEncontrado(null);
      return;
    }
    const r = HuespedService.buscarPorDocumento(buscarTipoDoc, buscarDoc.trim());
    setHuespedEncontrado(r || null);
    setBusquedas(r ? [r] : []);
  };
  const doBuscarPorTexto = () => {
    setErrorMsg(null);
    if (!buscarTexto.trim()) {
      setBusquedas([]);
      return;
    }
    setBusquedas(HuespedService.buscarPorTexto(buscarTexto.trim()).slice(0, 10));
  };
  const elegirHuespedExistente = (h: Huesped) => {
    setHuespedFinal(h);
    setHuespedEncontrado(h);
  };
  const crearNuevoHuesped = () => {
    setErrorMsg(null);
    if (!nuevoHuesped.numeroDocumento || !nuevoHuesped.nombres || !nuevoHuesped.apellidos || !nuevoHuesped.telefonoCelular) {
      setErrorMsg('Por favor completa los campos obligatorios (*) del nuevo huésped.');
      return;
    }
    try {
      const h = HuespedService.crear({
        ...nuevoHuesped,
        tipoDocumento: (nuevoHuesped.tipoDocumento as TipoDocumento) || 'DNI',
        numeroDocumento: nuevoHuesped.numeroDocumento!,
        nombres: nuevoHuesped.nombres!,
        apellidos: nuevoHuesped.apellidos!,
        telefonoCelular: nuevoHuesped.telefonoCelular!,
        email: nuevoHuesped.email || '',
        nacionalidad: nuevoHuesped.nacionalidad || 'PERU',
        direccion: nuevoHuesped.direccion || '',
        fechaNacimiento: null as any,
        sexo: 'NO_INFORMA',
        telefonoFijo: '',
        codigoPostal: '',
        estadoProcedencia: '',
        ciudadProcedencia: '',
        emergenciaNombre: '',
        emergenciaParentesco: '',
        emergenciaTelefono: '',
        preferenciasAlimentarias: 'NINGUNA',
        preferenciasAlergiasIds: [],
        frecuenciaVisita: 'PRIMERA_VEZ',
        programaFidelidad: {
          nivelActual: 'NUEVO',
          puntosAcumulados: 0,
          totalVisitas: 0,
          totalNoches: 0,
          totalGastoHistorico: 0,
          fechaUltimaEstadia: seedUtil.nowISO(),
          fechaProximaCumpleNiveles: null as any,
          createdBy: 'USR-MOISES-0001',
          updatedBy: 'USR-MOISES-0001',
          createdAt: seedUtil.nowISO(),
          updatedAt: seedUtil.nowISO(),
        } as any,
        observacionesInternas: '',
        tags: [],
        fotoDocumentoIdentidadUrl: '',
        fotoSelfieClienteUrl: '',
        estado: 'ACTIVO',
        createdBy: 'USR-MOISES-0001',
        updatedBy: 'USR-MOISES-0001',
        createdAt: seedUtil.nowISO(),
        updatedAt: seedUtil.nowISO(),
      } as any);
      setHuespedFinal(h);
    } catch (e: any) {
      setErrorMsg(e.message || 'No se pudo crear el huésped. ¿Documento repetido?');
    }
  };

  // ===== Acciones Paso 2 =====
  const seleccionarHabitacion = (h: Habitacion) => {
    setHabitacionSeleccionada(h);
    const capHab = Number((h as any).capacidadMaximaPax ?? (h as any).capacidadPersonas ?? 0);
    const tipo = HabitacionService.listarTipos().find((t) => t.id === h.tipoHabitacionId);
    const capTipo = tipo ? (Number(tipo.capacidadAdultos || 0) + Number(tipo.capacidadNinos || 0)) : 0;
    const capMax = capHab || capTipo || 2;
    if (capMax && (adultos + ninos) !== capMax) {
      const ninosMantener = Math.min(ninos, capMax);
      const adultosPorDefecto = Math.max(1, capMax - ninosMantener);
      setNinos(ninosMantener);
      setAdultos(adultosPorDefecto);
    }
  };

  const buscarHabitaciones = () => {
    setErrorMsg(null);
    if (noches < 1) {
      setErrorMsg('Check-out debe ser después de check-in.');
      setHabitacionesDisponibles([]);
      return;
    }
    if (adultos + ninos < 1) {
      setErrorMsg('Debe haber al menos 1 persona.');
      setHabitacionesDisponibles([]);
      return;
    }
    const list = HabitacionService.listarTodas({
      disponiblesParaFechas: { checkinISO: `${checkin}T15:00:00.000Z`, checkoutISO: `${checkout}T11:00:00.000Z` },
      capacidadMinimaPax: adultos + ninos,
    });
    setHabitacionesDisponibles(list);
    const seleccionada = list.find((x) => x.id === habitacionSeleccionada?.id) || list[0] || null;
    if (seleccionada && seleccionada.id !== habitacionSeleccionada?.id) {
      seleccionarHabitacion(seleccionada);
    } else {
      setHabitacionSeleccionada(seleccionada);
    }
  };

  // ===== Paso 4: Crear =====
  const doCrearReserva = async () => {
    setErrorMsg(null);
    if (creandoReserva) { return; }
    if (!!reservaCreada) { return; }
    if (!huespedFinal) { setErrorMsg('Paso 1: Selecciona o crea un huésped.'); return; }
    if (!habitacionSeleccionada || noches < 1) { setErrorMsg('Paso 2: Selecciona fechas válidas y una habitación.'); return; }
    if (!resumenTarifa) { setErrorMsg('Paso 3: Calcula tarifa antes de confirmar.'); return; }

    // ===== RC3 (b) SEGUNDA VALIDACIÓN OVERLAP INMEDIATAMENTE ANTES DE GUARDAR =====
    try {
      const checkinISO = `${checkin}T15:00:00.000Z`;
      const checkoutISO = `${checkout}T11:00:00.000Z`;
      const conflictosLive = ReservaService.listarPorHabitacionYFechas({
        habitacionId: habitacionSeleccionada.id,
        checkinISO,
        checkoutISO,
      });
      if (conflictosLive && conflictosLive.length > 0) {
        const cods = conflictosLive.map((c: any) => `· ${String(c.codigoReserva||'R-????')} [${String(c.estado||'PEND')}]`).join('\n');
        const bloqueoMsg = `⛔ CONFLICTO INMEDIATO — Suite OCUPADA por otra terminal\n\nLa Suite ${habitacionSeleccionada.codigo || habitacionSeleccionada.nombre} YA FUE RESERVADA hace segundos por otra persona/dispositivo. NO SE PUEDE guardar esta reserva.\n\nReservas en conflicto en esas fechas:\n${cods}\n\nSolución: Elige otra habitación o cambia las fechas.`;
        try { window.confirm(bloqueoMsg); } catch(_){}
        setErrorMsg(bloqueoMsg.replace(/\n/g, ' · ').slice(0, 220));
        setToastColor('danger');
        setToastMsg(`⛔ Habitación ocupada: reserva duplicada bloqueada.`);
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), 4500);
        return;
      }
    } catch (_) {}

    setSyncStatus('SAVING_CLOUD');
    setSyncErrorMsg(null);
    setCreandoReserva(true);
    const tipoHabitacion = HabitacionService.listarTipos().find((t) => t.id === habitacionSeleccionada.tipoHabitacionId)!;
    try {
      const payloadCreacion = {
        codigoReserva: '',
        huespedId: huespedFinal.id,
        huesped: huespedFinal,
        origen,
        codigoOtaConirmacion: origen === 'BOOKING' ? 'OTA-' + Math.floor(Math.random() * 900000 + 100000) : '',
        fechaSolicitud: seedUtil.nowISO(),
        fechaCheckin: `${checkin}T15:00:00.000Z`,
        fechaCheckout: `${checkout}T11:00:00.000Z`,
        totalNoches: noches,
        totalPersonas: adultos + ninos,
        cantidadAdultos: adultos,
        cantidadNinos: ninos,
        habitaciones: [{
          id: seedUtil.generateUUID(),
          reservaId: '',
          habitacionId: habitacionSeleccionada.id,
          habitacion: habitacionSeleccionada,
          tipoHabitacionId: tipoHabitacion.id,
          tipoHabitacionNombre: tipoHabitacion.nombre,
          fechaCheckin: `${checkin}T15:00:00.000Z`,
          fechaCheckout: `${checkout}T11:00:00.000Z`,
          totalNoches: noches,
          precioBaseAcordadoPorNoche: Number(resumenTarifa.precioNoche), // precio promedio ponderado (backward compat)
          tarifaAplicadaId: resumenTarifa.tarifaId || null as any,
          promocionAplicadaId: resumenTarifa.promoAplicada?.id || null as any,
          precioTotalAlojamiento: Number(resumenTarifa.totalFinal),
          observaciones: observacionesHuesped,
          createdBy: 'USR-MOISES-0001',
          updatedBy: 'USR-MOISES-0001',
          createdAt: seedUtil.nowISO(),
          updatedAt: seedUtil.nowISO(),
        } as any],
        tarifasAplicadas: [
          // backward compat: 1 tarifa "resumen"
          {
            id: resumenTarifa.tarifaId || seedUtil.generateUUID(),
            reservaId: '',
            tarifaId: resumenTarifa.tarifaId || 'TARIFA-GENERAL',
            nombreTarifa: resumenTarifa.tarifaNombre || 'Tarifa General',
            tipoHabitacionId: tipoHabitacion.id,
            temporadaId: null as any,
            factorVigenteId: '',
            fechaInicio: `${checkin}T15:00:00.000Z`,
            fechaFin: `${checkout}T11:00:00.000Z`,
            precioBaseNocheInicial: Number(resumenTarifa.precioNoche),
            createdAt: seedUtil.nowISO(),
            updatedAt: seedUtil.nowISO(),
            createdBy: 'USR-MOISES-0001',
            updatedBy: 'USR-MOISES-0001',
          } as any,
          // RANGOS INDIVIDUALES: 1 entrada por bloque (para que detalle reserva los pueda listar)
          ...(resumenTarifa.rangosResumen || []).map((rg: any) => ({
            id: seedUtil.generateUUID(),
            reservaId: '',
            tarifaId: `RANGO-${rg.id}`,
            nombreTarifa: `Rango ${rg.fechaInicio} → ${rg.fechaFin} · ${rg.noches} noche(s) × S/${Number(rg.precioPorNoche || 0).toFixed(2)}`,
            tipoHabitacionId: tipoHabitacion.id,
            temporadaId: null as any,
            factorVigenteId: '',
            fechaInicio: `${rg.fechaInicio}T15:00:00.000Z`,
            fechaFin: `${rg.fechaFin}T11:00:00.000Z`,
            precioBaseNocheInicial: Number(rg.precioPorNoche || 0),
            nochesAplicables: Number(rg.noches || 0),
            subtotalAplicable: Number(rg.subtotal || 0),
            createdAt: seedUtil.nowISO(),
            updatedAt: seedUtil.nowISO(),
            createdBy: 'USR-MOISES-0001',
            updatedBy: 'USR-MOISES-0001',
          } as any)),
        ],
        promocionesAplicadas: resumenTarifa.promoAplicada ? [{
          id: resumenTarifa.promoAplicada.id,
          reservaId: '',
          codigoPromocionalId: resumenTarifa.promoAplicada.id,
          codigoPromocional: resumenTarifa.promoAplicada.codigo,
          descuentoMonto: Number(resumenTarifa.descuentoPromo || 0),
          descuentoPorcentaje: resumenTarifa.promoAplicada.tipoDescuento === 'PORCENTAJE' ? Number(resumenTarifa.promoAplicada.valorDescuento || 0) : null as any,
          fechaAplicacion: seedUtil.nowISO(),
          usuarioAplicoId: 'USR-MOISES-0001',
          createdAt: seedUtil.nowISO(),
          updatedAt: seedUtil.nowISO(),
          createdBy: 'USR-MOISES-0001',
          updatedBy: 'USR-MOISES-0001',
        }] : [],
        subTotalAlojamientoSinImpuestos: Number(resumenTarifa.subTotalSinImpuestos),
        totalImpuestos: Number(resumenTarifa.montoImpuestos),
        totalDescuentos: Number(resumenTarifa.descuentoPromo),
        montoTotalReserva: Number(resumenTarifa.totalFinal),
        moneda: 'PEN',
        estado: origen === 'BOOKING' || origen === 'AGENCIA_VIAJES' ? 'CONFIRMADA' : 'PENDIENTE',
        historialCambios: [],
        pagoGarantia: {
          id: seedUtil.generateUUID(),
          reservaId: '',
          tipoGarantia: (origen === 'BOOKING' || origen === 'AGENCIA_VIAJES') ? 'PREPAGO_ANTICIPADO' : 'PENDIENTE_CONFIRMACION',
          moneda: 'PEN',
          montoPorcentaje: origen === 'BOOKING' ? 100 : 30,
          montoPagadoAnticipado: 0,
          estado: origen === 'BOOKING' ? 'PAGADO' : 'PENDIENTE',
          comprobanteId: null as any,
          fechaVencimiento: hoyMas(2),
          metodoPagoId: '',
          observaciones: `Garantía vía ${origen}.`,
          createdAt: seedUtil.nowISO(),
          updatedAt: seedUtil.nowISO(),
          createdBy: 'USR-MOISES-0001',
          updatedBy: 'USR-MOISES-0001',
        } as any,
        politicaCancelacionId: 'POL-GENERAL',
        notasInternas: notasInternas,
        observacionesHuesped,
        servicioAdicionalSolicitadoIds: [],
        checkInInfo: null,
        checkOutInfo: null,
        saldoPendiente: Number(resumenTarifa.totalFinal),
        estadoPago: origen === 'BOOKING' ? 'PAGADO_ANTICIPADO_TOTAL' : 'PAGO_PENDIENTE',
        fechaCreacion: seedUtil.nowISO(),
        fechaModificacion: seedUtil.nowISO(),
        usuarioResponsableCreacionId: 'USR-MOISES-0001',
        comprobanteGeneradoId: null as any,
        checkInOutRegistroFisico: false,
        comprobanteDetalle: null as any,
        createdBy: 'USR-MOISES-0001',
        updatedBy: 'USR-MOISES-0001',
        createdAt: seedUtil.nowISO(),
        updatedAt: seedUtil.nowISO(),
        usuarioResponsableId: 'USR-MOISES-0001',
      } as any;

      // ReservaService.crear() REMOTO PRIMERO (await, timeout 4s) → retorna syncStatus _syncStatus: 'SYNCED' | 'PENDING'
      const nuevaResult: any = await ReservaService.crear(payloadCreacion);
      const finalSync: 'SYNCED' | 'PENDING' = (nuevaResult?._syncStatus === 'SYNCED' ? 'SYNCED' : 'PENDING');
      setSyncStatus(finalSync);
      if (nuevaResult?._syncErrorMsg && finalSync === 'PENDING') setSyncErrorMsg(nuevaResult._syncErrorMsg);
      setReservaCreada(nuevaResult);
      setToastColor(finalSync === 'SYNCED' ? 'success' : 'warning');
      setToastMsg(
        finalSync === 'SYNCED'
          ? `✅ Reserva ${nuevaResult?.codigoReserva || ''} creada y sincronizada correctamente.`
          : `⚠️ Reserva creada LOCALMENTE. Se reintentará sincronizar cada 30s (error: ${nuevaResult?._syncErrorMsg || 'sin conexión'}).`
      );
      setToastVisible(true);
      setTimeout(() => setCreandoReserva(false), 2000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al crear la reserva.');
      setSyncStatus('IDLE');
      setToastColor('danger');
      setToastMsg(`❌ Error al crear la reserva: ${e?.message || 'Error desconocido'}`);
      setToastVisible(true);
      setCreandoReserva(false);
    }
  };

  useIonViewWillEnter(() => {
    setBuscarTipoDoc('DNI');
    setBuscarDoc('');
    setBuscarTexto('');
    setHuespedEncontrado(null);
    setBusquedas([]);
    setNuevoHuesped({
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      nombres: '',
      apellidos: '',
      nacionalidad: 'PERU',
      telefonoCelular: '',
      email: '',
      direccion: '',
    });
    setHuespedFinal(null);
    setCheckin(hoyMas(1));
    setCheckout(hoyMas(4));
    setAdultos(2);
    setNinos(0);
    setHabitacionesDisponibles([]);
    setHabitacionSeleccionada(null);
    setCodPromoInput('');
    setPromoValidacionMsg(null);
    setOrigen('WEB_OFICIAL');
    setNotasInternas('');
    setObservacionesHuesped('');
    setReservaCreada(null);
    setErrorMsg(null);
    setCreandoReserva(false);
    setPaso(1);
  });

  const limpiarYCargarNuevoFormulario = () => {
    setBuscarTipoDoc('DNI');
    setBuscarDoc('');
    setBuscarTexto('');
    setHuespedEncontrado(null);
    setBusquedas([]);
    setNuevoHuesped({
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      nombres: '',
      apellidos: '',
      nacionalidad: 'PERU',
      telefonoCelular: '',
      email: '',
      direccion: '',
    });
    setHuespedFinal(null);
    setCheckin(hoyMas(1));
    setCheckout(hoyMas(4));
    setAdultos(2);
    setNinos(0);
    setHabitacionesDisponibles([]);
    setHabitacionSeleccionada(null);
    setCodPromoInput('');
    setPromoValidacionMsg(null);
    setOrigen('WEB_OFICIAL');
    setNotasInternas('');
    setObservacionesHuesped('');
    setReservaCreada(null);
    setErrorMsg(null);
    setPaso(1);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/reservas" text="Volver" />
          </IonButtons>
          <IonTitle>
            <IonIcon icon={addCircleOutline} style={{ marginRight: 8 }} />
            Nueva Reserva
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {reservaCreada ? (
          <>
            <IonCard color="success" style={{ marginTop: 16 }}>
              <IonCardHeader>
                <IonCardTitle style={{ color: 'white' }}>
                  <IonIcon icon={checkmarkDone} style={{ marginRight: 8 }} />
                  Reserva {reservaCreada.codigoReserva} creada ✅
                </IonCardTitle>
                <IonCardSubtitle style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {reservaCreada.huesped?.nombreCompleto} · {reservaCreada.habitaciones[0]?.habitacion?.codigo} · {reservaCreada.totalNoches} noches
                </IonCardSubtitle>
              </IonCardHeader>
              <IonCardContent style={{ color: 'white' }}>
                <p><b>Total:</b> S/ {Number(reservaCreada.montoTotalReserva).toFixed(2)}</p>
                <p><b>Estado:</b> <IonBadge color="warning">{reservaCreada.estado}</IonBadge> &nbsp; <b>Origen:</b> <IonBadge>{reservaCreada.origen}</IonBadge></p>
                <p><b>Check-in:</b> {(reservaCreada.fechaCheckin ?? reservaCreada.fechaCheckIn ?? '').slice(0, 10)} &nbsp; <b>Check-out:</b> {(reservaCreada.fechaCheckout ?? reservaCreada.fechaCheckOut ?? '').slice(0, 10)}</p>
                <IonRow className="ion-justify-content-end">
                  <IonCol size="12" sizeMd="4">
                    <IonButton expand="block" fill="outline" color="light" onClick={limpiarYCargarNuevoFormulario}>
                      <IonIcon icon={addCircle} slot="start" />
                      Crear otra reserva
                    </IonButton>
                  </IonCol>
                  <IonCol size="12" sizeMd="4">
                    <IonButton expand="block" color="light" routerLink="/reservas">
                      <IonIcon icon={calendar} slot="start" />
                      Ver lista Reservas
                    </IonButton>
                  </IonCol>
                </IonRow>
              </IonCardContent>
            </IonCard>
          </>
        ) : (
          <>
            {errorMsg && (
              <IonAlert isOpen={!!errorMsg} header="Revisa el formulario" message={errorMsg} buttons={[{ text: 'OK', handler: () => setErrorMsg(null) }]} />
            )}

            <IonRow className="ion-align-items-center ion-justify-content-around ion-padding-vertical" style={{ gap: 6 }}>
              {PASOS.map((p, idx) => {
                const active = paso === p.id;
                const done = paso > p.id;
                return (
                  <IonCol key={p.id} size="12" sizeMd="3" style={{ paddingInline: 4 }}>
                    <IonButton
                      expand="block"
                      fill={active ? 'solid' : done ? 'outline' : 'clear'}
                      color={done ? 'success' : active ? 'primary' : 'medium'}
                      onClick={() => (p.id < paso ? setPaso(p.id as PasoId) : null)}
                      style={{ margin: 0 }}
                    >
                      <IonIcon icon={done ? checkmarkCircle : p.icono} slot="start" />
                      <span style={{ fontSize: idx > -1 ? 12 : 14 }}>{p.id}. {p.titulo}</span>
                    </IonButton>
                  </IonCol>
                );
              })}
            </IonRow>

            {paso === 1 && (
              <IonGrid>
                <IonRow>
                  <IonCol size="12" sizeMd="6">
                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>Buscar huésped existente</IonCardTitle>
                        <IonCardSubtitle>Por N° documento o texto (nombre/teléfono/email)</IonCardSubtitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <IonItem>
                          <IonLabel position="stacked">Tipo documento</IonLabel>
                          <IonSelect value={buscarTipoDoc} onIonChange={(e) => setBuscarTipoDoc(e.detail.value)}>
                            <IonSelectOption value="DNI">DNI (Perú)</IonSelectOption>
                            <IonSelectOption value="CE">CE - Carnet Extranjería</IonSelectOption>
                            <IonSelectOption value="PASAPORTE">Pasaporte</IonSelectOption>
                            <IonSelectOption value="RUC">RUC (Empresa)</IonSelectOption>
                          </IonSelect>
                        </IonItem>
                        <IonItem>
                          <IonLabel position="stacked">N° documento</IonLabel>
                          <IonInput value={buscarDoc} onIonInput={(e) => setBuscarDoc(e.detail.value!)} />
                        </IonItem>
                        <IonButton expand="block" onClick={doBuscarPorDoc} style={{ marginTop: 8 }}>
                          Buscar por documento
                        </IonButton>
                        <IonItem style={{ marginTop: 12 }}>
                          <IonLabel position="stacked">Buscar por texto</IonLabel>
                          <IonInput placeholder="Nombre, apellido, teléfono o email" value={buscarTexto} onIonInput={(e) => setBuscarTexto(e.detail.value!)} />
                        </IonItem>
                        <IonButton expand="block" fill="outline" onClick={doBuscarPorTexto} style={{ marginTop: 8 }}>
                          Buscar
                        </IonButton>
                        {busquedas.length > 0 && (
                          <IonList style={{ marginTop: 12 }}>
                            {busquedas.map((h) => (
                              <IonItem key={h.id} button onClick={() => elegirHuespedExistente(h)}>
                                <IonLabel>
                                  <h2>{h.nombres} {h.apellidos}</h2>
                                  <p>{h.tipoDocumento}: {h.numeroDocumento} · {h.telefonoCelular}</p>
                                  <p><IonChip color="tertiary" outline={huespedFinal?.id !== h.id}>{h.programaFidelidad?.nivelActual || 'NUEVO'}</IonChip> &nbsp;
                                    Visitas: {h.programaFidelidad?.totalVisitas || 0}</p>
                                </IonLabel>
                                {huespedFinal?.id === h.id && <IonIcon icon={checkmark} color="success" slot="end" />}
                              </IonItem>
                            ))}
                          </IonList>
                        )}
                      </IonCardContent>
                    </IonCard>
                  </IonCol>

                  <IonCol size="12" sizeMd="6">
                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>Crear nuevo huésped</IonCardTitle>
                        <IonCardSubtitle>Si no existe en la base de datos</IonCardSubtitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <IonGrid>
                          <IonRow>
                            <IonCol size="6"><IonItem><IonLabel position="stacked">Tipo</IonLabel>
                              <IonSelect value={nuevoHuesped.tipoDocumento} onIonChange={(e) => setNuevoHuesped({ ...nuevoHuesped, tipoDocumento: e.detail.value })}>
                                <IonSelectOption value="DNI">DNI</IonSelectOption>
                                <IonSelectOption value="CE">CE</IonSelectOption>
                                <IonSelectOption value="PASAPORTE">Pasaporte</IonSelectOption>
                                <IonSelectOption value="RUC">RUC</IonSelectOption>
                              </IonSelect>
                            </IonItem></IonCol>
                            <IonCol size="6"><IonItem><IonLabel position="stacked">N° doc *</IonLabel><IonInput value={nuevoHuesped.numeroDocumento} onIonInput={(e) => setNuevoHuesped({ ...nuevoHuesped, numeroDocumento: e.detail.value ?? undefined })} /></IonItem></IonCol>
                          </IonRow>
                          <IonRow>
                            <IonCol size="6"><IonItem><IonLabel position="stacked">Nombres *</IonLabel><IonInput value={nuevoHuesped.nombres} onIonInput={(e) => setNuevoHuesped({ ...nuevoHuesped, nombres: e.detail.value ?? undefined })} /></IonItem></IonCol>
                            <IonCol size="6"><IonItem><IonLabel position="stacked">Apellidos *</IonLabel><IonInput value={nuevoHuesped.apellidos} onIonInput={(e) => setNuevoHuesped({ ...nuevoHuesped, apellidos: e.detail.value ?? undefined })} /></IonItem></IonCol>
                          </IonRow>
                          <IonRow>
                            <IonCol size="12" sizeMd="6"><IonItem><IonLabel position="stacked">Teléfono *</IonLabel><IonInput type="tel" value={nuevoHuesped.telefonoCelular} onIonInput={(e) => setNuevoHuesped({ ...nuevoHuesped, telefonoCelular: e.detail.value ?? undefined })} /></IonItem></IonCol>
                            <IonCol size="12" sizeMd="6"><IonItem><IonLabel position="stacked">Email</IonLabel><IonInput type="email" value={nuevoHuesped.email} onIonInput={(e) => setNuevoHuesped({ ...nuevoHuesped, email: e.detail.value ?? undefined })} /></IonItem></IonCol>
                          </IonRow>
                          <IonRow>
                            <IonCol size="12" sizeMd="4"><IonItem><IonLabel position="stacked">Nacionalidad</IonLabel>
                              <IonSelect value={nuevoHuesped.nacionalidad || 'PERU'} onIonChange={(e) => setNuevoHuesped({ ...nuevoHuesped, nacionalidad: (e.detail.value ?? undefined) as any })}>
                                <IonSelectOption value="PERU">🇵🇪 Perú</IonSelectOption>
                                <IonSelectOption value="ARGENTINA">🇦🇷 Argentina</IonSelectOption>
                                <IonSelectOption value="CHILE">🇨🇱 Chile</IonSelectOption>
                                <IonSelectOption value="COLOMBIA">🇨🇴 Colombia</IonSelectOption>
                                <IonSelectOption value="MEXICO">🇲🇽 México</IonSelectOption>
                                <IonSelectOption value="EEUU">🇺🇸 USA</IonSelectOption>
                                <IonSelectOption value="ESPANA">🇪🇸 España</IonSelectOption>
                                <IonSelectOption value="OTRO">🌍 Otro</IonSelectOption>
                              </IonSelect>
                            </IonItem></IonCol>
                            <IonCol size="12" sizeMd="8"><IonItem><IonLabel position="stacked">Dirección</IonLabel><IonInput value={nuevoHuesped.direccion} onIonInput={(e) => setNuevoHuesped({ ...nuevoHuesped, direccion: e.detail.value ?? undefined })} /></IonItem></IonCol>
                          </IonRow>
                        </IonGrid>
                        <IonButton expand="block" color="secondary" onClick={crearNuevoHuesped} style={{ marginTop: 8 }}>
                          <IonIcon icon={checkmarkCircle} slot="start" />
                          Guardar y seleccionar este huésped
                        </IonButton>
                      </IonCardContent>
                    </IonCard>
                    {huespedFinal && (
                      <IonCard color="success" style={{ marginTop: 12 }}>
                        <IonCardContent style={{ color: 'white' }}>
                          <b>✅ Seleccionado:</b><br />
                          {huespedFinal.nombres} {huespedFinal.apellidos} · {huespedFinal.tipoDocumento} {huespedFinal.numeroDocumento}<br />
                          📞 {huespedFinal.telefonoCelular} &nbsp; ✉️ {huespedFinal.email || '(sin email)'}
                        </IonCardContent>
                      </IonCard>
                    )}
                  </IonCol>
                </IonRow>
              </IonGrid>
            )}

            {paso === 2 && (
              <IonGrid>
                <IonRow>
                  <IonCol size="12" sizeMd="6">
                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>Fechas de estadía</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <IonItem>
                          <IonIcon icon={calendar} slot="start" color="primary" />
                          <IonLabel position="stacked">Check-in (15:00 hrs)</IonLabel>
                          <IonDatetime value={checkin} onIonChange={(e) => { const v = (e.detail.value as string).slice(0, 10); setCheckin(v); if (new Date(v) >= new Date(checkout)) setCheckout(hoyMas(2)); }} style={{ maxWidth: '100%' }} />
                        </IonItem>
                        <IonItem>
                          <IonIcon icon={time} slot="start" color="primary" />
                          <IonLabel position="stacked">Check-out (11:00 hrs)</IonLabel>
                          <IonDatetime value={checkout} onIonChange={(e) => setCheckout((e.detail.value as string).slice(0, 10))} style={{ maxWidth: '100%' }} />
                        </IonItem>
                        <IonRow>
                          <IonCol size="6"><IonItem><IonLabel position="stacked">Adultos</IonLabel>
                            <IonSelect value={adultos} onIonChange={(e) => setAdultos(+e.detail.value)}>
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <IonSelectOption key={n} value={n}>{n}</IonSelectOption>)}
                            </IonSelect>
                          </IonItem></IonCol>
                          <IonCol size="6"><IonItem><IonLabel position="stacked">Niños</IonLabel>
                            <IonSelect value={ninos} onIonChange={(e) => setNinos(+e.detail.value)}>
                              {[0, 1, 2, 3, 4, 5, 6].map((n) => <IonSelectOption key={n} value={n}>{n}</IonSelectOption>)}
                            </IonSelect>
                          </IonItem></IonCol>
                        </IonRow>
                        <IonChip color="primary" outline={noches < 1} style={{ marginTop: 12 }}>
                          {noches} {noches === 1 ? 'noche' : 'noches'} · {adultos} adultos {ninos > 0 ? `+ ${ninos} niños` : ''}
                        </IonChip>
                        <IonButton expand="block" onClick={buscarHabitaciones} style={{ marginTop: 12 }}>
                          <IonIcon icon={checkmark} slot="start" />
                          Buscar habitaciones disponibles
                        </IonButton>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                  <IonCol size="12" sizeMd="6">
                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>Habitaciones disponibles</IonCardTitle>
                        <IonCardSubtitle>Selecciona una (gratis para reserva)</IonCardSubtitle>
                      </IonCardHeader>
                      <IonCardContent>
                        {habitacionesDisponibles.length === 0 ? (
                          <IonNote color="medium">
                            {noches < 1 || adultos < 1 ? 'Completa primero fechas y personas' : 'No hay habitaciones disponibles en ese rango para la cantidad de personas.'}
                          </IonNote>
                        ) : (
                          <IonList>
                            {habitacionesDisponibles.map((h) => (
                              <IonItem key={h.id} button onClick={() => seleccionarHabitacion(h)}>
                                <IonLabel>
                                  <h2>
                                    <IonBadge color={habitacionSeleccionada?.id === h.id ? 'success' : 'primary'}>{h.codigo}</IonBadge> &nbsp;
                                    {h.nombre || h.codigo}
                                  </h2>
                                  <p>
                                    Tipo: {h.tipoHabitacion?.nombre || h.tipoHabitacionId} &nbsp; · &nbsp;
                                    Pax: {h.capacidadMaximaPax || h.tipoHabitacion?.capacidadAdultos || '?'} max &nbsp; · &nbsp;
                                    Vista: {h.vistaEfectiva || h.vista || 'N/D'}
                                  </p>
                                  <p>Camas: {(h.camas ?? []).length
                                    ? (h.camas ?? []).map((c: any) => `${c.cantidad ?? 1}x ${c.tipoCama ?? c.tipo ?? 'cama'}`).join(' · ')
                                    : 'N/D'}
                                  </p>
                                </IonLabel>
                                {habitacionSeleccionada?.id === h.id && <IonIcon icon={checkmarkCircle} color="success" slot="end" />}
                              </IonItem>
                            ))}
                          </IonList>
                        )}
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>
              </IonGrid>
            )}

            {paso === 3 && (
              <IonGrid>
                <IonRow>
                  <IonCol size="12" sizeMd="6">
                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>
                          <IonIcon icon={addCircle} style={{ marginRight: 8 }} />
                          Tarifas por Rangos de Fechas
                        </IonCardTitle>
                        <IonCardSubtitle>
                          ✅ Rango general de cobro: <b>{checkin || '—'}</b> → <b>{checkout || '—'}</b> · <b>{noches} {noches === 1 ? 'noche' : 'noches'}</b> · Agrega bloques con el botón [+] para poner precio diferente por tramo.
                        </IonCardSubtitle>
                      </IonCardHeader>
                      <IonCardContent>
                        {!habitacionSeleccionada ? (
                          <IonNote color="medium">
                            ⚠️ Primero selecciona una habitación disponible (Paso 2) para activar el cálculo automático de rangos.
                          </IonNote>
                        ) : (
                          <>
                            {/* ===== LISTA DE BLOQUES ===== */}
                            <IonList lines="full" style={{ marginTop: 0 }}>
                              {rangosTarifarios.length === 0 && (
                                <IonItem color="warning">
                                  <IonLabel>
                                    ⚠️ No hay rangos agregados. Pulsa el botón <b>➕ AGREGAR RANGO</b> para crear el primer bloque.
                                  </IonLabel>
                                </IonItem>
                              )}
                              {rangosTarifarios.map((rg, idx) => {
                                const nochesRg = calcularNochesRango(rg);
                                const subRg = calcularSubtotalRango(rg);
                                // Validaciones individuales por bloque
                                const fueraDeRango =
                                  (rg.fechaInicio && new Date(rg.fechaInicio) < new Date(checkin)) ||
                                  (rg.fechaFin && new Date(rg.fechaFin) > new Date(checkout));
                                const inversionFechas =
                                  rg.fechaInicio && rg.fechaFin && new Date(rg.fechaInicio) >= new Date(rg.fechaFin);
                                const nochesBloqueCobertura = (() => {
                                  const nochesStr: string[] = [];
                                  if (!rg.fechaInicio || !rg.fechaFin) return nochesStr;
                                  const rIni = new Date(rg.fechaInicio);
                                  const rFin = new Date(rg.fechaFin);
                                  const gIni = new Date(checkin);
                                  const gFin = new Date(checkout);
                                  const i = rIni > gIni ? rIni : gIni;
                                  const f = rFin < gFin ? rFin : gFin;
                                  for (let d = new Date(i); d < f; d.setDate(d.getDate() + 1)) {
                                    nochesStr.push(d.toISOString().slice(0, 10));
                                  }
                                  return nochesStr;
                                })();
                                const nochesSolapadas = nochesBloqueCobertura.filter(
                                  (n) => (validacionRangosCompleta.coberturaMap[n] || 0) >= 2,
                                );
                                const nochesFaltantes = validacionRangosCompleta.faltantesNochesStr.slice(0, 10);
                                // ==== FIX VISUAL AMARILLO ====
                                // Solo pintar AMARILLO si hay errores de ESTRUCTURA (fuera de rango, inversion fechas, solapamiento, 0 noches).
                                // PRECIO VACÍO (precioPorNoche<=0) NO se marca AMARILLO mientras user edita. Solo se valida en el submit final.
                                const bloqueConError =
                                  fueraDeRango ||
                                  inversionFechas ||
                                  nochesSolapadas.length > 0 ||
                                  nochesRg <= 0;
                                return (
                                  <IonItem
                                    key={rg.id}
                                    lines="full"
                                    color={bloqueConError ? 'warning' : undefined}
                                    style={{
                                      borderTop: bloqueConError ? '2px solid #f59e0b' : '2px solid #10b981',
                                      borderRadius: 8,
                                      marginBottom: 10,
                                    }}
                                  >
                                    <IonGrid style={{ paddingInline: 0 }}>
                                      <IonRow className="ion-align-items-center">
                                        <IonCol size="12" sizeMd="1">
                                          <h3 style={{ margin: 0 }}>🧱 Bloque {idx + 1}</h3>
                                        </IonCol>
                                        <IonCol size="12" sizeMd="11" className="ion-text-right" style={{ paddingBottom: 6 }}>
                                          <IonButton
                                            fill="clear"
                                            color="danger"
                                            size="small"
                                            onClick={() => eliminarRangoPorId(rg.id)}
                                            disabled={rangosTarifarios.length <= 1}
                                          >
                                            <IonIcon icon={trash} slot="icon-only" />
                                            &nbsp; Eliminar
                                          </IonButton>
                                        </IonCol>
                                      </IonRow>
                                      <IonRow>
                                        <IonCol size="12" sizeMd="4">
                                          <IonItem style={{ marginBottom: 6 }}>
                                            <IonLabel position="stacked">📅 Día inicio</IonLabel>
                                            <IonDatetime
                                              value={rg.fechaInicio}
                                              onIonChange={(e) =>
                                                actualizarRangoPorId(rg.id, {
                                                  fechaInicio: (e.detail.value as string).slice(0, 10),
                                                })
                                              }
                                              style={{ maxWidth: '100%' }}
                                              min={checkin}
                                              max={checkout}
                                            />
                                          </IonItem>
                                        </IonCol>
                                        <IonCol size="12" sizeMd="4">
                                          <IonItem style={{ marginBottom: 6 }}>
                                            <IonLabel position="stacked">📅 Día fin</IonLabel>
                                            <IonDatetime
                                              value={rg.fechaFin}
                                              onIonChange={(e) =>
                                                actualizarRangoPorId(rg.id, {
                                                  fechaFin: (e.detail.value as string).slice(0, 10),
                                                })
                                              }
                                              style={{ maxWidth: '100%' }}
                                              min={checkin}
                                              max={checkout}
                                            />
                                          </IonItem>
                                        </IonCol>
                                        <IonCol size="12" sizeMd="4">
                                          <IonItem style={{ marginBottom: 6 }}>
                                            <IonLabel position="stacked">💰 Precio por noche S/</IonLabel>
                                            <IonInput
                                              type="number"
                                              min="0"
                                              step="0.5"
                                              value={String(Number(rg.precioPorNoche) || 0)}
                                              onIonChange={(e) =>
                                                actualizarRangoPorId(rg.id, {
                                                  precioPorNoche: Number(e.detail.value) || 0,
                                                })
                                              }
                                            />
                                          </IonItem>
                                        </IonCol>
                                      </IonRow>
                                      <IonRow className="ion-align-items-center">
                                        <IonCol size="12" sizeMd="7">
                                          {inversionFechas && (
                                            <IonNote color="danger" style={{ fontSize: 12 }}>
                                              ⛔ Fecha fin tiene que ser MAYOR que fecha inicio.
                                            </IonNote>
                                          )}
                                          {!inversionFechas && fueraDeRango && (
                                            <IonNote color="warning" style={{ fontSize: 12 }}>
                                              ⚠️ Rango fuera de {checkin}→{checkout}. Fechas se limitarán al rango general.
                                            </IonNote>
                                          )}
                                          {!inversionFechas && !fueraDeRango && nochesSolapadas.length > 0 && (
                                            <IonNote color="danger" style={{ fontSize: 12 }}>
                                              ⛔ Solapa con otros bloques: {nochesSolapadas.slice(0, 5).join(', ')}
                                              {nochesSolapadas.length > 5 ? '...' : ''}
                                            </IonNote>
                                          )}
                                        </IonCol>
                                        <IonCol size="12" sizeMd="5">
                                          <IonChip
                                            color={bloqueConError ? 'warning' : 'success'}
                                            outline={bloqueConError}
                                            style={{
                                              float: 'right',
                                              padding: '10px 16px',
                                              fontSize: 15,
                                              fontWeight: 700,
                                              minHeight: 40,
                                            }}
                                          >
                                            {nochesRg <= 0 ? '0 noches' : `${nochesRg} ${nochesRg === 1 ? 'noche' : 'noches'}`} ·{' '}
                                            Subtotal <b>S/ {Number(subRg).toFixed(2)}</b>
                                          </IonChip>
                                        </IonCol>
                                      </IonRow>
                                    </IonGrid>
                                  </IonItem>
                                );
                              })}
                            </IonList>

                            {/* ===== BOTÓN AGREGAR RANGO ===== */}
                            <IonButton
                              expand="block"
                              color="primary"
                              onClick={agregarNuevoRango}
                              style={{ marginTop: 10 }}
                            >
                              <IonIcon icon={addCircle} slot="start" />
                              ➕ AGREGAR OTRO RANGO DE FECHAS
                            </IonButton>

                            {/* ===== RESUMEN VALIDACIÓN GLOBAL ===== */}
                            <IonCard
                              color={validacionRangosCompleta.valido ? 'success' : 'danger'}
                              style={{ marginTop: 16, marginBottom: 0 }}
                            >
                              <IonCardContent style={{ color: 'white' }}>
                                {validacionRangosCompleta.valido ? (
                                  <>
                                    <IonIcon icon={checkmarkCircle} style={{ marginRight: 6 }} />
                                    ✅ CUBIERTO 100% — <b>{noches} {noches === 1 ? 'noche' : 'noches'}</b> sin solapamientos. Precio total por rangos:
                                    <b style={{ float: 'right' }}>S/ {Number(totalSumaRangos).toFixed(2)}</b>
                                  </>
                                ) : (
                                  <>
                                    <IonIcon icon={alertCircle} style={{ marginRight: 6 }} />
                                    ⛔ REVISA LOS RANGOS:
                                    {validacionRangosCompleta.faltantesNochesStr.length > 0 && (
                                      <div style={{ marginTop: 6 }}>
                                        • Falta asignar precio a{' '}
                                        <b>{validacionRangosCompleta.faltantesNochesStr.length}</b> noche(s):{' '}
                                        <code style={{ color: 'white' }}>
                                          {validacionRangosCompleta.faltantesNochesStr.join(', ')}
                                        </code>
                                        . Agrega otro rango ➕ o amplía un bloque.
                                      </div>
                                    )}
                                    {validacionRangosCompleta.solapadosNochesStr.length > 0 && (
                                      <div style={{ marginTop: 6 }}>
                                        • Noches con precio doble (solapadas):{' '}
                                        <code style={{ color: 'white' }}>
                                          {validacionRangosCompleta.solapadosNochesStr.join(', ')}
                                        </code>
                                        . Reduce el día fin de un bloque o elimina un rango.
                                      </div>
                                    )}
                                  </>
                                )}
                              </IonCardContent>
                            </IonCard>

                            {/* ===== CÓDIGO PROMOCIONAL ===== */}
                            <IonCard style={{ marginTop: 12 }}>
                              <IonCardHeader>
                                <IonCardTitle>Código promocional</IonCardTitle>
                                <IonCardSubtitle>
                                  (opcional) Prueba: <b>3NOCHES50OFF</b> o <b>10OFFWEB</b>
                                </IonCardSubtitle>
                              </IonCardHeader>
                              <IonCardContent>
                                <IonItem>
                                  <IonIcon icon={pricetags} slot="start" />
                                  <IonInput
                                    placeholder="Ej: 10OFFWEB"
                                    value={codPromoInput}
                                    onIonInput={(e) => setCodPromoInput(e.detail.value!.toUpperCase())}
                                  />
                                </IonItem>
                                {codPromoInput.trim() && (
                                  <IonCard
                                    color={resumenTarifa?.promoValida ? 'success' : 'danger'}
                                    style={{ marginTop: 12 }}
                                  >
                                    <IonCardContent style={{ color: 'white' }}>
                                      <IonIcon
                                        icon={resumenTarifa?.promoValida ? checkmarkCircle : alertCircle}
                                        style={{ marginRight: 8 }}
                                      />
                                      {resumenTarifa?.promoValida
                                        ? `✅ Promo "${resumenTarifa.promoAplicada?.codigo}" aplicada: -S/ ${Number(
                                            resumenTarifa.descuentoPromo || 0,
                                          ).toFixed(2)} ${
                                            resumenTarifa.promoAplicada?.tipoDescuento === 'PORCENTAJE'
                                              ? `(${resumenTarifa.promoAplicada?.valorDescuento}%)`
                                              : ''
                                          }`
                                        : `Código "${codPromoInput.trim()}" no válido. Revisa fechas, mínimo de noches o monto.`}
                                    </IonCardContent>
                                  </IonCard>
                                )}
                              </IonCardContent>
                            </IonCard>
                          </>
                        )}
                      </IonCardContent>
                    </IonCard>
                  </IonCol>

                  {/* ===== COLUMNA 2: RESUMEN ECONÓMICO (igual que antes pero ahora incluye BLOQUES detalle) ===== */}
                  <IonCol size="12" sizeMd="6">
                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>Resumen económico</IonCardTitle>
                        <IonCardSubtitle>
                          Habitación: {habitacionSeleccionada?.codigo || '(sin seleccionar)'} · {noches}{' '}
                          {noches === 1 ? 'noche' : 'noches'} · {adultos}A {ninos > 0 ? `${ninos}N` : ''}
                        </IonCardSubtitle>
                      </IonCardHeader>
                      <IonCardContent>
                        {!resumenTarifa ? (
                          <IonNote color="medium">
                            Selecciona una habitación en el Paso 2 para ver el cálculo.
                          </IonNote>
                        ) : (
                          <IonList lines="full">
                            {/* ===== DETALLE POR BLOQUES RANGOS ===== */}
                            {(resumenTarifa.rangosResumen || []).length > 0 && (
                              <>
                                <IonItem>
                                  <IonLabel style={{ fontWeight: 700 }}>
                                    🧱 Desglose por rangos ({resumenTarifa.rangosResumen.length})
                                  </IonLabel>
                                </IonItem>
                                {resumenTarifa.rangosResumen.map((rg: any) => (
                                  <IonItem key={rg.id}>
                                    <IonLabel>
                                      {rg.fechaInicio} → {rg.fechaFin} · <b>{rg.noches} noche(s)</b> · S/{' '}
                                      {Number(rg.precioPorNoche || 0).toFixed(2)}/noche
                                    </IonLabel>
                                    <IonLabel slot="end" style={{ textAlign: 'right' }}>
                                      = <b>S/ {Number(rg.subtotal || 0).toFixed(2)}</b>
                                    </IonLabel>
                                  </IonItem>
                                ))}
                                <IonItem color="light">
                                  <IonLabel>
                                    <b>Suma bloques (sin impuestos internos)</b>
                                  </IonLabel>
                                  <IonLabel slot="end">
                                    <b>S/ {Number(resumenTarifa.totalRangosConImpuestos || 0).toFixed(2)}</b>
                                  </IonLabel>
                                </IonItem>
                              </>
                            )}

                            <IonItem>
                              <IonLabel>Tarifa aplicada</IonLabel>
                              <IonLabel slot="end" style={{ textAlign: 'right' }}>
                                <IonBadge color={resumenTarifa.modoRangos ? 'success' : 'primary'}>
                                  {resumenTarifa.tarifaNombre?.slice(0, 22)}
                                </IonBadge>
                              </IonLabel>
                            </IonItem>
                            {resumenTarifa.modoRangos ? (
                              <IonItem>
                                <IonLabel>Precio promedio x noche</IonLabel>
                                <IonLabel slot="end">
                                  <b>S/ {Number(resumenTarifa.precioNoche).toFixed(2)}</b>
                                </IonLabel>
                              </IonItem>
                            ) : (
                              <IonItem>
                                <IonLabel>Precio / noche</IonLabel>
                                <IonLabel slot="end">
                                  <b>S/ {Number(resumenTarifa.precioNoche).toFixed(2)}</b>
                                </IonLabel>
                              </IonItem>
                            )}
                            <IonItem>
                              <IonLabel>
                                Subtotal alojamiento ({noches} noches, sin impuestos)
                              </IonLabel>
                              <IonLabel slot="end">S/ {Number(resumenTarifa.subTotalSinImpuestos).toFixed(2)}</IonLabel>
                            </IonItem>
                            {resumenTarifa.impuestosDetalle.map((d: any) => (
                              <IonItem key={d.impuesto?.id || Math.random()}>
                                <IonLabel>
                                  {d.impuesto?.nombre || 'Impuesto'} ({d.impuesto?.valor || 0}%)
                                </IonLabel>
                                <IonLabel slot="end">S/ {Number(d.monto || 0).toFixed(2)}</IonLabel>
                              </IonItem>
                            ))}
                            {Number(resumenTarifa.descuentoPromo) > 0 && (
                              <IonItem color="success">
                                <IonLabel>🎁 Descuento promoción</IonLabel>
                                <IonLabel slot="end" color="success">
                                  −S/ {Number(resumenTarifa.descuentoPromo).toFixed(2)}
                                </IonLabel>
                              </IonItem>
                            )}
                            <IonItem lines="none">
                              <IonLabel style={{ fontSize: 20 }}>
                                <b>TOTAL A PAGAR</b>
                              </IonLabel>
                              <IonLabel slot="end" color="primary" style={{ fontSize: 24 }}>
                                <b>S/ {Number(resumenTarifa.totalFinal).toFixed(2)}</b>
                              </IonLabel>
                            </IonItem>
                          </IonList>
                        )}
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>
              </IonGrid>
            )}

            {paso === 4 && (
              <IonGrid>
                <IonRow>
                  <IonCol size="12" sizeMd="6">
                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>Origen + notas</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <IonItem>
                          <IonLabel position="stacked">Origen de la reserva</IonLabel>
                          <IonSelect value={origen} onIonChange={(e) => setOrigen(e.detail.value)}>
                            {origenOpciones.map((o) => <IonSelectOption key={o.value} value={o.value}>{o.label}</IonSelectOption>)}
                          </IonSelect>
                        </IonItem>
                        <IonItem style={{ marginTop: 8 }}>
                          <IonLabel position="stacked">Notas internas (no verá el huésped)</IonLabel>
                          <IonTextarea rows={3} value={notasInternas} onIonInput={(e) => setNotasInternas(e.detail.value!)} placeholder="Ej: Cliente VIP, solicita habitación con terraza." />
                        </IonItem>
                        <IonItem style={{ marginTop: 8 }}>
                          <IonLabel position="stacked">Preferencias / observaciones huésped</IonLabel>
                          <IonTextarea rows={3} value={observacionesHuesped} onIonInput={(e) => setObservacionesHuesped(e.detail.value!)} placeholder="Ej: Cumpleaños 21 Sep, habitación arriba, cama king." />
                        </IonItem>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                  <IonCol size="12" sizeMd="6">
                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>Resumen de la reserva</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <IonList lines="full">
                          <IonItem><IonLabel>Huésped</IonLabel><IonLabel slot="end"><b>{huespedFinal ? `${huespedFinal.nombres} ${huespedFinal.apellidos}` : '—'}</b></IonLabel></IonItem>
                          <IonItem><IonLabel>Habitación</IonLabel><IonLabel slot="end">{habitacionSeleccionada?.codigo || '—'}</IonLabel></IonItem>
                          <IonItem><IonLabel>Check-in / Check-out</IonLabel><IonLabel slot="end">{checkin || '—'} → {checkout || '—'}</IonLabel></IonItem>
                          <IonItem><IonLabel>{noches} {noches === 1 ? 'noche' : 'noches'} · Pax</IonLabel><IonLabel slot="end">{adultos}A {ninos > 0 ? `${ninos}N` : ''}</IonLabel></IonItem>
                          <IonItem><IonLabel>Origen</IonLabel><IonLabel slot="end"><IonBadge>{origen}</IonBadge></IonLabel></IonItem>
                          <IonItem lines="none"><IonLabel style={{ fontSize: 20 }}><b>TOTAL</b></IonLabel><IonLabel slot="end" color="primary" style={{ fontSize: 22 }}><b>S/ {Number(resumenTarifa?.totalFinal || 0).toFixed(2)}</b></IonLabel></IonItem>
                        </IonList>
                        <IonButton
                          expand="block"
                          color={syncStatus === 'SYNCED' ? 'success' : syncStatus === 'PENDING' ? 'warning' : syncStatus === 'SAVING_CLOUD' ? 'primary' : 'primary'}
                          size="large"
                          onClick={doCrearReserva as any}
                          disabled={creandoReserva || !!reservaCreada}
                          style={{ marginTop: 12 }}
                        >
                          <IonIcon
                            slot="start"
                            icon={syncStatus === 'SYNCED' ? cloudDoneOutline : syncStatus === 'PENDING' ? cloudOfflineOutline : syncStatus === 'SAVING_CLOUD' ? cloudOutline : checkmarkDone}
                          />
                          {syncStatus === 'SAVING_CLOUD'
                            ? '💾 GUARDANDO EN NUBE...'
                            : (!!reservaCreada && syncStatus === 'SYNCED')
                            ? '✅ RESERVA CREADA Y SINCRONIZADA'
                            : (!!reservaCreada && syncStatus === 'PENDING')
                            ? '⚠️ CREADA (SINCRONIZACIÓN PENDIENTE)'
                            : 'CREAR RESERVA'}
                        </IonButton>
                        {(syncStatus === 'PENDING' || (reservaCreada && (reservaCreada as any)._syncStatus === 'PENDING')) && (
                          <IonChip color="warning" outline style={{ marginTop: 8 }}>
                            <IonIcon icon={cloudOfflineOutline} />
                            <IonLabel>
                              Pendiente sincronización (cada 30s) — {syncErrorMsg || (reservaCreada as any)?._syncErrorMsg || 'reintentando...'}
                            </IonLabel>
                          </IonChip>
                        )}
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>
              </IonGrid>
            )}

            <IonGrid style={{ marginTop: 24, marginBottom: 40 }}>
              <IonRow>
                <IonCol size="6" sizeMd="3">
                  <IonButton
                    expand="block"
                    disabled={paso === 1}
                    onClick={() => retrocederPaso((paso - 1) as PasoId)}
                    fill="outline"
                  >
                    <IonIcon icon={arrowBackOutline} slot="start" />
                    Anterior
                  </IonButton>
                </IonCol>
                <IonCol size="6" sizeMd="3" offsetMd="6">
                  <IonButton
                    expand="block"
                    disabled={paso === 4}
                    onClick={() => avanzarPaso((paso + 1) as PasoId)}
                  >
                    Siguiente
                    <IonIcon icon={arrowForwardOutline} slot="end" />
                  </IonButton>
                </IonCol>
              </IonRow>
            </IonGrid>
          </>
        )}
      </IonContent>
      <IonToast
        isOpen={toastVisible}
        message={toastMsg}
        color={toastColor}
        duration={4000}
        onDidDismiss={() => setToastVisible(false)}
      />
    </IonPage>
  );
};

export default NuevaReserva;
