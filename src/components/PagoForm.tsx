import React, { useState } from 'react';
import {
  IonItem, IonLabel, IonSelect, IonSelectOption, IonInput, IonGrid, IonRow, IonCol, IonButton,
} from '@ionic/react';
import { METODOS_PAGO_LISTA, MetodoPago, OpcionMetodoPago } from '../types/etapa2';

export interface PagoFormValue {
  metodoPago: MetodoPago;
  monto: number;
  moneda: 'PEN' | 'USD';
  referencia?: string;
  observaciones?: string;
  codigoAutorizacion?: string;
}

interface Props {
  value?: PagoFormValue;
  totalSugeridoSoles?: number;
  onChange?: (v: PagoFormValue) => void;
  compacto?: boolean;
}

export const PagoForm: React.FC<Props> = ({ value, totalSugeridoSoles, onChange, compacto }) => {
  const [v, setV] = useState<PagoFormValue>(value || {
    metodoPago: 'EFECTIVO_PEN',
    monto: totalSugeridoSoles || 0,
    moneda: 'PEN',
    referencia: '',
    observaciones: '',
    codigoAutorizacion: '',
  });

  const metodoActivo: OpcionMetodoPago | undefined = METODOS_PAGO_LISTA.find(m => m.id === v.metodoPago);
  const requiereReferencia = !!metodoActivo?.requiereReferencia;

  const set = <K extends keyof PagoFormValue>(k: K, val: PagoFormValue[K]) => {
    const nv = { ...v, [k]: val };
    setV(nv);
    onChange?.(nv);
  };

  return (
    <div className={`pago-form ${compacto ? 'pago-form-compact' : ''}`}>
      <IonGrid>
        <IonRow>
          <IonCol size="12">
            <IonItem lines="full">
              <IonLabel position="stacked">Medio de pago</IonLabel>
              <IonSelect value={v.metodoPago} onIonChange={e => set('metodoPago', e.detail.value as MetodoPago)} interface="action-sheet">
                {METODOS_PAGO_LISTA.map(m => (
                  <IonSelectOption key={m.id} value={m.id}>{m.label}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          </IonCol>
          <IonCol size="6">
            <IonItem lines="full">
              <IonLabel position="stacked">Monto (S/)</IonLabel>
              <IonInput type="number" inputmode="decimal" value={v.monto || ''}
                onIonChange={e => set('monto', Number(e.detail.value || 0))} />
            </IonItem>
          </IonCol>
          <IonCol size="6">
            <IonItem lines="full">
              <IonLabel position="stacked">Moneda</IonLabel>
              <IonSelect value={v.moneda} onIonChange={e => set('moneda', e.detail.value as any)}>
                <IonSelectOption value="PEN">PEN (S/)</IonSelectOption>
                <IonSelectOption value="USD">USD ($)</IonSelectOption>
              </IonSelect>
            </IonItem>
          </IonCol>
          {requiereReferencia && (
            <IonCol size="12">
              <IonItem lines="full">
                <IonLabel position="stacked">Nro. Operación / Referencia</IonLabel>
                <IonInput type="text" value={v.referencia || ''}
                  placeholder="Ej: Nro Voucher, CCI, Operación 000234"
                  onIonChange={e => set('referencia', String(e.detail.value || ''))} />
              </IonItem>
            </IonCol>
          )}
          {(v.metodoPago === 'TARJETA_CREDITO' || v.metodoPago === 'TARJETA_DEBITO' || v.metodoPago === 'NIUBIZ' || v.metodoPago === 'IZIPAY') && (
            <IonCol size="12">
              <IonItem lines="full">
                <IonLabel position="stacked">Código Autorización (opcional)</IonLabel>
                <IonInput type="text" value={v.codigoAutorizacion || ''}
                  onIonChange={e => set('codigoAutorizacion', String(e.detail.value || ''))} />
              </IonItem>
            </IonCol>
          )}
          <IonCol size="12">
            <IonItem lines="full">
              <IonLabel position="stacked">Observaciones (opcional)</IonLabel>
              <IonInput type="text" value={v.observaciones || ''}
                onIonChange={e => set('observaciones', String(e.detail.value || ''))} />
            </IonItem>
          </IonCol>
        </IonRow>
      </IonGrid>
    </div>
  );
};

export default PagoForm;
