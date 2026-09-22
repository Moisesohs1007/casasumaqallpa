import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader,
  IonCardSubtitle, IonCardTitle, IonCol, IonContent, IonGrid, IonHeader, IonIcon,
  IonItem, IonLabel, IonList, IonNote, IonPage, IonRow, IonTitle, IonToolbar,
  IonBadge, IonChip, IonAlert, useIonViewWillEnter, useIonRouter, useIonToast,
} from '@ionic/react';
import {
  arrowBack, calendar, bed, person, pricetags, alertCircle, logIn, create, trash,
  checkmarkCircle, cash, documentText, closeOutline,
} from 'ionicons/icons';
import type { Color } from '@ionic/core';
import type { EstadoReserva, Reserva, Huesped, Habitacion, Folio } from '../../types';
import { ReservaService, HuespedService, HabitacionService, FolioService } from '../../services';
import { CargoFolioService, PagoFolioService } from '../../services/FolioService';
import CheckinModal from '../../components/modals/CheckinModal';
import CheckoutModal from '../../components/modals/CheckoutModal';
import './Reservas.css';

const USUARIO_ACTUAL = { id: 'USR-MOISES-0001', nombres: 'Moisés', apellidos: 'Ochoa' };

const estadoColor: Record<EstadoReserva, Color> = {
  PENDIENTE: 'warning',
  CONFIRMADA: 'tertiary',
  CHECKIN: 'success',
  CHECKED_IN: 'success',
  CHECKOUT: 'medium',
  CHECKED_OUT: 'medium',
  CANCELADA: 'danger',
  NO_SHOW: 'danger',
  MODIFICADA: 'primary',
  EN_ESPERA: 'warning',
};

const estadoLabel: Record<EstadoReserva, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  CHECKIN: 'Check-in',
  CHECKED_IN: 'Check-in',
  CHECKOUT: 'Check-out',
  CHECKED_OUT: 'Check-out',
  CANCELADA: 'Cancelada',
  NO_SHOW: 'No show',
  MODIFICADA: 'Modificada',
  EN_ESPERA: 'En espera',
};

