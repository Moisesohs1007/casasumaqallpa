import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader,
  IonCardSubtitle, IonCardTitle, IonCol, IonContent, IonGrid, IonHeader, IonIcon,
  IonItem, IonItemDivider, IonLabel, IonList, IonNote, IonPage, IonRow, IonTitle,
  IonToolbar, IonBadge, IonChip, IonSegment, IonSegmentButton, useIonViewWillEnter,
  useIonRouter, useIonToast, IonFooter,
} from '@ionic/react';
import {
  arrowBack, documentText, bed, person, calendar, pricetags, alertCircle, logIn,
  checkmarkCircle, cash, closeOutline, restaurant, bedOutline, car, build,
  sparkle, card, wallet,
} from 'ionicons/icons';
import type { Color } from '@ionic/core';
import type {
  CargoFolio, Folio, PagoFolio, EstadoFolio, OrigenCargoFolio, TipoConceptoFolio,
} from '../../types';
import { FolioService } from '../../services';

const USUARIO_ACTUAL = { id: 'USR-MOISES-0001', nombres: 'Moisés', apellidos: 'Ochoa' };

const estadoFolioColor: Record<EstadoFolio, Color> = {
  ABIERTO: 'success',
  PENDIENTE_COBRO: 'warning',
  CERRADO: 'medium',
  ANULADO: 'danger',
};
const estadoFolioLabel: Record<EstadoFolio, string> = {
  ABIERTO: 'ABIERTO',
  PENDIENTE_COBRO: 'PENDIENTE COBRO',
  CERRADO: 'CERRADO',
  ANULADO: 'ANULADO',
};

const conceptoColor: Record<TipoConceptoFolio | string, Color> = {
  ALOJAMIENTO: 'tertiary',
  COMIDA_BEBIDA: 'warning',
  TOUR: 'primary',
  TRASLADO: 'secondary',
  SPA: 'success',
  LAVANDERIA: 'warning',
  LLAMADA_TELEFONICA: 'medium',
  INTERNET_EXTRA: 'medium',
  MINIBAR: 'warning',
  AMENITIES: 'tertiary',
  MASCOTA: 'warning',
  GARANTIA_DEPOSITO: 'secondary',
  AJUSTE: 'danger',
  DESCUENTO: 'success',
  CARGO_MANUAL: 'danger',
  CORTECIA: 'primary',
  IMPUESTO: 'warning',
  OTRO: 'medium',
  CONSUMO_POS: 'warning',
};

const conceptoEmoji = (c: TipoConceptoFolio | OrigenCargoFolio | string) => {
  if (c === 'ALOJAMIENTO') return '🏨';
  if (c === 'COMIDA_BEBIDA' || c === 'ROOM_SERVICE' || c === 'POS_COMIDA_BEBIDA' || c === 'CONSUMO_POS') return '🍽️';
  if (c === 'TOUR') return '🗺️';
  if (c === 'TRASLADO') return '🚐';
  if (c === 'SPA') return '💆';
  if (c === 'LAVANDERIA') return '🧺';
  if (c === 'MINIBAR') return '🍾';
  if (c === 'AJUSTE') return '⚙️';
  if (c === 'DESCUENTO') return '🎟️';
  if (c === 'CORTECIA' || c === 'CORTESIA') return '🎁';
  if (c === 'IMPUESTO') return '🧾';
  if (c === 'AUTO_NOCHE_ALOJAMIENTO') return '🌙';
  if (c === 'MANUAL_RECEPCION') return '✍️';
  return '📦';
};

const metodoPagoEmoji = (m: string) => {
  if (!m) return '💸';
  const x = String(m).toUpperCase();
  if (x.includes('EFECTIVO')) return '💵';
  if (x.includes('TARJETA') || x.includes('DEBITO') || x.includes('CREDITO')) return '💳';
  if (x.includes('YAPE')) return '📱';
  if (x.includes('PLIN')) return '📲';
  if (x.includes('TRANSFER') || x.includes('BANCAR')) return '🏦';
  if (x.includes('PAYPAL')) return '🅿️';
  if (x.includes('CORTESIA')) return '🎁';
  if (x.includes('ANTICIPO')) return '💰';
  return '💸';
};

const fmtFecha = (iso: string | undefined | null) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '—';
  }
};

