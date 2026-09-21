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

  const reserva = reservaId ? ReservaService.buscarPorId(reservaId) as Reserva | undefined : undefined;
  const huesped: Huesped | undefined = reserva
    ? ((reserva as any).huespedTitular ?? (reserva as any).huesped ?? HuespedService.buscarPorId((reserva as any).huespedTitularId || (reserva as any).huespedId) as any)
    : undefined;
  const habitacion: Habitacion | undefined = reserva && (reserva as any).habitaciones?.[0]
    ? (HabitacionService.buscarPorId((reserva as any).habitaciones[0].habitacionId || (reserva as any).habitaciones[0].habitacion?.id) as any) ?? (reserva as any).habitaciones[0].habitacion
    : undefined;
  const noches = (reserva as any)?.noches ?? (reserva as any)?.totalNoches ?? 0;
  const total = (reserva as any)?.totalReserva ?? (reserva as any)?.total ?? 0;
  const checkinDate = (reserva as any)?.fechaCheckin ?? (reserva as any)?.fechaCheckIn ?? '';
  const checkoutDate = (reserva as any)?.fechaCheckout ?? (reserva as any)?.fechaCheckOut ?? '';

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
    <IonModal isOpen={isOpen} onDidDismiss={cerrar} onIonModalDidPresent={resetModal}>
      <IonPage>
        <IonHeader>
          <IonToolbar color="success">
            <IonButtons slot="start">
              <IonButton onClick={cerrar}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
            <IonTitle>
              {paso === 1 ? 'Check-in · Confirmar datos' : 'Check-in · Exitoso'}
            </IonTitle>
            {paso === 2 && (
              <IonButtons slot="end">
                <IonButton strong onClick={cerrar}>
                  Cerrar
                </IonButton>
              </IonButtons>
            )}
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {!reserva && (
            <IonList>
              <IonItem>
                <IonLabel color="danger">No se pudo cargar la información de la reserva.</IonLabel>
              </IonItem>
            </IonList>
          )}
          {reserva && paso === 1 && (
            <IonGrid style={{ padding: 20 }}>
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
                          <h3 style={{ margin: 0 }}>{habitacion ? `${(habitacion as any).codigo} · ${(habitacion as any).nombre || (habitacion as any).tipo?.nombre || ''}` : 'Habitación'}</h3>
                          <IonNote>
                            {(habitacion as any)?.tipo?.capacidadMaxima ? `Capacidad: ${(habitacion as any).tipo.capacidadMaxima} pax` : ''}
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
                        <IonInput value={llaveCodigo} onIonChange={e => setLlaveCodigo(e.detail.value as string)} placeholder="Ej: 101A, CAB-02, etc." />
                      </IonItem>
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
                  <IonButton expand="block" color="success" onClick={handleConfirmarCheckIn} disabled={procesando || !llaveCodigo}>
                    <IonIcon icon={checkmarkCircle} slot="start" />
                    {procesando ? 'Procesando...' : `CONFIRMAR CHECK-IN · ${(reserva as any).codigo || ''}`}
                  </IonButton>
                </IonCol>
              </IonRow>
            </IonGrid>
          )}

          {reserva && paso === 2 && resultado && (
            <IonGrid style={{ padding: 20 }}>
              <IonRow>
                <IonCol size="12">
                  <IonCard color="success" className="ion-text-left">
                    <IonCardContent>
                      <h2 style={{ marginTop: 0 }}>
                        <IonIcon icon={checkmarkCircle} /> Check-in exitoso
                      </h2>
                      <p style={{ fontSize: 16 }}>
                        ✅ Reserva #{(resultado.reservaActualizada as any)?.codigo || (reserva as any).codigo} pasa a estado
                        {' '}<IonBadge color="light" style={{ fontSize: 16 }}>{(resultado.reservaActualizada as any)?.estado || 'CHECKED_IN'}</IonBadge>
                      </p>
                      {huesped && (
                        <p style={{ fontSize: 16 }}>
                          👤 Huésped: <strong>{huesped.nombres} {huesped.apellidos}</strong>
                        </p>
                      )}
                      {habitacion && (
                        <p style={{ fontSize: 16 }}>
                          🛏️ Habitación ocupada: <strong>{(habitacion as any).codigo}</strong>
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
        </IonContent>
      </IonPage>
    </IonModal>
  );
};

export default CheckinModal;
export { CheckinModal };
