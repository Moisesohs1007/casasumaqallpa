import React, { useState } from 'react';
import {
  IonButton, IonButtons, IonCol, IonContent, IonGrid, IonHeader, IonIcon, IonInput,
  IonItem, IonLabel, IonList, IonModal, IonPage, IonRow, IonTextarea, IonTitle, IonToolbar,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonBadge, IonNote, IonAlert,
  IonSelect, IonSelectOption,
} from '@ionic/react';
import { checkmark, closeOutline, calendar, bed, key, person, cash, pricetags, alertCircle, checkmarkCircle } from 'ionicons/icons';
import type { Reserva, Huesped, Habitacion, Folio } from '../../types';
import { FolioService, ReservaService, HuespedService, HabitacionService } from '../../services';

type Usuario = { id: string; nombres?: string; apellidos?: string };

interface CheckinModalProps {
  isOpen: boolean;
  onDidDismiss: () => void;
  reservaId: string | null;
  usuarioActual: Usuario; // USR-MOISES-0001
}

type PasoId = 1 | 2;

const CheckinModal: React.FC<CheckinModalProps> = ({ isOpen, onDidDismiss, reservaId, usuarioActual }) => {
  const [paso, setPaso] = useState<PasoId>(1);
  const [cantidadLlaves, setCantidadLlaves] = useState<number>(1);
  const [llaveCodigo, setLlaveCodigo] = useState<string>('');
  const [depositoLlaves, setDepositoLlaves] = useState<string>('0');
  const [pagoAdelantado, setPagoAdelantado] = useState<string>('');
  const [medioPagoAdelantado, setMedioPagoAdelantado] = useState<string>('EFECTIVO');
  const [observaciones, setObservaciones] = useState<string>('');
  const [procesando, setProcesando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    reservaActualizada?: Reserva;
    folio?: Folio;
  } | null>(null);

  const reserva = (reservaId ? (ReservaService.buscarPorId(reservaId) ?? undefined) : undefined) as (Reserva | undefined);
  const huesped: Huesped | undefined = reserva
    ? ((reserva as any).huespedTitular ?? (reserva as any).huesped ?? (HuespedService.buscarPorId((reserva as any).huespedTitularId || (reserva as any).huespedId) ?? undefined) as any)
    : undefined;
  const habitacionesList: Habitacion[] = (reserva ? (((reserva as any).habitaciones ?? []) as any[]).map((hr: any) => {
    const hab = (HabitacionService.buscarPorId(hr?.habitacionId || hr?.habitacion?.id) ?? undefined) as any;
    return hab ?? hr?.habitacion;
  }).filter(Boolean) : []) as Habitacion[];
  const habitacionPrincipal: Habitacion | undefined = habitacionesList[0];
  const habitacionesCount = habitacionesList.length;

  // Calcular noches segun los nombres reales del seed (SOLO ?? para evitar error Babel parens)
  const checkinDateInternal =
    (
      (reserva as any)?.fechaCheckin ??
      (reserva as any)?.fechaCheckIn ??
      (reserva as any)?.habitaciones?.[0]?.fechaCheckin ??
      (reserva as any)?.habitaciones?.[0]?.fechaCheckinPropuesto ??
      ''
    ).toString().slice(0, 10);
  const checkoutDateInternal =
    (
      (reserva as any)?.fechaCheckout ??
      (reserva as any)?.fechaCheckOut ??
      (reserva as any)?.habitaciones?.[0]?.fechaCheckout ??
      (reserva as any)?.habitaciones?.[0]?.fechaCheckoutPropuesto ??
      ''
    ).toString().slice(0, 10);
  const checkinDate = checkinDateInternal;
  const checkoutDate = checkoutDateInternal;

  const nochesInternal =
    Number(
      (reserva as any)?.noches ??
      (reserva as any)?.totalNoches ??
      (reserva as any)?.habitaciones?.reduce?.((acc: number, hr: any) => Math.max(acc, Number(hr?.totalNoches || hr?.noches || 0)), 0) ??
      (checkinDate && checkoutDate
        ? Math.max(1, Math.round(
            (new Date(checkoutDate).getTime() - new Date(checkinDate).getTime()) / (1000 * 60 * 60 * 24)
          ))
        : 0)
    );
  const noches = nochesInternal;

  // Calcular TOTAL sumando todas las habitaciones (porque R-1004 tiene 2)
  const subtotalBase =
    Number((reserva as any)?.subTotalAlojamiento) ||
    Number((reserva as any)?.subTotal) ||
    ((reserva as any)?.habitaciones?.reduce?.((acc: number, hr: any) => {
      const precioNoche = Number(hr?.precioBaseAcordadoPorNoche || hr?.precioPorNoche || hr?.precioAcordadoPorNoche || 0);
      const n = Number(hr?.totalNoches || hr?.noches || noches || 0);
      return acc + precioNoche * n;
    }, 0) || 0);
  const impuestosTotal = Number((reserva as any)?.impuestos) || Math.round(subtotalBase * 0.18 + subtotalBase * 0.05);
  const descuentosTotal = Number((reserva as any)?.descuentos) || 0;
  const rawTotal =
    Number((reserva as any)?.totalReserva) ||
    Number((reserva as any)?.total) ||
    Number((reserva as any)?.montoTotal) ||
    ((reserva as any)?.habitaciones?.reduce?.((acc: number, hr: any) => acc + Number(hr?.precioTotalReservaHabitacion || hr?.precioTotal || 0), 0)) ||
    Math.max(0, subtotalBase + impuestosTotal - descuentosTotal) ||
    0;
  const total = Number(rawTotal) || 0;

  // Precargar llaveCodigo con codigo de la habitacion principal
  React.useEffect(() => {
    if (isOpen && reserva && !llaveCodigo) {
      const codHabitacion = habitacionPrincipal ? (habitacionPrincipal as any).codigo : ((reserva as any).habitaciones?.[0]?.habitacionId || (reserva as any).habitaciones?.[0]?.habitacion?.codigo);
      if (codHabitacion) setLlaveCodigo(codHabitacion);
    }
  }, [isOpen, reserva, habitacionPrincipal, llaveCodigo]);

  const handleConfirmarCheckIn = async () => {
    if (!reservaId || !reserva) {
      setErrorMsg('Reserva no encontrada.');
      return;
    }
    if (!llaveCodigo || llaveCodigo.trim().length < 2) {
      setErrorMsg('Ingresa el código/número de llave entregada al huésped.');
      return;
    }
    setProcesando(true);
    setErrorMsg(null);
    try {
      const pagoAdelantadoParsed = pagoAdelantado ? Number(pagoAdelantado) : undefined;
      const resultadoTx = FolioService.registrarCheckIn({
        reservaId,
        usuarioIdRecepcionista: usuarioActual.id,
        llaveCodigo: llaveCodigo.trim(),
        cantidadLlaves: Number(cantidadLlaves) || 1,
        depositoLlavesMonto: depositoLlaves ? Number(depositoLlaves) : undefined,
        observaciones: observaciones.trim() || undefined,
        pagoAdelantado: pagoAdelantadoParsed && pagoAdelantadoParsed > 0 ? {
          folioId: '', // servicio lo agrega interno
          monto: pagoAdelantadoParsed,
          moneda: 'PEN' as any,
          medioPago: (medioPagoAdelantado as any) || 'EFECTIVO',
          comprobante: {
            tipoComprobante: 'RECIBO',
            numero: `REC-${(reserva as any).codigo || reservaId}`,
          },
          usuarioId: usuarioActual.id,
          notas: 'Pago adelantado Check-in',
        } as any : undefined,
      });

      if (resultadoTx.error || !resultadoTx.reservaActualizada || !resultadoTx.folio) {
        setErrorMsg(resultadoTx.error || 'No se pudo completar el Check-in.');
        setProcesando(false);
        return;
      }

      setResultado({
        reservaActualizada: resultadoTx.reservaActualizada,
        folio: resultadoTx.folio,
      });
      setPaso(2);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error inesperado al hacer Check-in.');
    } finally {
      setProcesando(false);
    }
  };

  const resetModal = () => {
    setPaso(1);
    setCantidadLlaves(1);
    setLlaveCodigo('');
    setDepositoLlaves('0');
    setPagoAdelantado('');
    setMedioPagoAdelantado('EFECTIVO');
    setObservaciones('');
    setProcesando(false);
    setErrorMsg(null);
    setResultado(null);
  };

  const cerrar = () => {
    resetModal();
    onDidDismiss();
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={cerrar}
      onIonModalDidPresent={resetModal}
      keepContentsMounted={true}
      canDismiss={true}
      backdropDismiss={false}
      style={{
        '--width': '92%',
        '--min-width': '320px',
        '--max-width': '820px',
        '--height': '82%',
        '--border-radius': '16px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
        {/* HEADER (sticky) */}
        <div
          style={{
            background: '#2dd36f',
            color: 'white',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <IonButton
            fill="clear"
            color="light"
            onClick={cerrar}
            style={{ margin: 0, padding: 0, minWidth: 32, width: 32, height: 32 }}
          >
            <IonIcon icon={closeOutline} slot="icon-only" style={{ color: 'white', fontSize: 20 }} />
          </IonButton>
          <div style={{ flex: 1, fontWeight: 600, fontSize: 16, textAlign: 'center', color: 'white' }}>
            {paso === 1 ? 'Check-in · Confirmar datos' : 'Check-in · Exitoso'}
          </div>
          {paso === 2 && (
            <IonButton
              fill="clear"
              color="light"
              strong
              onClick={cerrar}
              style={{ margin: 0, color: 'white', padding: '0 10px', fontWeight: 600 }}
            >
              Cerrar
            </IonButton>
          )}
          {paso !== 2 && <div style={{ width: 70 }} />}
        </div>

        {/* CONTENT (scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#f7f7f7', padding: 16 }}>
          {!reserva && (
            <IonList>
              <IonItem>
                <IonLabel color="danger">No se pudo cargar la información de la reserva.</IonLabel>
              </IonItem>
            </IonList>
          )}
          {reserva && paso === 1 && (
            <IonGrid style={{ padding: 0 }}>
              <IonRow>
                <IonCol size="12">
                  <IonCard>
                    <IonCardContent style={{ paddingTop: 18 }}>
                      <h3 style={{ margin: 0 }}>
                        #{(reserva as any).codigoReserva || (reserva as any).codigo || reservaId}
                      </h3>
                      {huesped && (
                        <IonItem lines="none" style={{ paddingLeft: 0 }}>
                          <IonIcon icon={person} color="medium" slot="start" />
                          <IonLabel>
                            <h2 style={{ margin: 0 }}>{huesped.nombres} {huesped.apellidos}</h2>
                            <IonNote>
                              {huesped.tipoDocumento} {huesped.numeroDocumento}
                              {huesped.telefonoCelular ? ` · ${huesped.telefonoCelular}` : ''}
                              {huesped.email ? ` · ${huesped.email}` : ''}
                            </IonNote>
                          </IonLabel>
                        </IonItem>
                      )}
                      <IonItem lines="none" style={{ paddingLeft: 0 }}>
                        <IonIcon icon={bed} color="medium" slot="start" />
                        <IonLabel>
                          <h3 style={{ margin: 0 }}>
                            {habitacionPrincipal
                              ? `${(habitacionPrincipal as any).codigo}${habitacionesCount > 1 ? ` + ${habitacionesCount - 1} hab.` : ''} · ${(habitacionPrincipal as any).nombre || (habitacionPrincipal as any).tipo?.nombre || ''}`
                              : 'Habitación'}
                          </h3>
                          <IonNote>
                            {habitacionesList.map((h: any) => h.codigo || h.nombre).filter(Boolean).join(' + ') || ''}
                          </IonNote>
                        </IonLabel>
                        <IonBadge color="primary" slot="end">{noches} noche{noches === 1 ? '' : 's'}</IonBadge>
                      </IonItem>
                      <IonItem lines="none" style={{ paddingLeft: 0 }}>
                        <IonIcon icon={calendar} color="medium" slot="start" />
                        <IonLabel>
                          <p style={{ margin: 0 }}>Check-in (15:00): {checkinDate}</p>
                          <p style={{ margin: 0 }}>Check-out (11:00): {checkoutDate}</p>
                        </IonLabel>
                        <IonBadge color="warning" slot="end">
                          {((reserva as any).origen || '').toUpperCase()}
                        </IonBadge>
                      </IonItem>
                      <IonItem lines="none" style={{ paddingLeft: 0 }}>
                        <IonIcon icon={pricetags} color="medium" slot="start" />
                        <IonLabel>
                          <p style={{ margin: 0 }}>Total reserva</p>
                        </IonLabel>
                        <h3 slot="end" style={{ margin: 0 }}>S/ {(Number(total) || 0).toFixed(2)}</h3>
                      </IonItem>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="12" sizeMd="6">
                  <IonCard>
                    <IonCardHeader style={{ paddingBottom: 0 }}>
                      <IonCardTitle>
                        <IonIcon icon={key} style={{ marginRight: 6 }} />
                        Llaves y depósito
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonItem>
                        <IonLabel position="stacked">Código de llave entregada *</IonLabel>
                        <IonInput
                          value={llaveCodigo}
                          onIonChange={e => setLlaveCodigo(e.detail.value as string)}
                          placeholder="Ej: 101A, CAB-02, etc."
                          color={llaveCodigo && llaveCodigo.trim() ? undefined : 'danger'}
                        />
                      </IonItem>
                      {(!llaveCodigo || !llaveCodigo.trim()) && (
                        <IonItem lines="none" color="danger" className="ion-no-padding">
                          <IonLabel style={{ paddingLeft: 16, paddingTop: 2, fontSize: 12 }}>
                            ⚠️ Ingresa el código/número de llave entregada para habilitar el Check-in.
                          </IonLabel>
                        </IonItem>
                      )}
                      <IonItem>
                        <IonLabel position="stacked">Cantidad de llaves</IonLabel>
                        <IonInput type="number" min={1} max={10} value={cantidadLlaves} onIonChange={e => setCantidadLlaves(Number(e.detail.value) || 1)} />
                      </IonItem>
                      <IonItem>
                        <IonLabel position="stacked">Depósito en soles (S/)</IonLabel>
                        <IonInput type="number" min={0} value={depositoLlaves} onIonChange={e => setDepositoLlaves(e.detail.value as string)} placeholder="0 = sin depósito" />
                      </IonItem>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="12" sizeMd="6">
                  <IonCard>
                    <IonCardHeader style={{ paddingBottom: 0 }}>
                      <IonCardTitle>
                        <IonIcon icon={cash} style={{ marginRight: 6 }} />
                        Pago adelantado (opcional)
                      </IonCardTitle>
                      <IonCardSubtitle>Si el huésped paga algo ahora en recepción</IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonItem>
                        <IonLabel position="stacked">Monto adelantado (S/)</IonLabel>
                        <IonInput type="number" min={0} value={pagoAdelantado} onIonChange={e => setPagoAdelantado(e.detail.value as string)} placeholder="0 = sin pago anticipado" />
                      </IonItem>
                      <IonItem>
                        <IonLabel position="stacked">Medio de pago</IonLabel>
                        <IonSelect value={medioPagoAdelantado} onIonChange={e => setMedioPagoAdelantado(e.detail.value)}>
                          <IonSelectOption value="EFECTIVO">💵 Efectivo (Soles)</IonSelectOption>
                          <IonSelectOption value="TARJETA_CREDITO">💳 Tarjeta Crédito</IonSelectOption>
                          <IonSelectOption value="TARJETA_DEBITO">💳 Tarjeta Débito</IonSelectOption>
                          <IonSelectOption value="TRANSFERENCIA_BANCARIA">🏦 Transferencia</IonSelectOption>
                          <IonSelectOption value="YAPE">📱 Yape</IonSelectOption>
                          <IonSelectOption value="PLIN">📱 Plin</IonSelectOption>
                        </IonSelect>
                      </IonItem>
                      <IonItem>
                        <IonLabel position="stacked">Observaciones recepción</IonLabel>
                        <IonTextarea value={observaciones} onIonChange={e => setObservaciones(e.detail.value as string)} rows={3} placeholder="Ej: Solicita cama extra, habitación alejada de ruido, etc." />
                      </IonItem>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>

              {errorMsg && (
                <IonRow>
                  <IonCol size="12">
                    <IonItem color="danger">
                      <IonIcon icon={alertCircle} slot="start" />
                      <IonLabel>{errorMsg}</IonLabel>
                    </IonItem>
                  </IonCol>
                </IonRow>
              )}

              <IonRow className="ion-justify-content-end ion-align-items-center" style={{ marginTop: 12 }}>
                <IonCol size="12" sizeMd="4">
                  <IonButton expand="block" fill="outline" color="medium" onClick={cerrar} disabled={procesando}>
                    Cancelar
                  </IonButton>
                </IonCol>
                <IonCol size="12" sizeMd="6">
                  <IonButton
                    expand="block"
                    color="success"
                    onClick={handleConfirmarCheckIn}
                    disabled={procesando || !llaveCodigo || !llaveCodigo.trim()}
                  >
                    <IonIcon icon={checkmarkCircle} slot="start" />
                    {procesando ? 'Procesando...' : `CONFIRMAR CHECK-IN · ${(reserva as any).codigo || (reserva as any).codigoReserva || ''}`}
                  </IonButton>
                </IonCol>
              </IonRow>
            </IonGrid>
          )}

          {reserva && paso === 2 && resultado && (
            <IonGrid style={{ padding: 0 }}>
              <IonRow>
                <IonCol size="12">
                  <IonCard color="success" className="ion-text-left">
                    <IonCardContent>
                      <h2 style={{ marginTop: 0 }}>
                        <IonIcon icon={checkmarkCircle} /> Check-in exitoso
                      </h2>
                      <p style={{ fontSize: 16 }}>
                        ✅ Reserva #{(resultado.reservaActualizada as any)?.codigo || (reserva as any).codigoReserva || (reserva as any).codigo} pasa a estado
                        {' '}<IonBadge color="light" style={{ fontSize: 16 }}>{(resultado.reservaActualizada as any)?.estado || 'CHECKED_IN'}</IonBadge>
                      </p>
                      {huesped && (
                        <p style={{ fontSize: 16 }}>
                          👤 Huésped: <strong>{huesped.nombres} {huesped.apellidos}</strong>
                        </p>
                      )}
                      {habitacionPrincipal && (
                        <p style={{ fontSize: 16 }}>
                          🛏️ Habitación ocupada: <strong>{habitacionesList.map((h: any) => h.codigo || h.nombre).filter(Boolean).join(' + ')}</strong>
                        </p>
                      )}
                      {resultado.folio && (
                        <p style={{ fontSize: 16 }}>
                          📒 Folio abierto: <IonBadge color="warning" style={{ fontSize: 16 }}>
                            F-{resultado.folio.id?.slice(-4).toUpperCase()}
                          </IonBadge>
                          {' '}({((resultado.folio as any).cargos || []).length} cargo(s) inicial(es) de alojamiento)
                        </p>
                      )}
                      <p style={{ fontSize: 14, opacity: 0.95 }}>
                        Ahora cualquier pedido POS con opción <em>CARGO_A_HABITACION</em> se sumará automáticamente a este folio.
                      </p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
              <IonRow className="ion-justify-content-end" style={{ marginTop: 8 }}>
                <IonCol size="12" sizeMd="5">
                  <IonButton expand="block" color="success" onClick={cerrar}>
                    Listo · Volver a la lista
                  </IonButton>
                </IonCol>
              </IonRow>
            </IonGrid>
          )}
        </div>
      </div>
    </IonModal>
  );
};

export default CheckinModal;
export { CheckinModal };
