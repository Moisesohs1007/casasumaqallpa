/**
 * Funciones helper para formatear el ticket térmico como texto preformateado
 * (ASCII monoespaciado) en lugar de usar tablas HTML.
 *
 * Motivo: el driver "Generic / Text Only" no renderiza <table> correctamente
 * (mezcla las filas) y no soporta caracteres especiales (ñ, tildes, …).
 *
 * Todas las funciones normalizan el texto a ASCII y usan anchos fijos.
 */

import { ImpresoraConfigService, TamanoPapel } from '../services/ImpresoraConfigService';

/** Ancho de línea en caracteres según el tamaño de papel */
export function getAnchoLinea(tamano?: TamanoPapel): number {
  const t = tamano || ImpresoraConfigService.obtener().tamanoPapel;
  return t === 58 ? 28 : 48;
}

/**
 * Normaliza texto a ASCII para drivers térmicos que no soportan UTF-8.
 * Quita tildes, convierte ñ→n, Ñ→N, y elimina cualquier carácter no imprimible.
 */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // tildes
    .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
    .replace(/[^\x20-\x7E]/g, ''); // solo ASCII imprimible (32-126)
}

/** Rellena con espacios hasta alcanzar `ancho` caracteres */
function padRight(s: string, ancho: number): string {
  const n = normalizarTexto(s);
  if (n.length >= ancho) return n.substring(0, ancho);
  return n + ' '.repeat(ancho - n.length);
}

function padLeft(s: string, ancho: number): string {
  const n = normalizarTexto(s);
  if (n.length >= ancho) return n.substring(0, ancho);
  return ' '.repeat(ancho - n.length) + n;
}

/**
 * Línea con dos textos: uno a la izquierda y otro a la derecha,
 * rellenando con espacios en medio.
 */
export function lineaDoble(izq: string, der: string, ancho: number = getAnchoLinea()): string {
  const i = normalizarTexto(izq);
  const d = normalizarTexto(der);
  const total = i.length + d.length;
  if (total >= ancho) return i + ' ' + d;
  const espacios = ancho - total;
  return i + ' '.repeat(espacios) + d;
}

/** Texto centrado con espacios a ambos lados */
export function lineaCentrada(texto: string, ancho: number = getAnchoLinea()): string {
  const t = normalizarTexto(texto);
  if (t.length >= ancho) return t.substring(0, ancho);
  const pad = ancho - t.length;
  const left = Math.floor(pad / 2);
  return ' '.repeat(left) + t + ' '.repeat(pad - left);
}

/** Línea separadora compuesta por un carácter repetido */
export function separador(ancho: number = getAnchoLinea(), char: string = '-'): string {
  return char.repeat(ancho);
}

/**
 * Formatea una línea de producto.
 *   nombre  -> 20 chars (truncado con '..' si pasa)
 *   cantidad -> 4 chars derecha
 *   subtotal -> resto derecha con 2 decimales (formato S/20.00)
 */
export function lineaProducto(
  nombre: string,
  cantidad: number | string,
  subtotal: number,
  ancho: number = getAnchoLinea()
): string {
  const W_NOMBRE = ancho <= 28 ? 16 : ancho <= 32 ? 18 : 20;
  const W_CANT = ancho <= 28 ? 3 : 4;

  let n = normalizarTexto(nombre);
  if (n.length > W_NOMBRE) {
    n = n.substring(0, W_NOMBRE - 2) + '..';
  } else {
    n = padRight(n, W_NOMBRE);
  }

  const c = padLeft(String(cantidad), W_CANT);

  const precio = 'S/' + Number(subtotal || 0).toFixed(2);
  const resto = ancho - W_NOMBRE - W_CANT;
  const p = padLeft(precio, resto);

  return n + c + p;
}

/**
 * Convierte el id de método de pago en una etiqueta legible.
 */
const MAPA_METODO_PAGO: Record<string, string> = {
  EFECTIVO_PEN: 'Efectivo S/.',
  EFECTIVO_USD: 'Efectivo US$',
  YAPE: 'Yape',
  PLIN: 'Plin',
  TARJETA_CREDITO: 'Tarjeta Credito',
  TARJETA_DEBITO: 'Tarjeta Debito',
  TRANSFERENCIA: 'Transferencia',
  NIUBIZ: 'Niubiz',
  IZIPAY: 'Izipay',
};

export function humanizarMetodoPago(metodo: string): string {
  return MAPA_METODO_PAGO[metodo] || normalizarTexto(metodo);
}

/**
 * Compacta fechas largas para que entren en una sola línea del ticket.
 * Ejemplo: "15/10/2026, 10:25:44 a. m." -> "15/10/26 10:25 AM"
 */
export function compactarFechaHora(texto: string): string {
  const t = normalizarTexto(String(texto || '')).replace(',', ' ').replace(/\s+/g, ' ').trim();
  const m = t.match(/(\d{1,2}\/\d{1,2}\/\d{4}).*?(\d{1,2}:\d{2})(?::\d{2})?\s*([ap])?\.?\s*m?\.?/i);
  if (!m) return t;

  const fecha = m[1].replace(/(\d{1,2}\/\d{1,2}\/)\d{4}/, '$1' + m[1].slice(-2));
  const hora = m[2];
  const periodo = (m[3] || '').toUpperCase();

  return `${fecha} ${hora}${periodo ? ` ${periodo}M` : ''}`.trim();
}

/**
 * Encabezado de columnas del bloque de productos.
 * Corre ligeramente "CANT" a la izquierda para alinearlo mejor con la columna.
 */
export function lineaEncabezadoProductos(ancho: number = getAnchoLinea()): string {
  const wNombre = ancho <= 28 ? 16 : ancho <= 32 ? 18 : 20;
  const shiftCant = ancho <= 28 ? 1 : 0;
  const nombreArea = Math.max(8, wNombre - shiftCant);
  const subtotalArea = Math.max(4, ancho - nombreArea - 4);

  return padRight('PRODUCTO', nombreArea) + 'CANT' + padLeft('SUBT', subtotalArea);
}
