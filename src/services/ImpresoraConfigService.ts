/**
 * Servicio de configuración de impresora térmica.
 * Soporta: REDPOS RED-HQ201 (58mm) y otras impresoras ESC/POS (80mm).
 * Configuración persistente en localStorage (no requiere backend).
 */

export type TamanoPapel = 58 | 80;
export type MetodoImpresion = 'sistema' | 'webusb';

export interface ImpresoraConfig {
  tamanoPapel: TamanoPapel;       // 58 o 80 mm
  metodoImpresion: MetodoImpresion; // 'sistema' = window.print(), 'webusb' = USB directo
  cortarPapel: boolean;           // corte automático (solo si la impresora lo soporta)
  nombreEmpresa: string;
  mostrarIgv: boolean;
  mostrarLogo: boolean;
}

const STORAGE_KEY = 'lodge_impresora_config_v1';

const CONFIG_POR_DEFECTO: ImpresoraConfig = {
  tamanoPapel: 58,
  metodoImpresion: 'sistema',
  cortarPapel: false,
  nombreEmpresa: 'Casa Sumaq Allpa',
  mostrarIgv: true,
  mostrarLogo: true,
};

function leer(): ImpresoraConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...CONFIG_POR_DEFECTO };
    const parseado = JSON.parse(raw);
    return { ...CONFIG_POR_DEFECTO, ...parseado };
  } catch {
    return { ...CONFIG_POR_DEFECTO };
  }
}

function guardar(config: ImpresoraConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('[ImpresoraConfig] No se pudo guardar:', e);
  }
}

export const ImpresoraConfigService = {
  obtener(): ImpresoraConfig {
    return leer();
  },

  actualizar(parcial: Partial<ImpresoraConfig>): ImpresoraConfig {
    const actual = leer();
    const nueva = { ...actual, ...parcial };
    guardar(nueva);
    return nueva;
  },

  reset(): ImpresoraConfig {
    guardar(CONFIG_POR_DEFECTO);
    return { ...CONFIG_POR_DEFECTO };
  },

  /** Detecta si el navegador soporta WebUSB */
  soportaWebUSB(): boolean {
    return typeof navigator !== 'undefined' && !!(navigator as any).usb;
  },

  /** Detecta si el navegador soporta Web Bluetooth (BLE, NO Classic SPP) */
  soportaWebBluetooth(): boolean {
    return typeof navigator !== 'undefined' && !!(navigator as any).bluetooth;
  },

  /** Detecta plataforma: android, ios, windows, mac, linux, otro */
  plataforma(): 'android' | 'ios' | 'windows' | 'mac' | 'linux' | 'otro' {
    if (typeof navigator === 'undefined') return 'otro';
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) return 'android';
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/win/.test(ua)) return 'windows';
    if (/mac/.test(ua)) return 'mac';
    if (/linux/.test(ua)) return 'linux';
    return 'otro';
  },

  /** Ancho del área de impresión en px según el tamaño de papel */
  anchoTicketPx(tamano?: TamanoPapel): number {
    const t = tamano || leer().tamanoPapel;
    return t === 58 ? 204 : 300; // 58mm ≈ 204px, 80mm ≈ 300px (a 96dpi)
  },

  /** Ancho del área de impresión en mm (ancho útil, no del rollo) */
  anchoUtilMm(tamano?: TamanoPapel): number {
    const t = tamano || leer().tamanoPapel;
    return t === 58 ? 48 : 72; // área imprimible real
  },
};