const ReservaDetalle: React.FC = () => {
  const router = useIonRouter();
  const { id } = useParams<{ id: string }>();
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [confirmarCancelarOpen, setConfirmarCancelarOpen] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState<string>('');
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [folioVinculado, setFolioVinculado] = useState<Folio | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [presentToast] = useIonToast();

  const cargar = (reservaId: string) => {
    const r: any = ReservaService.buscarPorId(reservaId);
    if (!r) {
      // Si no se encontró por id, buscar por código
      const todas = (ReservaService.listarTodas ? ReservaService.listarTodas() : []) as any[];
      const porCodigo = todas.find(x => (x.codigo || x.codigoReserva) === reservaId);
      if (!porCodigo) {
        setReserva(null);
        setNoEncontrada(true);
        return;
      }
      setReserva(porCodigo as Reserva);
      resolverVinculados(porCodigo);
    } else {
      setReserva(r as Reserva);
      resolverVinculados(r);
    }
    setNoEncontrada(false);
  };

  const resolverVinculados = (r: any) => {
    try {
      const todosFolios = (FolioService.listarTodos ? FolioService.listarTodos() : []) as any[];
      const habIds: string[] = [];
      try {
        for (const h of (r.habitaciones || []) as any[]) {
          if (h?.habitacionId) habIds.push(String(h.habitacionId));
          if (h?.habitacion?.id) habIds.push(String(h.habitacion.id));
        }
      } catch {}
      const folio = todosFolios.find((f) => {
        const fAny = f as any;
        const frId = String(fAny.reservaId ?? fAny.reserva?.id ?? '');
        const fc = String(fAny.codigo ?? fAny.codigoFolio ?? fAny.numeroFolio ?? fAny.id ?? '').toUpperCase();
        const fhId = String(fAny.habitacionId ?? fAny.habitacion?.id ?? '');
        const rc = String(r.codigoReserva ?? r.codigo ?? r.id ?? '').toUpperCase();
        const rId = String(r.id ?? '');
        if (frId && (frId === rId || frId.toUpperCase().includes(rc.replace(/[^A-Z0-9]/g, '')))) return true;
        if (fAny.reservaCodigo && String(fAny.reservaCodigo).toUpperCase() === rc) return true;
        if (fAny.reserva?.codigoReserva && String(fAny.reserva.codigoReserva).toUpperCase() === rc) return true;
        if (rc && fc.includes(rc.replace(/[^A-Z0-9]/g, ''))) return true;
        if (fhId && habIds.includes(fhId)) return true;
        for (const hab of habIds) {
          if (fc.includes(hab.replace(/[^A-Z0-9]/g, ''))) return true;
        }
        return false;
      });
      setFolioVinculado(folio ?? null);
    } catch {
      setFolioVinculado(null);
    }
  };

  useIonViewWillEnter(() => {
    if (!id) return;
    const idStr = String(id).trim();
    const esNuevaLiteral = idStr.toLowerCase() === 'nueva' || idStr.toLowerCase() === 'nuevo' || idStr.toLowerCase().includes('/reservasnueva') || idStr.toLowerCase().includes('reservasnuevo');
    if (esNuevaLiteral) {
      setNoEncontrada(false);
      setErrorMsg(null);
      setSuccessMsg(null);
      router.push('/nueva-reserva', 'root', 'replace');
      return;
    }
    const idUpper = idStr.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const esIdLiteralRerserva = /^(RES)?R?\d+$/.test(idUpper) || /^\d+$/.test(idUpper) || idUpper.startsWith('RES') || idUpper.includes('R100') || idUpper.match(/R\d{3,}$/);
    if (!esIdLiteralRerserva) {
      cargar(id);
    } else {
      cargar(id);
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setMotivoCancelacion('');
    setCheckinOpen(false);
    setCheckoutOpen(false);
  });

  const r: any = reserva;
  const estado = (r?.estado || 'PENDIENTE') as EstadoReserva;
  const huesped: Huesped | null | undefined = r
    ? (r.huespedTitular ?? r.huesped ?? HuespedService.buscarPorId(r.huespedTitularId || r.huespedId)) as any
    : null;
  const hab0: any = r?.habitaciones?.[0];
  const habitacion: Habitacion | null | undefined = hab0
    ? ((HabitacionService.buscarPorId(hab0.habitacionId || hab0.habitacion?.id) as any) ?? hab0.habitacion)
    : null;
  const codHab = habitacion ? (habitacion as any).codigo : hab0?.habitacionId || '—';
  const noches = r?.noches ?? r?.totalNoches ?? 0;
  const adultos = r?.adultosTotal ?? r?.totalAdultos ?? hab0?.adultos ?? 0;
  const ninos = r?.ninosTotal ?? r?.totalNinos ?? hab0?.ninos ?? 0;
  const pax = adultos + ninos;
  const subTotal = r?.subTotalAlojamiento ?? r?.subTotalSinImpuestos ?? hab0?.precioTotalReservaHabitacion ?? 0;
  const impuestos = r?.impuestos ?? r?.totalImpuestos ?? 0;
  const descuentos = r?.descuentos ?? r?.descuentosTotal ?? 0;
  const total = r?.totalReserva ?? r?.montoTotalReserva ?? (subTotal + (impuestos || 0) - (descuentos || 0));
  const promo = r?.codigoPromocionalAplicado ?? r?.promocionAplicada?.codigo ?? null;
  const checkin = (r?.fechaCheckin || r?.fechaCheckIn || '').slice(0, 10);
  const checkout = (r?.fechaCheckout || r?.fechaCheckOut || '').slice(0, 10);

  const puedeCheckearse = ['PENDIENTE', 'CONFIRMADA', 'MODIFICADA'].includes(estado);
  const puedeCheckoutarse = ['CHECKED_IN', 'CHECKIN'].includes(estado);
  const puedeCancelarse = ['PENDIENTE', 'CONFIRMADA', 'MODIFICADA', 'EN_ESPERA'].includes(estado);
  const puedeModificarse = !['CHECKED_OUT', 'CANCELADA', 'NO_SHOW'].includes(estado);

  const handleCancelar = () => {
    if (!r?.id) return;
    try {
      const resultado = (ReservaService as any).cancelar
        ? (ReservaService as any).cancelar(r.id, {
            motivo: motivoCancelacion || 'Cancelación desde detalle reserva',
            usuarioId: USUARIO_ACTUAL.id,
            penalidad: 0,
          })
        : null;
      if (resultado?.error) {
        setErrorMsg(resultado.error);
        return;
      }
      cargar(r.id);
      setSuccessMsg('Reserva cancelada correctamente.');
      setConfirmarCancelarOpen(false);
      setMotivoCancelacion('');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al cancelar reserva.');
    }
  };

  const renderHistorial = () => {
    const historial: any[] = r?.historialCambios || [];
    if (historial.length === 0) return <IonNote>No hay cambios registrados aún.</IonNote>;
    return historial.map((hc: any, i: number) => (
      <IonItem key={i} lines={i === historial.length - 1 ? 'none' : 'full'}>
        <IonLabel>
          <h3 style={{ margin: 0 }}>{hc.tipoCambio || 'Cambio'}</h3>
          <p style={{ margin: 0 }}>
            {hc.usuario?.nombres ? `${hc.usuario.nombres} ${hc.usuario.apellidos || ''}` : `Usuario #${hc.usuarioId || USUARIO_ACTUAL.id}`}
            {' · '}{(hc.fecha || hc.createdAt || '').slice(0, 16).replace('T', ' ')}
          </p>
          {hc.notas && <p style={{ margin: 0 }}>{hc.notas}</p>}
        </IonLabel>
      </IonItem>
    ));
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/reservas" text="Reservas" icon={arrowBack} />
          </IonButtons>
          <IonTitle>Detalle Reserva #{r?.codigo || r?.codigoReserva || id}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={() => router.push('/reservas', 'back')}
              fill="clear"
              color="light"
              title="Cerrar y volver a la lista"
            >
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
            {puedeModificarse && (
              <IonButton disabled>
                <IonIcon icon={create} slot="icon-only" />
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {noEncontrada && (
          <IonCard>
            <IonCardContent>
              <IonItem color="danger">
                <IonIcon icon={alertCircle} slot="start" />
                <IonLabel>Reserva no encontrada. Verifica el ID/código.</IonLabel>
              </IonItem>
              <div style={{ marginTop: 16 }}>
                <IonButton expand="block" color="medium" routerLink="/reservas">
                  Volver a la lista
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {!noEncontrada && reserva && (
          <IonGrid style={{ padding: 16 }}>
            <IonRow>
              <IonCol size="12">
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>
                      #{r.codigo || r.codigoReserva}
                      {' '}
                      <IonBadge color={estadoColor[estado] || 'medium'} style={{ fontSize: 16, marginLeft: 8 }}>
                        {estadoLabel[estado].toUpperCase()}
                      </IonBadge>
                    </IonCardTitle>
                    <IonCardSubtitle>Origen: {(r.origen || '').toUpperCase()} · Creada: {(r.fechaCreacion || r.createdAt || '').slice(0, 10)}</IonCardSubtitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonRow>
                      <IonCol size="12" sizeMd="6">
                        <IonItem lines="none">
                          <IonIcon icon={person} color="medium" slot="start" />
                          <IonLabel>
                            <h2 style={{ margin: 0 }}>
                              {huesped ? `${huesped.nombres} ${huesped.apellidos}` : (r.huespedTitular?.nombres ? `${r.huespedTitular.nombres} ${r.huespedTitular.apellidos}` : `Titular #${r.huespedTitularId || r.huespedId}`)}
                            </h2>
                            {huesped && (
                              <IonNote>
                                {huesped.tipoDocumento} {huesped.numeroDocumento}
                                {huesped.telefonoCelular ? ` · ${huesped.telefonoCelular}` : ''}
                                {huesped.email ? ` · ${huesped.email}` : ''}
                              </IonNote>
                            )}
                          </IonLabel>
                        </IonItem>
                        <IonItem lines="none">
                          <IonIcon icon={bed} color="medium" slot="start" />
                          <IonLabel>
                            <h3 style={{ margin: 0 }}>{codHab}{habitacion ? ` · ${(habitacion as any).nombre || (habitacion as any).tipo?.nombre || ''}` : ''}</h3>
                            <IonNote>
                              {noches} noche{noches === 1 ? '' : 's'} · {pax} pax
                              {adultos ? ` (${adultos} A${ninos ? ` + ${ninos} N` : ''})` : ''}
                            </IonNote>
                          </IonLabel>
                        </IonItem>
                        <IonItem lines="none">
                          <IonIcon icon={calendar} color="medium" slot="start" />
                          <IonLabel>
                            <p style={{ margin: 0 }}>Check-in (15:00): {checkin}</p>
                            <p style={{ margin: 0 }}>Check-out (11:00): {checkout}</p>
                          </IonLabel>
                        </IonItem>
                      </IonCol>
                      <IonCol size="12" sizeMd="6">
                        <IonCard color="light">
                          <IonCardContent>
                            <h3 style={{ marginTop: 0 }}>
                              <IonIcon icon={pricetags} /> Resumen económico
                            </h3>
                            <IonItem lines="none">
                              <IonLabel>Subtotal alojamiento</IonLabel>
                              <h4 slot="end" style={{ margin: 0 }}>S/ {(Number(subTotal) || 0).toFixed(2)}</h4>
                            </IonItem>
                            <IonItem lines="none">
                              <IonLabel>Impuestos (IGV 18% + Selva 5%)</IonLabel>
                              <h4 slot="end" style={{ margin: 0 }}>S/ {(Number(impuestos) || 0).toFixed(2)}</h4>
                            </IonItem>
                            {promo && (
                              <IonItem lines="none" color="success">
                                <IonLabel>Descuento {promo}</IonLabel>
                                <h4 slot="end" style={{ margin: 0 }}>- S/ {(Number(descuentos) || 0).toFixed(2)}</h4>
                              </IonItem>
                            )}
                            <IonItem lines="none" color="primary">
                              <IonLabel>
                                <strong>TOTAL RESERVA</strong>
                              </IonLabel>
                              <h2 slot="end" style={{ margin: 0 }}>S/ {(Number(total) || 0).toFixed(2)}</h2>
                            </IonItem>
                            <div style={{ marginTop: 12 }}>
                              {folioVinculado ? (
                                (() => {
                                  const fAny = folioVinculado as any;
                                  let totalCargosFolio = 0;
                                  let totalPagosFolio = 0;
                                  let cargosPosCount = 0;
                                  let cargosPosMonto = 0;
                                  try {
                                    const cargos = Array.isArray(fAny.cargos) ? fAny.cargos : (CargoFolioService && typeof CargoFolioService.listarPorFolio === 'function' ? CargoFolioService.listarPorFolio(fAny.id) : []);
                                    for (const c of (cargos || []) as any[]) {
                                      const m = Number(((((c.total ?? c.monto) ?? c.montoTotal) ?? c.totalLinea) ?? c.importeTotal) ?? 0) ?? 0;
                                      totalCargosFolio += m;
                                      if (String(c.origenCargo ?? c.origen ?? c.tipoConcepto ?? '').toUpperCase().includes('ROOM') || String(c.tipoConcepto ?? c.origen ?? '').toUpperCase().includes('SERVICE') || String(c.categoriaConcepto ?? '').toUpperCase().includes('COCINA') || String(c.categoriaConcepto ?? '').toUpperCase().includes('BAR') || String(c.usuarioRegistroId ?? '').startsWith('USR-MOISES')) {
                                        cargosPosCount += 1;
                                        cargosPosMonto += m;
                                      }
                                    }
                                  } catch {}
                                  try {
                                    const pagos = Array.isArray(fAny.pagos) ? fAny.pagos : (PagoFolioService && typeof PagoFolioService.listarPorFolio === 'function' ? PagoFolioService.listarPorFolio(fAny.id) : []);
                                    for (const p of (pagos || []) as any[]) {
                                      totalPagosFolio += Number((p.monto ?? p.montoPagado ?? p.importePago) ?? 0) ?? 0;
                                    }
                                  } catch {}
                                  totalCargosFolio = Math.max(totalCargosFolio, ((Number((fAny as any).totalCargos) ?? Number((fAny as any).totalFolio)) ?? Number(total)) ?? 0);
                                  totalPagosFolio = Math.max(totalPagosFolio, ((Number((fAny as any).totalPagos) ?? Number((fAny as any).totalPagado)) ?? Number((r as any).montoPagadoAnticipado ?? (r as any).pagoAdelanto)) ?? 0);
                                  const saldoFinal = Number(Math.max(0, ((totalCargosFolio ?? 0) - (totalPagosFolio ?? 0))) ?? 0);
                                  const codCorto = String(((fAny as any).codigo ?? (fAny as any).numeroFolio) ?? fAny.id).replace(/^FOL[-_]?/i, 'F-').replace(/^RES[-_]?/i, 'R-').slice(-8);
                                  return (
                                    <div>
                                      <IonChip
                                        color="warning"
                                        outline
                                        onClick={() => router.push(`/folio/${fAny.id}`)}
                                        style={{
                                          cursor: 'pointer',
                                          padding: '10px 14px',
                                          border: '1px solid #d97706',
                                          fontWeight: 700,
                                          fontSize: 14,
                                          background: '#fffbeb',
                                          height: 'auto',
                                          minHeight: '48px',
                                        }}
                                      >
                                        <IonIcon icon={documentText} />
                                        👉 Folio {codCorto} · Clic aquí VER CUENTA GENERAL · Saldo pendiente S/ {saldoFinal.toFixed(2)}
                                      </IonChip>
                                      {cargosPosCount > 0 && (
                                        <div style={{ marginTop: 8, padding: '8px 12px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#065f46' }}>
                                          🚀 Cargos POS agregados recientemente: <strong>{cargosPosCount}</strong> item(s) = <strong>S/ {Number(cargosPosMonto).toFixed(2)}</strong> (Room Service / Bebidas / Cocina).
                                        </div>
                                      )}
                                      <div style={{ marginTop: 6, fontSize: 12, color: '#4b5563' }}>
                                        Total cargos (alojamiento + extras): S/ {totalCargosFolio.toFixed(2)} · Pagos/Adelantos: S/ {totalPagosFolio.toFixed(2)}
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : (
                                <IonNote>Sin folio abierto (se creará automáticamente al hacer Check-in).</IonNote>
                              )}
                            </div>
                          </IonCardContent>
                        </IonCard>
                      </IonCol>
                    </IonRow>

                    {successMsg && (
                      <IonItem color="success">
                        <IonIcon icon={checkmarkCircle} slot="start" />
                        <IonLabel>{successMsg}</IonLabel>
                      </IonItem>
                    )}
                    {errorMsg && (
                      <IonItem color="danger">
                        <IonIcon icon={alertCircle} slot="start" />
                        <IonLabel>{errorMsg}</IonLabel>
                      </IonItem>
                    )}

                    <IonRow style={{ marginTop: 12 }}>
                      <IonCol size="12" sizeMd="3">
                        <IonButton
                          expand="block"
                          color="success"
                          disabled={!puedeCheckearse}
                          onClick={() => {
                            setCheckinOpen(true);
                          }}
                        >
                          <IonIcon icon={logIn} slot="start" />
                          {puedeCheckearse ? 'CHECK-IN' : 'Ya en Check-in'}
                        </IonButton>
                      </IonCol>
                      <IonCol size="12" sizeMd="3">
                        <IonButton
                          expand="block"
                          color="primary"
                          disabled={!puedeCheckoutarse}
                          onClick={() => {
                            if (puedeCheckoutarse) setCheckoutOpen(true);
                          }}
                        >
                          <IonIcon icon={cash} slot="start" />
                          CHECK-OUT
                        </IonButton>
                      </IonCol>
                      <IonCol size="12" sizeMd="3">
                        <IonButton
                          expand="block"
                          color="secondary"
                          disabled={!puedeModificarse}
                          onClick={() => {
                            presentToast({
                              message: '🛠️ Funcionalidad "Modificar Reserva" próximamente. Por ahora edita manualmente desde Nueva Reserva si deseas actualizar datos.',
                              duration: 2800,
                              color: 'warning',
                              position: 'top',
                            });
                          }}
                        >
                          <IonIcon icon={create} slot="start" />
                          MODIFICAR
                        </IonButton>
                      </IonCol>
                      <IonCol size="12" sizeMd="3">
                        <IonButton
                          expand="block"
                          color="danger"
                          disabled={!puedeCancelarse}
                          onClick={() => {
                            setConfirmarCancelarOpen(true);
                          }}
                        >
                          <IonIcon icon={trash} slot="start" />
                          CANCELAR
                        </IonButton>
                      </IonCol>
                    </IonRow>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>

            <IonRow>
              <IonCol size="12" sizeMd="6">
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Historial de cambios</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonList>{renderHistorial()}</IonList>
                  </IonCardContent>
                </IonCard>
              </IonCol>
              <IonCol size="12" sizeMd="6">
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Notas y observaciones</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonList>
                      <IonItem lines="none">
                        <IonLabel>
                          <p style={{ margin: 0 }}><strong>Notas internas:</strong></p>
                          <p style={{ margin: 0 }}>{r.notasInternas || '—'}</p>
                        </IonLabel>
                      </IonItem>
                      <IonItem lines="none">
                        <IonLabel>
                          <p style={{ margin: 0 }}><strong>Observaciones huésped:</strong></p>
                          <p style={{ margin: 0 }}>{r.observacionesHuesped || '—'}</p>
                        </IonLabel>
                      </IonItem>
                      <IonItem lines="none">
                        <IonLabel>
                          <p style={{ margin: 0 }}><strong>Política cancelación:</strong></p>
                          <p style={{ margin: 0 }}>
                            {r.politicaCancelacion?.nombre || (r.politicaCancelacionId ? `ID #${r.politicaCancelacionId}` : 'Estándar')}
                          </p>
                        </IonLabel>
                      </IonItem>
                    </IonList>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>
        )}

        <IonAlert
          isOpen={confirmarCancelarOpen}
          onDidDismiss={() => setConfirmarCancelarOpen(false)}
          header="¿Cancelar reserva?"
          subHeader={`${r?.codigo || r?.codigoReserva || ''} · ${huesped ? `${huesped.nombres} ${huesped.apellidos}` : ''}`}
          message="Confirma que deseas cancelar. Según la política de cancelación podría generarse una multa."
          inputs={[
            {
              name: 'motivo',
              type: 'textarea',
              placeholder: 'Motivo de cancelación (opcional)',
              value: motivoCancelacion,
            },
          ]}
          buttons={[
            {
              text: 'Volver',
              role: 'cancel',
              handler: () => setConfirmarCancelarOpen(false),
            },
            {
              text: 'SÍ, CANCELAR RESERVA',
              role: 'destructive',
              handler: (data) => {
                setMotivoCancelacion(data?.motivo || '');
                handleCancelar();
              },
            },
          ]}
        />

        <CheckinModal
          isOpen={checkinOpen}
          onDidDismiss={() => {
            setCheckinOpen(false);
            if (r?.id) cargar(r.id);
            else if (id) cargar(id);
          }}
          reservaId={r?.id || id || null}
          usuarioActual={USUARIO_ACTUAL}
        />

        <CheckoutModal
          isOpen={checkoutOpen}
          onDismiss={() => {
            setCheckoutOpen(false);
            if (r?.id) cargar(r.id);
            else if (id) cargar(id);
          }}
          reservaId={r?.id || id || ''}
        />
      </IonContent>
    </IonPage>
  );
};

export default ReservaDetalle;
export { ReservaDetalle };
