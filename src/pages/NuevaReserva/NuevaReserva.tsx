import React, { useMemo, useState } from 'react';
import {
  IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle,
  IonCardTitle, IonCol, IonContent, IonDatetime, IonGrid, IonHeader, IonIcon, IonInput,
  IonItem, IonLabel, IonList, IonNote, IonPage, IonRow, IonSelect, IonSelectOption,
  IonTitle, IonToolbar, IonAlert, IonTextarea, IonChip, IonBadge,
} from '@ionic/react';
import { addCircleOutline, arrowForwardOutline, checkmark, closeOutline, bed, checkmarkDone, person, cash, ticket, calendar, time, documentText, pricetags, checkmarkCircle, alertCircle, arrowBackOutline } from 'ionicons/icons';

import {
  HuespedService,
  HabitacionService,
  ReservaService,
  TarifaService,
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
  const avanzarPaso = (sig: PasoId) => {
    if (paso === 1 && !huespedFinal) {
      setErrorMsg('Selecciona o crea un huésped antes de continuar.'); return;
    }
    if (paso === 2 && (!habitacionSeleccionada || noches < 1)) {
      setErrorMsg('Selecciona fechas y una habitación disponible.'); return;
    }
    if (paso === 3 && !resumenTarifa) {
      setErrorMsg('Calcula la tarifa antes de continuar.'); return;
    }
    setPaso(sig);
  };
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

  // ====== Paso 3: Tarifa + Promo (con lista seleccionable + override manual) ======
  const [codPromoInput, setCodPromoInput] = useState('');
  const [precioNocheManual, setPrecioNocheManual] = useState<string>('');
  const [tarifaSeleccionadaId, setTarifaSeleccionadaId] = useState<string | null>(null);
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
    let precioNoche: number;
    let tarifaNombre = '';
    let tarifaId: string | null = null;

    if (precioNocheManual.trim() && !isNaN(Number(precioNocheManual)) && Number(precioNocheManual) > 0) {
      precioNoche = Number(precioNocheManual);
      tarifaNombre = 'Precio manual (override)';
    } else {
      let tarifa: any = null;
      if (tarifaSeleccionadaId) {
        tarifa = tarifasDisponiblesParaHab.find((t: any) => t.id === tarifaSeleccionadaId) || null;
      }
      if (!tarifa && tarifasDisponiblesParaHab.length > 0) {
        tarifa = tarifasDisponiblesParaHab[tarifasDisponiblesParaHab.length - 1];
      }
      if (!tarifa) {
        const tipoHab = HabitacionService.listarTipos().find((t) => t.id === habitacionSeleccionada.tipoHabitacionId);
        precioNoche = Number(tipoHab?.precioBaseNoche) || 350;
        tarifaNombre = `Tarifa Base ${tipoHab?.nombre || 'Habitación'}`;
      } else {
        const factorPct = (TarifaService as any).TemporadaService?.calcularFactorPorcentaje?.(`${checkin}T15:00:00.000Z`) ?? 0;
        precioNoche = Number((Number(tarifa.precioPorNoche || 0) * (1 + factorPct / 100)).toFixed(2));
        tarifaNombre = tarifa.nombre;
        tarifaId = tarifa.id;
      }
    }

    const subTotalSinImpuestos = Number((precioNoche * noches).toFixed(2));
    const imps = (TarifaService as any).ImpuestoService?.listarTodos?.() ?? [];
    const impuestosDetalle = imps.map((i: any) => {
      const porc = i.tipo === 'PORCENTAJE' ? i.valor : 0;
      return {
        impuesto: i,
        monto: Number(((subTotalSinImpuestos * porc) / 100).toFixed(2)),
      };
    });
    const montoImpuestos = Number(impuestosDetalle.reduce((s: number, x: any) => s + Number(x.monto || 0), 0).toFixed(2));
    const subTotalConImpuestos = Number((subTotalSinImpuestos + montoImpuestos).toFixed(2));

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
    };
  }, [habitacionSeleccionada, noches, tarifasDisponiblesParaHab, tarifaSeleccionadaId, precioNocheManual, codPromoInput, checkin]);

  // ====== Paso 4: Origen + Crear ======
  const [origen, setOrigen] = useState<OrigenReserva>('WEB_OFICIAL');
  const [notasInternas, setNotasInternas] = useState('');
  const [observacionesHuesped, setObservacionesHuesped] = useState('');
  const [reservaCreada, setReservaCreada] = useState<Reserva | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    setHabitacionSeleccionada(seleccionada);
    setTarifaSeleccionadaId(null);
    setPrecioNocheManual('');
  };

  // ===== Paso 4: Crear =====
  const doCrearReserva = () => {
    setErrorMsg(null);
    if (!huespedFinal) { setErrorMsg('Paso 1: Selecciona o crea un huésped.'); return; }
    if (!habitacionSeleccionada || noches < 1) { setErrorMsg('Paso 2: Selecciona fechas válidas y una habitación.'); return; }
    if (!resumenTarifa) { setErrorMsg('Paso 3: Calcula tarifa antes de confirmar.'); return; }
    const tipoHabitacion = HabitacionService.listarTipos().find((t) => t.id === habitacionSeleccionada.tipoHabitacionId)!;
    try {
      const nueva = ReservaService.crear({
        codigoReserva: '',
        huespedId: huespedFinal.id,
        huesped: huespedFinal,
        origen,
        canalReservaId: null as any,
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
          precioBaseAcordadoPorNoche: Number(resumenTarifa.precioNoche),
          tarifaAplicadaId: resumenTarifa.tarifaId || null as any,
          promocionAplicadaId: resumenTarifa.promoAplicada?.id || null as any,
          precioTotalAlojamiento: Number(resumenTarifa.totalFinal),
          observaciones: observacionesHuesped,
          createdBy: 'USR-MOISES-0001',
          updatedBy: 'USR-MOISES-0001',
          createdAt: seedUtil.nowISO(),
          updatedAt: seedUtil.nowISO(),
        } as any],
        tarifasAplicadas: [{
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
        } as any],
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
      } as any);
      setReservaCreada(nueva);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al crear la reserva.');
    }
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
                <p><b>Check-in:</b> {reservaCreada.fechaCheckin.slice(0, 10)} &nbsp; <b>Check-out:</b> {reservaCreada.fechaCheckout.slice(0, 10)}</p>
                <IonRow className="ion-justify-content-end">
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
                            <IonCol size="6"><IonItem><IonLabel position="stacked">N° doc *</IonLabel><IonInput value={nuevoHuesped.numeroDocumento} onIonInput={(e) => setNuevoHuesped({ ...nuevoHuesped, numeroDocumento: e.detail.value })} /></IonItem></IonCol>
                          </IonRow>
                          <IonRow>
                            <IonCol size="6"><IonItem><IonLabel position="stacked">Nombres *</IonLabel><IonInput value={nuevoHuesped.nombres} onIonInput={(e) => setNuevoHuesped({ ...nuevoHuesped, nombres: e.detail.value })} /></IonItem></IonCol>
                            <IonCol size="6"><IonItem><IonLabel position="stacked">Apellidos *</IonLabel><IonInput value={nuevoHuesped.apellidos} onIonInput={(e) => setNuevoHuesped({ ...nuevoHuesped, apellidos: e.detail.value })} /></IonItem></IonCol>
                          </IonRow>
                          <IonRow>
                            <IonCol size="12" sizeMd="6"><IonItem><IonLabel position="stacked">Teléfono *</IonLabel><IonInput type="tel" value={nuevoHuesped.telefonoCelular} onIonInput={(e) => setNuevoHuesped({ ...nuevoHuesped, telefonoCelular: e.detail.value })} /></IonItem></IonCol>
                            <IonCol size="12" sizeMd="6"><IonItem><IonLabel position="stacked">Email</IonLabel><IonInput type="email" value={nuevoHuesped.email} onIonInput={(e) => setNuevoHuesped({ ...nuevoHuesped, email: e.detail.value })} /></IonItem></IonCol>
                          </IonRow>
                          <IonRow>
                            <IonCol size="12" sizeMd="4"><IonItem><IonLabel position="stacked">Nacionalidad</IonLabel>
                              <IonSelect value={nuevoHuesped.nacionalidad || 'PERU'} onIonChange={(e) => setNuevoHuesped({ ...nuevoHuesped, nacionalidad: e.detail.value })}>
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
                            <IonCol size="12" sizeMd="8"><IonItem><IonLabel position="stacked">Dirección</IonLabel><IonInput value={nuevoHuesped.direccion} onIonInput={(e) => setNuevoHuesped({ ...nuevoHuesped, direccion: e.detail.value })} /></IonItem></IonCol>
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
                          <IonDatetime value={checkin} onIonChange={(e) => { const v = (e.detail.value as string).slice(0, 10); setCheckin(v); if (new Date(v) >= new Date(checkout)) setCheckout(hoyMas(2)); }} displayFormat="YYYY-MM-DD" style={{ maxWidth: '100%' }} />
                        </IonItem>
                        <IonItem>
                          <IonIcon icon={time} slot="start" color="primary" />
                          <IonLabel position="stacked">Check-out (11:00 hrs)</IonLabel>
                          <IonDatetime value={checkout} onIonChange={(e) => setCheckout((e.detail.value as string).slice(0, 10))} displayFormat="YYYY-MM-DD" style={{ maxWidth: '100%' }} />
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
                              <IonItem key={h.id} button onClick={() => setHabitacionSeleccionada(h)}>
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
                        <IonCardTitle>Tarifas disponibles</IonCardTitle>
                        <IonCardSubtitle>Selecciona una tarifa predefinida o usa precio manual</IonCardSubtitle>
                      </IonCardHeader>
                      <IonCardContent>
                        {tarifasDisponiblesParaHab.length === 0 ? (
                          <IonNote color="medium">Selecciona primero una habitación (Paso 2).</IonNote>
                        ) : (
                          <IonList lines="full">
                            {tarifasDisponiblesParaHab.map((t: any, idx: number) => {
                              const precio = Number(t.precioPorNoche || 0);
                              const sel = tarifaSeleccionadaId
                                ? t.id === tarifaSeleccionadaId
                                : idx === tarifasDisponiblesParaHab.length - 1;
                              const manualActivo = precioNocheManual.trim() !== '';
                              return (
                                <IonItem
                                  key={t.id}
                                  button={!manualActivo}
                                  onClick={() => { if (!manualActivo) { setTarifaSeleccionadaId(t.id); setPrecioNocheManual(''); } }}
                                  color={sel && !manualActivo ? 'primary' : undefined}
                                  style={sel && !manualActivo ? { backgroundColor: '#e8f5e9' } : undefined}
                                >
                                  <IonLabel>
                                    <h2>
                                      <IonBadge color={sel && !manualActivo ? 'success' : 'medium'}>
                                        {sel && !manualActivo ? '✓ ' : ''}{t.nombre || `Tarifa ${idx + 1}`}
                                      </IonBadge>
                                    </h2>
                                    <p>{t.descripcion || `Tarifa tipo: ${t.tipoHabitacionId || 'general'}`}</p>
                                  </IonLabel>
                                  <IonLabel slot="end" style={{ textAlign: 'right' }}>
                                    <b style={{ fontSize: 18 }}>S/ {precio.toFixed(2)}</b>
                                    <p style={{ fontSize: 12 }}>/ noche</p>
                                  </IonLabel>
                                </IonItem>
                              );
                            })}
                            <IonItem style={{ marginTop: 12 }}>
                              <IonLabel position="stacked">
                                ✏️ Precio manual (sobrescribe tarifa seleccionada)
                              </IonLabel>
                              <IonInput
                                type="number"
                                placeholder="Ej: 420.00"
                                value={precioNocheManual}
                                onIonInput={(e) => setPrecioNocheManual(e.detail.value || '')}
                              />
                            </IonItem>
                            <IonNote color="medium" style={{ display: 'block', marginTop: 8 }}>
                              💡 Para desactivar modo manual, borra el número del campo.
                            </IonNote>
                          </IonList>
                        )}
                      </IonCardContent>
                    </IonCard>

                    <IonCard style={{ marginTop: 12 }}>
                      <IonCardHeader>
                        <IonCardTitle>Código promocional</IonCardTitle>
                        <IonCardSubtitle>(opcional) Prueba: <b>3NOCHES50OFF</b> o <b>10OFFWEB</b></IonCardSubtitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <IonItem>
                          <IonIcon icon={pricetags} slot="start" />
                          <IonInput placeholder="Ej: 10OFFWEB" value={codPromoInput} onIonInput={(e) => setCodPromoInput(e.detail.value!.toUpperCase())} />
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
                                ? `✅ Promo "${resumenTarifa.promoAplicada?.codigo}" aplicada: -S/ ${Number(resumenTarifa.descuentoPromo || 0).toFixed(2)} ${
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
                  </IonCol>
                  <IonCol size="12" sizeMd="6">
                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>Resumen económico</IonCardTitle>
                        <IonCardSubtitle>
                          Habitación: {habitacionSeleccionada?.codigo || '(sin seleccionar)'} · {noches} {noches === 1 ? 'noche' : 'noches'} · {adultos}A {ninos > 0 ? `${ninos}N` : ''}
                        </IonCardSubtitle>
                      </IonCardHeader>
                      <IonCardContent>
                        {!resumenTarifa ? (
                          <IonNote color="medium">Selecciona una habitación en el Paso 2 para ver el cálculo.</IonNote>
                        ) : (
                          <IonList lines="full">
                            <IonItem>
                              <IonLabel>Tarifa aplicada</IonLabel>
                              <IonLabel slot="end" style={{ textAlign: 'right' }}>
                                <IonBadge color={precioNocheManual.trim() ? 'warning' : 'primary'}>
                                  {precioNocheManual.trim() ? 'MANUAL' : resumenTarifa.tarifaNombre?.slice(0, 20)}
                                </IonBadge>
                              </IonLabel>
                            </IonItem>
                            <IonItem>
                              <IonLabel>Precio / noche</IonLabel>
                              <IonLabel slot="end"><b>S/ {Number(resumenTarifa.precioNoche).toFixed(2)}</b></IonLabel>
                            </IonItem>
                            <IonItem>
                              <IonLabel>Subtotal alojamiento ({noches} noches, sin impuestos)</IonLabel>
                              <IonLabel slot="end">S/ {Number(resumenTarifa.subTotalSinImpuestos).toFixed(2)}</IonLabel>
                            </IonItem>
                            {resumenTarifa.impuestosDetalle.map((d: any) => (
                              <IonItem key={d.impuesto?.id || Math.random()}>
                                <IonLabel>{d.impuesto?.nombre || 'Impuesto'} ({d.impuesto?.valor || 0}%)</IonLabel>
                                <IonLabel slot="end">S/ {Number(d.monto || 0).toFixed(2)}</IonLabel>
                              </IonItem>
                            ))}
                            {Number(resumenTarifa.descuentoPromo) > 0 && (
                              <IonItem color="success">
                                <IonLabel>🎁 Descuento promoción</IonLabel>
                                <IonLabel slot="end" color="success">−S/ {Number(resumenTarifa.descuentoPromo).toFixed(2)}</IonLabel>
                              </IonItem>
                            )}
                            <IonItem lines="none">
                              <IonLabel style={{ fontSize: 20 }}><b>TOTAL A PAGAR</b></IonLabel>
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
                        <IonButton expand="block" color="primary" size="large" onClick={doCrearReserva} style={{ marginTop: 12 }}>
                          <IonIcon icon={checkmarkDone} slot="start" />
                          CREAR RESERVA
                        </IonButton>
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
    </IonPage>
  );
};

export default NuevaReserva;