const Folio: React.FC = () => {
  const router = useIonRouter();
  const { id } = useParams<{ id: string }>();
  const [folio, setFolio] = useState<Folio | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [tab, setTab] = useState<'cargos' | 'pagos'>('cargos');
  const [presentToast] = useIonToast();

  const cargar = (folioId: string) => {
    try {
      const listado = (FolioService as any).listarTodos ? (FolioService as any).listarTodos() : [];
      let f: Folio | any = (FolioService as any).buscarPorId?.(folioId) || null;
      if (!f) {
        f = listado.find((x: any) =>
          x.id === folioId ||
          x.codigo === folioId ||
          (x as any).numeroFolio === folioId ||
          (x as any).codigoFolio === folioId
        ) || null;
      }
      if (!f) {
        setFolio(null); setNoEncontrado(true); return;
      }
      try { FolioService.recalcularTotales?.(f.id); } catch {}
      const f2: any = (FolioService as any).buscarPorId?.(f.id) || f;
      setFolio({ ...f2, cargos: f2.cargos || [], pagos: f2.pagos || [] } as Folio);
      setNoEncontrado(false);
    } catch (e) {
      setFolio(null); setNoEncontrado(true);
    }
  };

  useIonViewWillEnter(() => {
    if (id) cargar(id);
  });

  const f: any = folio;
  const cargos: CargoFolio[] = (f?.cargos || []) as any[];
  const pagos: PagoFolio[] = (f?.pagos || []) as any[];
  const estado: EstadoFolio = (f?.estado || 'ABIERTO') as EstadoFolio;

  const subTotalCargos = cargos.reduce((s, c) => s + Number((c as any).subtotal || 0), 0);
  const igv18 = cargos.reduce((s, c) => {
    const arr = (c as any).impuestosMontoDesglosado || [];
    const i = arr.find((x: any) => String(x.impuestoId || x.impuestoNombre || '').includes('IGV') && !String(x.impuestoId || x.impuestoNombre || '').includes('Selva'));
    return s + Number(i?.montoImpuesto || 0);
  }, 0);
  const igv5 = cargos.reduce((s, c) => {
    const arr = (c as any).impuestosMontoDesglosado || [];
    const i = arr.find((x: any) => String(x.impuestoId || x.impuestoNombre || '').includes('Selva') || String(x.impuestoId || x.impuestoNombre || '').includes('SELVA'));
    return s + Number(i?.montoImpuesto || 0);
  }, 0);
  const descuentosTot = cargos.reduce((s, c) =>
    s + ((c as any).descuentosMontoDesglosado || []).reduce((s2: number, x: any) => s2 + Number(x.montoDescuento || 0), 0), 0);
  const totalCargos = cargos.reduce((s, c) => s + Number((c as any).total || (c as any).monto || 0), 0);
  const totalPagos = pagos.reduce((s, p) => s + Number((p as any).monto || (p as any).total || (p as any).montoAplicado || 0), 0);
  const adelantoAloj = Number((f as any).pagosAplicados || (f as any).pagoAdelanto || (f as any).pagoAnticipadoMonto || 0);
  const pagosTot = Math.max(totalPagos, adelantoAloj);
  const totalFolio = Number((f as any).totalFolio || f?.totalPeriodo || totalCargos || 0);
  const saldo = Number((totalFolio - pagosTot).toFixed(2));

  const codHab = (f as any).habitacion?.codigo || (f as any).habitacionCodigo || (f as any).habitacionId || '—';
  const habNombre = (f as any).habitacion?.tipoNombre || (f as any).habitacion?.nombre || '';
  const huespedNombres = (f as any).huesped?.nombres || (f as any).huesped?.nombreCompleto || (f as any).huespedTitular?.nombres || '';
  const huespedDni = (f as any).huesped?.numeroDocumento || (f as any).huesped?.dni || (f as any).huespedTitular?.numeroDocumento || '';
  const folioCodigo = f?.codigo || (f as any).numeroFolio || (f as any).codigoFolio || id || '';
  const fechaApertura = f?.fechaApertura || (f as any).fechaInicio || '';
  const reservaCodigo = f?.reservaId ? `#${String(f.reservaId).replace(/^RES-/, '')}` : (f as any).reserva?.codigo ? `#${String((f as any).reserva.codigo)}` : '';

  const fmt = (n: number) => `S/ ${Number(n || 0).toFixed(2)}`;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="success">
          <IonButtons slot="start">
            <IonButton onClick={() => router.back()}>
              <IonIcon slot="icon-only" icon={arrowBack} />
            </IonButton>
          </IonButtons>
          <IonTitle>
            📄 Detalle Folio · {folioCodigo || '—'}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => router.back()}>
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding-vertical" style={{ background: '#f1f5f2' }}>
        <IonGrid>
          <IonRow class="ion-justify-content-center ion-padding-start ion-padding-end ion-padding-bottom">
            <IonCol size="12" size-lg="10" size-xl="8">
              {/* INFO CARD */}
              <IonCard style={{ borderRadius: 20, border: '1px solid #e4efea' }}>
                <IonCardHeader style={{ paddingBottom: 8 }}>
                  <IonCardTitle style={{ fontSize: 19, fontWeight: 800, color: '#1b5e20' }}>
                    Cuenta general del huésped
                  </IonCardTitle>
                  <IonCardSubtitle>
                    {reservaCodigo && <>📅 Reserva {reservaCodigo} · </>}
                    📆 Apertura: {fmtFecha(fechaApertura)}
                  </IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent style={{ paddingTop: 0 }}>
                  <IonList lines="none" class="ion-no-padding">
                    <IonItem class="ion-no-padding" lines="none">
                      <IonIcon icon={documentText} slot="start" color="success" style={{ fontSize: 22 }} />
                      <IonLabel style={{ marginLeft: -6 }}>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>Folio</div>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>{folioCodigo || id}</div>
                      </IonLabel>
                      <IonBadge color={estadoFolioColor[estado]} style={{ fontSize: 12, padding: '4px 12px' }}>
                        {estadoFolioLabel[estado]}
                      </IonBadge>
                    </IonItem>
                    <IonItem class="ion-no-padding" lines="none">
                      <IonIcon icon={bed} slot="start" color="tertiary" style={{ fontSize: 20 }} />
                      <IonLabel style={{ marginLeft: -6 }}>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>Habitación</div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {codHab}{habNombre && <> · <IonNote style={{ fontSize: 12 }}>{habNombre}</IonNote></>}
                        </div>
                      </IonLabel>
                    </IonItem>
                    <IonItem class="ion-no-padding" lines="none">
                      <IonIcon icon={person} slot="start" color="primary" style={{ fontSize: 20 }} />
                      <IonLabel style={{ marginLeft: -6 }}>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>Huésped titular</div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {huespedNombres || 'Registro manual'}
                          {huespedDni && <> <IonNote style={{ fontSize: 12 }}>· {huespedDni}</IonNote></>}
                        </div>
                      </IonLabel>
                    </IonItem>
                  </IonList>
                </IonCardContent>
              </IonCard>

              {/* TABS */}
              <IonSegment value={tab} onIonChange={(e) => setTab(e.detail.value as any)} style={{ margin: '0 4px 14px 4px' }}>
                <IonSegmentButton value="cargos">
                  <IonLabel style={{ fontWeight: 700 }}>🧾 Cargos ({cargos.length})</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="pagos">
                  <IonLabel style={{ fontWeight: 700 }}>💳 Pagos ({pagos.length})</IonLabel>
                </IonSegmentButton>
              </IonSegment>

              {/* TAB CARGOS */}
              {tab === 'cargos' && (
                <IonCard style={{ borderRadius: 20, border: '1px solid #e4efea' }}>
                  <IonCardContent class="ion-no-padding">
                    {cargos.length === 0 ? (
                      <IonItemDivider color="light" style={{ padding: '22px 16px', borderRadius: 18 }}>
                        <IonLabel className="ion-text-center" style={{ fontSize: 13, color: '#6b7280' }}>
                          🧾 Aún no hay cargos en este folio.
                        </IonLabel>
                      </IonItemDivider>
                    ) : (
                      <IonList lines="full">
                        {cargos.map((c: any, idx: number) => {
                          const tipo = c.tipoConcepto || (c as any).tipo || (c as any).origenCargo || 'OTRO';
                          const color: Color = (conceptoColor as any)[tipo] || 'medium';
                          const imp18 = ((c as any).impuestosMontoDesglosado || []).find((x: any) =>
                            String(x.impuestoId || x.impuestoNombre || '').includes('IGV') &&
                            !String(x.impuestoId || x.impuestoNombre || '').includes('Selva')
                          )?.montoImpuesto || 0;
                          const imp5 = ((c as any).impuestosMontoDesglosado || []).find((x: any) =>
                            String(x.impuestoId || x.impuestoNombre || '').includes('Selva') ||
                            String(x.impuestoId || x.impuestoNombre || '').includes('SELVA')
                          )?.montoImpuesto || 0;
                          const tot = Number((c as any).total || (c as any).monto || 0);
                          const cant = Number(c.cantidad || 1);
                          const pu = Number(c.precioUnitario || (tot / (cant || 1)));
                          const subt = Number((c as any).subtotal || (pu * cant));
                          const usuario = (c as any).nombreUsuarioAplicaCargo || (c as any).usuarioRegistroId || (c as any).createdBy || '';
                          return (
                            <React.Fragment key={c.id || idx}>
                              {idx > 0 && <IonItemDivider color="light" style={{ minHeight: 6 }} />}
                              <IonItem style={{ '--padding-start': 14, '--inner-padding-end': 10 }}>
                                <IonLabel style={{ display: 'block' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div style={{ marginBottom: 6 }}>
                                        <IonBadge color={color} style={{ fontSize: 10.5, padding: '2px 10px', marginRight: 8 }}>
                                          {conceptoEmoji(tipo)} {String(tipo).replace(/_/g, ' ').substring(0, 24)}
                                        </IonBadge>
                                        <IonNote style={{ fontSize: 11.5 }}>
                                          📆 {fmtFecha(c.fechaCargo || c.createdAt)}
                                        </IonNote>
                                      </div>
                                      <div style={{ fontWeight: 800, fontSize: 14.5, color: '#1f2937', marginBottom: 4, wordBreak: 'break-word' }}>
                                        {c.concepto || 'Cargo manual'}
                                      </div>
                                      {c.cantidad > 0 && (
                                        <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 3 }}>
                                          🧮 {cant} × {fmt(pu)} = {fmt(subt)}
                                        </div>
                                      )}
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                                        <IonChip color="warning" outline style={{ fontSize: 11, padding: 0, '--padding-start': 10, '--padding-end': 10, height: 24 }}>
                                          IGV18 {fmt(Number(imp18))}
                                        </IonChip>
                                        <IonChip color="tertiary" outline style={{ fontSize: 11, padding: 0, '--padding-start': 10, '--padding-end': 10, height: 24 }}>
                                          SELVA5 {fmt(Number(imp5))}
                                        </IonChip>
                                      </div>
                                      {c.descripcion && (
                                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, fontStyle: 'italic' }}>
                                          📝 {String(c.descripcion).substring(0, 90)}
                                        </div>
                                      )}
                                      <div style={{ fontSize: 11.5, color: '#9ca3af' }}>
                                        👤 Registrado por: <strong>{usuario || 'Sistema'}</strong>
                                      </div>
                                    </div>
                                    <div style={{ textAlign: 'right', minWidth: 80 }}>
                                      <div style={{ fontWeight: 900, fontSize: 16, color: '#1f2937' }}>
                                        {fmt(tot)}
                                      </div>
                                      {c.esAnulado || c.anulado ? (
                                        <IonBadge color="danger" style={{ marginTop: 4, fontSize: 10 }}>ANULADO</IonBadge>
                                      ) : (cargoAutoColor(c, idx))}
                                    </div>
                                  </div>
                                </IonLabel>
                              </IonItem>
                            </React.Fragment>
                          );
                        })}
                      </IonList>
                    )}
                  </IonCardContent>
                </IonCard>
              )}

              {/* TAB PAGOS */}
              {tab === 'pagos' && (
                <IonCard style={{ borderRadius: 20, border: '1px solid #e4efea' }}>
                  <IonCardContent class="ion-no-padding">
                    {pagos.length === 0 && pagosTot === 0 ? (
                      <IonItemDivider color="light" style={{ padding: '22px 16px', borderRadius: 18 }}>
                        <IonLabel className="ion-text-center" style={{ fontSize: 13, color: '#6b7280' }}>
                          💳 Aún no hay pagos registrados.
                        </IonLabel>
                      </IonItemDivider>
                    ) : (
                      <IonList lines="full">
                        {pagosTot > 0 && pagos.length === 0 && (
                          <>
                            <IonItem style={{ '--padding-start': 14, '--inner-padding-end': 10 }}>
                              <IonLabel>
                                <div style={{ marginBottom: 4 }}>
                                  <IonBadge color="success" style={{ fontSize: 10.5, padding: '2px 10px', marginRight: 8 }}>💰 PAGO ADELANTADO</IonBadge>
                                  <IonNote style={{ fontSize: 11.5 }}>📆 {fmtFecha(fechaApertura)}</IonNote>
                                </div>
                                <div style={{ fontWeight: 800, fontSize: 14.5 }}>Check-in · Pago adelantado Alojamiento</div>
                                <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 2 }}>👤 {USUARIO_ACTUAL.nombres} {USUARIO_ACTUAL.apellidos}</div>
                              </IonLabel>
                              <div slot="end" style={{ textAlign: 'right', fontWeight: 900, fontSize: 16, color: '#059669' }}>
                                {fmt(pagosTot)}
                              </div>
                            </IonItem>
                          </>
                        )}
                        {pagos.map((p: any, idx: number) => {
                          const m = String(p.metodoPago || p.formaPago || 'OTRO');
                          const tot = Number(p.monto || p.total || p.montoAplicado || 0);
                          const usr = (p as any).usuarioIdCobro || p.createdBy || (p as any).usuarioRegistroId || '';
                          const comp = (p as any).comprobanteNumero || (p as any).numeroComprobante || '';
                          return (
                            <React.Fragment key={p.id || idx}>
                              {idx > 0 && <IonItemDivider color="light" style={{ minHeight: 6 }} />}
                              <IonItem style={{ '--padding-start': 14, '--inner-padding-end': 10 }}>
                                <IonLabel>
                                  <div style={{ marginBottom: 4 }}>
                                    <IonBadge color="success" style={{ fontSize: 10.5, padding: '2px 10px', marginRight: 8 }}>
                                      {metodoPagoEmoji(m)} {m.replace(/_/g, ' ').substring(0, 22)}
                                    </IonBadge>
                                    <IonNote style={{ fontSize: 11.5 }}>
                                      📆 {fmtFecha(p.fechaHoraCobro || p.fechaPago || p.createdAt)}
                                    </IonNote>
                                  </div>
                                  <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 3 }}>
                                    {p.tipoConcepto ? `⚖️ ${p.tipoConcepto}` : `💳 Pago ${m.replace(/_/g, ' ')}`}
                                  </div>
                                  {comp && (
                                    <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 3 }}>🧾 Comprobante N° {comp}</div>
                                  )}
                                  {p.observaciones && (
                                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2, fontStyle: 'italic' }}>
                                      📝 {String(p.observaciones).substring(0, 90)}
                                    </div>
                                  )}
                                  <div style={{ fontSize: 11.5, color: '#9ca3af' }}>
                                    👤 {usr || 'Recepción'}
                                  </div>
                                </IonLabel>
                                <div slot="end" style={{ textAlign: 'right', fontWeight: 900, fontSize: 16, color: '#059669' }}>
                                  {fmt(tot)}
                                </div>
                              </IonItem>
                            </React.Fragment>
                          );
                        })}
                      </IonList>
                    )}
                  </IonCardContent>
                </IonCard>
              )}

              {/* RESUMEN TOTALES */}
              <IonCard style={{ borderRadius: 20, border: '2px solid #1b5e20', marginBottom: 120 }}>
                <IonCardHeader style={{ paddingBottom: 6 }}>
                  <IonCardTitle style={{ fontSize: 16, fontWeight: 800, color: '#1b5e20' }}>
                    📊 Resumen Económico
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent style={{ paddingTop: 2 }}>
                  <IonList lines="none" class="ion-no-padding">
                    <IonItem lines="none" class="ion-no-padding">
                      <IonLabel>Subtotal sin impuestos</IonLabel>
                      <div slot="end" style={{ fontWeight: 600 }}>{fmt(subTotalCargos)}</div>
                    </IonItem>
                    <IonItem lines="none" class="ion-no-padding">
                      <IonLabel>
                        <IonBadge color="warning" style={{ fontSize: 10, marginRight: 6 }}>IGV 18%</IonBadge>
                        Impuesto General Ventas
                      </IonLabel>
                      <div slot="end" style={{ fontWeight: 600 }}>{fmt(igv18)}</div>
                    </IonItem>
                    <IonItem lines="none" class="ion-no-padding">
                      <IonLabel>
                        <IonBadge color="tertiary" style={{ fontSize: 10, marginRight: 6 }}>SELVA 5%</IonBadge>
                        IGV Zona Selva
                      </IonLabel>
                      <div slot="end" style={{ fontWeight: 600 }}>{fmt(igv5)}</div>
                    </IonItem>
                    {descuentosTot > 0 && (
                      <IonItem lines="none" class="ion-no-padding">
                        <IonLabel>🎟️ Descuentos Aplicados</IonLabel>
                        <div slot="end" style={{ fontWeight: 700, color: '#059669' }}>- {fmt(descuentosTot)}</div>
                      </IonItem>
                    )}
                    <IonItemDivider color="light" style={{ marginTop: 4, marginBottom: 4, minHeight: 2 }} />
                    <IonItem lines="none" class="ion-no-padding">
                      <IonLabel style={{ fontWeight: 700, fontSize: 14 }}>💲 TOTAL FOLIO</IonLabel>
                      <div slot="end" style={{ fontWeight: 900, fontSize: 18, color: '#1b5e20' }}>{fmt(totalFolio)}</div>
                    </IonItem>
                    {pagosTot > 0 && (
                      <IonItem lines="none" class="ion-no-padding">
                        <IonLabel style={{ fontWeight: 700 }}>💰 Pagos / Adelantos</IonLabel>
                        <div slot="end" style={{ fontWeight: 800, color: '#059669' }}>- {fmt(pagosTot)}</div>
                      </IonItem>
                    )}
                    <IonItemDivider color="dark" style={{ minHeight: 2 }} />
                    <IonItem lines="none" class="ion-no-padding" style={{ paddingTop: 8 }}>
                      <IonLabel style={{ fontWeight: 900, fontSize: 17 }}>
                        🧾 Saldo Pendiente
                      </IonLabel>
                      <div slot="end" style={{
                        fontWeight: 900, fontSize: 22,
                        color: saldo > 0 ? '#dc2626' : '#059669',
                        textAlign: 'right',
                      }}>
                        {fmt(saldo)}
                      </div>
                    </IonItem>
                    {saldo === 0 && (
                      <div style={{ textAlign: 'center', paddingTop: 4 }}>
                        <IonBadge color="success" style={{ fontSize: 13, padding: '6px 16px' }}>
                          <IonIcon icon={checkmarkCircle} style={{ marginRight: 4 }} />
                          PAGADO · FOLIO SALDADO
                        </IonBadge>
                      </div>
                    )}
                  </IonList>
                </IonCardContent>
              </IonCard>

              {noEncontrado && (
                <IonCard color="danger" style={{ borderRadius: 18 }}>
                  <IonCardContent>
                    <div className="ion-text-center" style={{ color: '#fff', fontWeight: 700 }}>
                      <IonIcon icon={alertCircle} style={{ fontSize: 36 }} />
                      <div style={{ marginTop: 8 }}>Folio {id} no encontrado.</div>
                    </div>
                  </IonCardContent>
                </IonCard>
              )}
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>

      <IonFooter style={{ background: 'transparent' }}>
        <IonToolbar style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '8px 14px' }}>
          <IonButtons slot="start">
            <IonButton fill="outline" color="medium" onClick={() => router.back()}>
              <IonIcon slot="start" icon={arrowBack} /> Volver
            </IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton color={saldo > 0 ? 'warning' : 'success'} onClick={() => presentToast({
              message: saldo > 0
                ? `💰 Saldo pendiente ${fmt(saldo)} · Ir a CHECK-OUT para cerrar folio.`
                : `✅ Folio saldado correctamente ${fmt(totalFolio)}.`,
              duration: 2200,
              color: saldo > 0 ? 'warning' : 'success',
            })}>
              <IonIcon slot="start" icon={saldo > 0 ? cash : checkmarkCircle} />
              {saldo > 0 ? `Saldo ${fmt(saldo)}` : 'Folio Saldado'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

const cargoAutoColor = (c: any, _idx: number) => {
  const origen = String(c.origenCargo || '').toUpperCase();
  if (origen.includes('ROOM')) return <IonBadge color="success" style={{ marginTop: 4, fontSize: 10 }}>🚀 CARGO AUTO</IonBadge>;
  if (origen.includes('POS')) return <IonBadge color="warning" style={{ marginTop: 4, fontSize: 10 }}>🍽️ POS</IonBadge>;
  if (origen.includes('ALOJAMIENTO') || origen.includes('NOCHE')) return <IonBadge color="tertiary" style={{ marginTop: 4, fontSize: 10 }}>🌙 ALOJ</IonBadge>;
  if (String(c.tipoConcepto || '').toUpperCase().includes('ALOJ')) return <IonBadge color="tertiary" style={{ marginTop: 4, fontSize: 10 }}>🌙 ALOJ</IonBadge>;
  return <IonBadge color="medium" style={{ marginTop: 4, fontSize: 10 }}>✍️ MANUAL</IonBadge>;
};

export default Folio;
