import React, { useEffect, useState } from 'react';
import {
  IonAlert, IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle,
  IonCol, IonIcon, IonInput, IonItem, IonLabel, IonModal, IonNote, IonRow, IonSelect, IonSelectOption,
  IonText, IonTextarea, IonSkeletonText,
} from '@ionic/react';
import {
  cash, checkmarkCircle, closeCircle, documentText, informationCircle, person, bed, pricetags,
} from 'ionicons/icons';
import type { Folio, Reserva, Huesped, Habitacion } from '../../types';
import { FolioService, ReservaService, HabitacionService, HuespedService } from '../../services';

const USUARIO_ACTUAL = { id: 'USR-MOISES-0001', nombres: 'Moisés', apellidos: 'Ochoa' };

type MedioPago = 'EFECTIVO' | 'TARJETA' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA' | 'DEPOSITO';
const MEDIOS_PAGO: MedioPago[] = ['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN', 'TRANSFERENCIA', 'DEPOSITO'];

interface Props {
  isOpen: boolean;
  onDismiss: () => void;
  reservaId: string;
}

const CheckoutModal: React.FC<Props> = ({ isOpen, onDismiss, reservaId }) => {
  const [paso, setPaso] = useState<'formulario' | 'exito'>('formulario');
  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reserva, setReserva] = useState<Reserva | undefined>(undefined);
  const [folio, setFolio] = useState<Folio | undefined>(undefined);
  const [confirmarEarlyOpen, setConfirmarEarlyOpen] = useState(false);
  const [huesped, setHuesped] = useState<Huesped | undefined>(undefined);
  const [habitacion, setHabitacion] = useState<Habitacion | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const [montoAdelanto, setMontoAdelanto] = useState<string>('0');
  const [montoPagoFinal, setMontoPagoFinal] = useState<string>('0');
  const [medioPago, setMedioPago] = useState<MedioPago>('EFECTIVO');
  const [observaciones, setObservaciones] = useState<string>('');
  const [codigoComprobante, setCodigoComprobante] = useState<string>('');

  const reset = () => {
    setPaso('formulario');
    setProcesando(false);
    setErrorMsg(null);
    setMontoAdelanto('0');
    setMontoPagoFinal('0');
    setMedioPago('EFECTIVO');
    setObservaciones('');
    setCodigoComprobante('');
  };

  useEffect(() => {
    if (!isOpen || !reservaId) return;
    let mounted = true;
    (async () => {
      reset();
      setLoading(true);
      try {
        const r = await ReservaService.buscarPorId(reservaId);
        if (!mounted) return;
        setReserva(r || undefined);
        if (r) {
          const hid = (r as any).huespedTitularId || (r as any).huespedId;
          if (hid) {
            try {
              const h = await HuespedService.buscarPorId(hid);
              if (mounted) setHuesped(h as any || ((r as any).huesped ?? (r as any).huespedTitular));
            } catch { if (mounted) setHuesped(((r as any).huesped ?? (r as any).huespedTitular) as any); }
          } else if (mounted) {
            setHuesped(((r as any).huesped ?? (r as any).huespedTitular) as any);
          }
          const hab0 = ((r as any).habitaciones || [])[0];
          const habId = hab0?.habitacionId || hab0?.habitacion?.id;
          if (habId) {
            try {
              const hh = await HabitacionService.buscarPorId(habId);
              if (mounted) setHabitacion((hh as any) || hab0?.habitacion);
            } catch { if (mounted) setHabitacion(hab0?.habitacion); }
          } else if (mounted) {
            setHabitacion(hab0?.habitacion);
          }
          let f: Folio | undefined;
          try {
            const todos: Folio[] = await FolioService.listarTodos() as any[];
            f = (todos as any[]).find((x: any) => x.reservaId === r.id || x.reserva?.id === r.id);
            if (!f) {
              try { f = await FolioService.buscarPorId((r as any).folioId || ''); } catch { /* noop */ }
            }
          } catch { /* ignore */ }
          if (mounted) {
            setFolio(f);
            const adelanto = Math.max(
              0,
              Number((f as any)?.pagoAdelanto?.monto ?? 0) ||
              Number((f as any)?.montoPagoAdelanto ?? 0) ||
              0
            );
            const totalReserva = Number((r as any)?.montoTotalReserva ?? 0) || 0;
            const totalCargosFolio =
              Number((f as any)?.totalCargos ?? 0) ||
              Number((f as any)?.montoTotal ?? 0) ||
              0;
            const totalFolio = Math.max(totalReserva, totalCargosFolio);
            setMontoAdelanto(String(adelanto.toFixed(2)));
            const resta = Math.max(0, totalFolio - adelanto);
            setMontoPagoFinal(String(resta.toFixed(2)));
            setCodigoComprobante('BOLETA-' + Math.floor(Math.random() * 90000 + 10000));
          }
        } else {
          if (mounted) {
            setFolio(undefined);
            setHuesped(undefined);
            setHabitacion(undefined);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [isOpen, reservaId]);

  const cerrar = () => {
    if (procesando) return;
    onDismiss();
  };

  const hab0: any = (reserva as any)?.habitaciones?.[0];
  const codHab = habitacion ? (habitacion as any).codigo : hab0?.habitacionId || '—';
  const noches = Number((reserva as any)?.totalNoches || 0);
  const totalReserva = Number((reserva as any)?.montoTotalReserva || 0);
  const subTotal = Number((reserva as any)?.subTotalSinImpuestos || 0);
  const impuestos = Number((reserva as any)?.totalImpuestos || 0);
  const descuentos = Number((reserva as any)?.descuentosTotal || 0);

  const adelanto = Number(montoAdelanto || 0);
  const pagoFinal = Number(montoPagoFinal || 0);
  const totalPagado = adelanto + pagoFinal;
  const saldoPendiente = Math.max(0, totalReserva - totalPagado);
  const puedeConfirmar = !procesando && reserva && pagoFinal >= 0;

  const fechaCheckoutProgramada = new Date((reserva as any)?.fechaCheckout || (reserva as any)?.fechaCheckOut || 0);
  const fechaHoy = new Date();
  const diffMs = fechaCheckoutProgramada.getTime() - fechaHoy.getTime();
  const horasFaltantes = diffMs / (1000 * 60 * 60);
  const esEarlyCheckOut = !!reserva && horasFaltantes > 6;
  const nochesNoUsadas = esEarlyCheckOut
    ? Math.max(0, Math.ceil((horasFaltantes - 12) / 24))
    : 0;

  const handleConfirmar = async (skipEarlyCheck = false) => {
    if (!puedeConfirmar || !reserva?.id || !folio?.id) return;
    if (esEarlyCheckOut && !skipEarlyCheck) {
      setConfirmarEarlyOpen(true);
      return;
    }
    setProcesando(true);
    setErrorMsg(null);
    try {
      let tx: any;
      try {
        if (typeof (FolioService as any).registrarCheckOut === 'function') {
          tx = await (FolioService as any).registrarCheckOut({
            folioId: folio.id,
            usuarioId: USUARIO_ACTUAL.id,
            pagos: [{
              medioPago,
              monto: pagoFinal,
              numeroOperacion: medioPago === 'EFECTIVO' ? undefined : `${medioPago}-${Date.now().toString().slice(-6)}`,
              observaciones: observaciones || undefined,
              creadoPorId: USUARIO_ACTUAL.id,
            }],
            observaciones: observaciones || undefined,
            codigoComprobante: codigoComprobante || undefined,
            comprobanteSunat: { tipo: (medioPago === 'EFECTIVO' ? 'BOLETA' : 'FACTURA'), serie: '001', correlativo: codigoComprobante || '00001' } as any,
          });
        }
      } catch (_) { /* noop */ }

      if (tx?.error) throw new Error(tx.error);

      let reservaActualizada = tx?.reservaActualizada;
      if (!reservaActualizada) {
        try { reservaActualizada = await ReservaService.buscarPorId(reserva.id); } catch { /* noop */ }
      }
      const folioActualizado = tx?.folio ?? folio;

      if (reservaActualizada && !['CHECKOUT'].includes((reservaActualizada as any).estado)) {
        try {
          const cambiarFn = (ReservaService as any).cambiarEstado;
          if (typeof cambiarFn === 'function') {
            await cambiarFn(reservaActualizada.id, 'CHECKOUT', {
              usuarioResponsableId: USUARIO_ACTUAL.id,
              comentario: 'Check-out desde Detalle Reserva',
              informacionAdicional: { fechaCheckoutReal: new Date().toISOString() } as any,
            });
            reservaActualizada = await ReservaService.buscarPorId(reservaActualizada.id) || reservaActualizada;
          }
        } catch (_) { /* ya estaba */ }
      }
      for (const rh of (reservaActualizada as any)?.habitaciones || []) {
        const habId = rh.habitacionId || rh.habitacion?.id;
        if (habId) {
          try {
            const cambiarEstadoFn = (HabitacionService as any).cambiarEstado;
            if (typeof cambiarEstadoFn === 'function') await cambiarEstadoFn(habId, 'LIMPIEZA', USUARIO_ACTUAL.id);
          } catch (_) { /* ya */ }
        }
      }
      setReserva(reservaActualizada);
      setFolio(folioActualizado);
      setPaso('exito');
    } catch (e: any) {
      setErrorMsg(e?.message || 'No se pudo completar el Check-out.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={cerrar}
      onIonModalDidPresent={reset}
      keepContentsMounted={true}
      canDismiss={true}
      backdropDismiss={false}
      style={{
        '--width': '92%',
        '--min-width': '320px',
        '--max-width': '820px',
        '--height': '86%',
        '--border-radius': '16px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
        <div style={{
          background: '#2dd36f', color: '#fff', padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
        }}>
          <button
            onClick={cerrar}
            style={{
              background: 'transparent', border: 'none', color: '#fff',
              fontSize: 22, fontWeight: 700, cursor: procesando ? 'not-allowed' : 'pointer',
              opacity: procesando ? 0.5 : 1,
            }}
            disabled={procesando}
          >
            ×
          </button>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.2 }}>
            {paso === 'formulario' ? `Check-out · ${reserva ? (reserva as any).codigoReserva || reserva.id : ''}` : 'Check-out · Exitoso'}
          </div>
          <button
            onClick={cerrar}
            style={{
              background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff',
              padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: procesando ? 'not-allowed' : 'pointer', opacity: procesando ? 0.5 : 1,
            }}
            disabled={procesando}
          >
            CERRAR
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', background: '#f7f7f7', padding: 16 }}>
          {loading && (
            <IonCard>
              <IonCardContent>
                <IonSkeletonText animated style={{ width: '50%', height: 18, marginBottom: 10 }} />
                <IonSkeletonText animated style={{ width: '100%', height: 14, marginBottom: 8 }} />
                <IonSkeletonText animated style={{ width: '85%', height: 14 }} />
              </IonCardContent>
            </IonCard>
          )}
          {!loading && !reserva && (
            <IonCard>
              <IonCardContent>
                <IonItem color="danger"><IonIcon icon={informationCircle} slot="start" /><IonLabel>No se encontró la reserva.</IonLabel></IonItem>
              </IonCardContent>
            </IonCard>
          )}

          {!loading && reserva && paso === 'formulario' && (
            <IonRow>
              <IonCol size="12">
                {errorMsg && (
                  <IonItem color="danger" style={{ marginBottom: 12 }}>
                    <IonIcon icon={closeCircle} slot="start" />
                    <IonLabel>{errorMsg}</IonLabel>
                  </IonItem>
                )}

                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>#{(reserva as any).codigoReserva || reserva.id}</IonCardTitle>
                    <IonCardSubtitle>Origen: {((reserva as any).origen || '').toUpperCase()}</IonCardSubtitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonItem lines="none">
                      <IonIcon icon={person} color="medium" slot="start" />
                      <IonLabel>
                        <h3 style={{ margin: 0 }}>
                          {huesped ? `${huesped.nombres} ${huesped.apellidos}` : `Titular #${(reserva as any).huespedId}`}
                        </h3>
                        <IonNote>
                          {huesped?.tipoDocumento} {huesped?.numeroDocumento}
                          {huesped?.telefonoCelular ? ` · ${huesped.telefonoCelular}` : ''}
                        </IonNote>
                      </IonLabel>
                    </IonItem>
                    <IonItem lines="none">
                      <IonIcon icon={bed} color="medium" slot="start" />
                      <IonLabel>
                        <h3 style={{ margin: 0 }}>{codHab}{habitacion ? ` · ${(habitacion as any).nombre || ''}` : ''}</h3>
                        <IonNote>{noches} noche{noches === 1 ? '' : 's'} · {(reserva as any).totalPersonas || (reserva as any).totalAdultos || 1} pax</IonNote>
                      </IonLabel>
                    </IonItem>
                    <IonItem lines="none">
                      <IonIcon icon={pricetags} color="medium" slot="start" />
                      <IonLabel>
                        <h3 style={{ margin: 0 }}>
                          TOTAL RESERVA:&nbsp;
                          <IonText color="primary"><strong>S/ {totalReserva.toFixed(2)}</strong></IonText>
                        </h3>
                        <IonNote>
                          Sub S/ {subTotal.toFixed(2)} · Imp S/ {impuestos.toFixed(2)} · Desc S/ {descuentos.toFixed(2)}
                        </IonNote>
                      </IonLabel>
                    </IonItem>
                    {esEarlyCheckOut && (
                      <IonItem color="warning" lines="none" style={{ marginTop: 8, borderRadius: 8 }}>
                        <IonIcon icon={informationCircle} color="warning" slot="start" />
                        <IonLabel>
                          <strong>⚠️ SALIDA ANTICIPADA</strong>
                          <IonNote style={{ display: 'block' }}>
                            Faltan ~{Math.round(horasFaltantes)} horas (~{nochesNoUsadas} noche(s) no usadas) para la fecha de salida programada. Se solicitará confirmación extra al pulsar "Confirmar Check-out".
                          </IonNote>
                        </IonLabel>
                      </IonItem>
                    )}
                  </IonCardContent>
                </IonCard>

                <IonRow>
                  <IonCol size="12" sizeMd="6">
                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>💰 Pagos aplicados</IonCardTitle>
                        <IonCardSubtitle>Pago adelanto + Pago final = Total liquidado.</IonCardSubtitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <IonItem>
                          <IonLabel position="stacked">Pago adelanto (S/)</IonLabel>
                          <IonInput
                            type="number"
                            value={montoAdelanto}
                            disabled
                          />
                        </IonItem>
                        <IonItem>
                          <IonLabel position="stacked">Pago final * (S/)</IonLabel>
                          <IonInput
                            type="number"
                            value={montoPagoFinal}
                            onIonChange={(e) => setMontoPagoFinal(String(Number(e.detail.value || 0) || 0))}
                          />
                        </IonItem>
                        <IonItem>
                          <IonLabel position="stacked">Medio de pago *</IonLabel>
                          <IonSelect
                            value={medioPago}
                            onIonChange={(e) => setMedioPago(e.detail.value)}
                            interface="action-sheet"
                          >
                            {MEDIOS_PAGO.map((mp) => (
                              <IonSelectOption key={mp} value={mp}>{mp === 'TRANSFERENCIA' ? 'TRANSFERENCIA BANCARIA' : mp === 'DEPOSITO' ? 'DEPÓSITO EN CUENTA' : mp}</IonSelectOption>
                            ))}
                          </IonSelect>
                        </IonItem>
                        <IonItem>
                          <IonLabel position="stacked">N° comprobante SUNAT</IonLabel>
                          <IonInput value={codigoComprobante} onIonChange={(e) => setCodigoComprobante(e.detail.value || '')} />
                        </IonItem>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>

                  <IonCol size="12" sizeMd="6">
                    <IonCard color={saldoPendiente === 0 ? 'success' : 'warning'}>
                      <IonCardHeader>
                        <IonCardTitle>💵 Resumen de caja</IonCardTitle>
                        <IonCardSubtitle>{saldoPendiente === 0 ? 'Cuenta totalmente liquidada.' : 'Saldo pendiente por cubrir.'}</IonCardSubtitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <IonItem lines="none" color="transparent">
                          <IonLabel>Total cargos (reserva + POS)</IonLabel>
                          <h4 slot="end" style={{ margin: 0 }}>S/ {totalReserva.toFixed(2)}</h4>
                        </IonItem>
                        <IonItem lines="none" color="transparent">
                          <IonLabel>(−) Pago adelanto</IonLabel>
                          <h4 slot="end" style={{ margin: 0 }}>- S/ {adelanto.toFixed(2)}</h4>
                        </IonItem>
                        <IonItem lines="none" color="transparent">
                          <IonLabel>(−) Pago final ({medioPago})</IonLabel>
                          <h4 slot="end" style={{ margin: 0 }}>- S/ {pagoFinal.toFixed(2)}</h4>
                        </IonItem>
                        <IonItem lines="none" color={saldoPendiente === 0 ? 'success' : 'danger'}>
                          <IonLabel><strong>SALDO PENDIENTE</strong></IonLabel>
                          <h3 slot="end" style={{ margin: 0 }}>S/ {saldoPendiente.toFixed(2)}</h3>
                        </IonItem>
                      </IonCardContent>
                    </IonCard>
                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>📝 Observaciones recepción</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <IonTextarea
                          rows={4}
                          placeholder="Ej: Cliente dejó maleta en consigna, se retirará luego."
                          value={observaciones}
                          onIonChange={(e) => setObservaciones(e.detail.value || '')}
                        />
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>

                <IonRow style={{ marginTop: 12 }}>
                  <IonCol size="12" sizeMd="6">
                    <IonButton expand="block" fill="outline" color="medium" onClick={cerrar} disabled={procesando}>
                      CANCELAR
                    </IonButton>
                  </IonCol>
                  <IonCol size="12" sizeMd="6">
                    <IonButton expand="block" color="primary" onClick={() => handleConfirmar(false)} disabled={!puedeConfirmar}>
                      {procesando ? 'Procesando…' : `✔ CONFIRMAR CHECK-OUT · ${(reserva as any).codigoReserva || reserva.id}`}
                    </IonButton>
                  </IonCol>
                </IonRow>
              </IonCol>
            </IonRow>
          )}

          {!loading && reserva && paso === 'exito' && (
            <IonCard color="success">
              <IonCardContent>
                <IonRow>
                  <IonCol size="12">
                    <h3 style={{ marginTop: 0 }}><IonIcon icon={checkmarkCircle} /> Check-out exitoso</h3>
                    <IonItem color="success" lines="none">
                      <IonIcon icon={documentText} slot="start" />
                      <IonLabel>
                        Reserva <strong>#{(reserva as any).codigoReserva || reserva.id}</strong> pasa a estado{' '}
                        <IonBadge color="light" style={{ color: '#2dd36f', fontWeight: 800 }}>CHECKOUT</IonBadge>
                      </IonLabel>
                    </IonItem>
                    <IonItem color="success" lines="none">
                      <IonIcon icon={person} slot="start" />
                      <IonLabel>Huésped: {huesped ? `${huesped.nombres} ${huesped.apellidos}` : ''}</IonLabel>
                    </IonItem>
                    <IonItem color="success" lines="none">
                      <IonIcon icon={bed} slot="start" />
                      <IonLabel>Habitación(es) liberada(s) a <strong>LIMPIEZA</strong>: {codHab}</IonLabel>
                    </IonItem>
                    <IonItem color="success" lines="none">
                      <IonIcon icon={cash} slot="start" />
                      <IonLabel>
                        Total pagado: <strong>S/ {totalPagado.toFixed(2)}</strong> ({medioPago}) ·{' '}
                        Saldo pendiente: <strong>S/ {saldoPendiente.toFixed(2)}</strong>
                      </IonLabel>
                    </IonItem>
                    <IonItem color="success" lines="none">
                      <IonIcon icon={documentText} slot="start" />
                      <IonLabel>
                        Folio cerrado: <strong>{folio ? `F-${String(folio.id).slice(-4).toUpperCase()}` : ''}</strong>{' '}
                        · Comprobante: <strong>{codigoComprobante || '—'}</strong>
                      </IonLabel>
                    </IonItem>
                  </IonCol>
                </IonRow>
                <IonRow style={{ marginTop: 16 }}>
                  <IonCol size="12">
                    <IonButton expand="block" color="light" onClick={cerrar}>
                      ✔ LISTO · VOLVER A LA LISTA
                    </IonButton>
                  </IonCol>
                </IonRow>
              </IonCardContent>
            </IonCard>
          )}
        </div>

        <IonAlert
          isOpen={confirmarEarlyOpen}
          onDidDismiss={() => setConfirmarEarlyOpen(false)}
          header="⚠️ Salida anticipada detectada"
          subHeader={`${reserva ? `#${(reserva as any).codigoReserva || reserva.id}` : ''} · Cliente sale antes de lo programado`}
          message={
            esEarlyCheckOut
              ? `Faltan aproximadamente ${Math.round(horasFaltantes)} horas (~${nochesNoUsadas} noche(s) no usadas) para la fecha de salida reservada. ¿Estás 100% seguro que deseas cerrar este Check-out ahora? El folio se cerrará y NO podrá reabrirse desde este botón (tendrás que editar manualmente si es un error).`
              : ''
          }
          buttons={[
            {
              text: 'VOLVER · NO HACER CHECK-OUT',
              role: 'cancel',
              handler: () => setConfirmarEarlyOpen(false),
            },
            {
              text: 'SÍ, QUIERO HACER EARLY CHECK-OUT',
              role: 'destructive',
              handler: () => {
                setConfirmarEarlyOpen(false);
                handleConfirmar(true);
              },
            },
          ]}
        />
      </div>
    </IonModal>
  );
};

export default CheckoutModal;
