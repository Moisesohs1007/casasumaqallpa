import { ImpresoraConfigService, TamanoPapel } from '../services/ImpresoraConfigService';

const STYLE_ID = 'lodge-print-dynamic-style';
const TICKET_PRINT_ID = 'lodge-ticket-print';
const PRINTING_CLASS = 'lodge-printing';

/**
 * Aplica las variables CSS del ticket según la configuración guardada.
 */
export function aplicarEstilosTicket(): void {
  const config = ImpresoraConfigService.obtener();
  const root = document.documentElement;

  const anchoPx = config.tamanoPapel === 58 ? 204 : 300;
  const anchoMm = `${config.tamanoPapel}mm`;
  const fuente = config.tamanoPapel === 58 ? 12 : 13;

  root.style.setProperty('--ticket-ancho', `${anchoPx}px`);
  root.style.setProperty('--ticket-ancho-mm', anchoMm);
  root.style.setProperty('--ticket-fuente', `${fuente}px`);
  root.style.setProperty('--ticket-padding', config.tamanoPapel === 58 ? '6px 8px' : '10px 12px');
}

export function getTamanoPapel(): TamanoPapel {
  return ImpresoraConfigService.obtener().tamanoPapel;
}

/**
 * Imprime el ticket térmico.
 *
 * Estrategia:
 * 1. Agrega la clase 'lodge-printing' al body
 * 2. Inyecta CSS que oculta TODO excepto el ticket (usando body.lodge-printing, NO @media print)
 * 3. Mueve el ticket a un wrapper en el body
 * 4. Inyecta @page con el tamaño correcto
 * 5. window.print()
 * 6. Limpia todo
 *
 * Usar clase en body en lugar de @media print evita conflictos con otros
 * @media print globales (ej: Perfil.css).
 */
export function imprimirTicket(callbackAfterPrint?: () => void, delayMs: number = 200): void {
  const config = ImpresoraConfigService.obtener();
  const tamanoMm = config.tamanoPapel;

  // Buscar el ticket actual
  const ticket = document.querySelector('.nota-venta') as HTMLElement | null;
  if (!ticket) {
    console.warn('[imprimirTicket] No se encontró .nota-venta en el DOM');
    if (callbackAfterPrint) callbackAfterPrint();
    return;
  }

  // Guardar posición original
  const parentOriginal = ticket.parentElement;
  const nextSiblingOriginal = ticket.nextSibling;

  // Limpiar estilos previos
  const previo = document.getElementById(STYLE_ID);
  if (previo) previo.remove();
  document.body.classList.remove(PRINTING_CLASS);

  // CSS de impresión: usa body.lodge-printing + @media print para anular cualquier
  // @page o regla global de otros módulos (ej: Perfil.css fuerza A4 landscape).
  // Todas las reglas llevan !important para ganar la especificidad sobre @media print globales.
  //
  // ESTRATEGIA: @page { size: auto } respeta el tamaño de papel del driver
  // y evita múltiples páginas. El ticket usa width:100% para llenar el ancho.
  const css = `
    /* @page: auto para respetar el tamaño de papel del driver y evitar multiples paginas */
    @media print {
      @page { size: auto; margin: 0; }
    }
    @page { size: auto; margin: 0; }

    /* OCULTAR TODO lo que no sea el ticket durante la impresión. */
    @media print {
      body > *:not(#${TICKET_PRINT_ID}) { display: none !important; }
      #${TICKET_PRINT_ID} { display: block !important; }
    }

    html, body {
      margin: 0 !important; padding: 0 !important; background: #fff !important;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
      box-sizing: border-box !important;
      width: 100% !important;
    }

    @media print {
      body * { visibility: visible !important; }
    }

    /* Wrapper del ticket — ancho 100% para llenar el área imprimible */
    body.lodge-printing #${TICKET_PRINT_ID} {
      display: block !important;
      visibility: visible !important;
      position: static !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      background: #fff !important;
      box-sizing: border-box !important;
      float: none !important;
    }

    body.lodge-printing #${TICKET_PRINT_ID} * {
      visibility: visible !important;
      color: #000 !important;
      background: transparent !important;
      opacity: 1 !important;
      letter-spacing: 0 !important;
      word-spacing: 0 !important;
      text-rendering: geometricPrecision !important;
      box-sizing: border-box !important;
      max-width: 100% !important;
    }

    body.lodge-printing #${TICKET_PRINT_ID} .nota-venta {
      border: none !important; border-radius: 0 !important;
      width: 100% !important; max-width: 100% !important;
      margin: 0 !important; padding: 1mm 2mm !important;
      box-shadow: none !important; background: #fff !important; color: #000 !important;
      display: block !important;
      font-family: 'Courier New', Courier, monospace !important;
      font-size: 12px !important;
      line-height: 1.3 !important;
      text-align: left !important;
      box-sizing: border-box !important;
    }

    /* Tablas dentro del ticket: mantener display de tabla */
    body.lodge-printing #${TICKET_PRINT_ID} table { display: table !important; width: 100% !important; border-collapse: collapse !important; font-size: 8px !important; table-layout: fixed !important; }
    body.lodge-printing #${TICKET_PRINT_ID} thead { display: table-header-group !important; }
    body.lodge-printing #${TICKET_PRINT_ID} tbody { display: table-row-group !important; }
    body.lodge-printing #${TICKET_PRINT_ID} tr { display: table-row !important; }
    body.lodge-printing #${TICKET_PRINT_ID} th,
    body.lodge-printing #${TICKET_PRINT_ID} td { display: table-cell !important; padding: 1px 1px !important; font-size: 8px !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
    /* Anchos de columna: menos para CANT, mas para P.U. y SUBTOT */
    body.lodge-printing #${TICKET_PRINT_ID} th:nth-child(1),
    body.lodge-printing #${TICKET_PRINT_ID} td:nth-child(1) { width: 44% !important; text-align: left !important; }
    body.lodge-printing #${TICKET_PRINT_ID} th:nth-child(2),
    body.lodge-printing #${TICKET_PRINT_ID} td:nth-child(2) { width: 8% !important; text-align: center !important; }
    body.lodge-printing #${TICKET_PRINT_ID} th:nth-child(3),
    body.lodge-printing #${TICKET_PRINT_ID} td:nth-child(3) { width: 24% !important; text-align: right !important; }
    body.lodge-printing #${TICKET_PRINT_ID} th:nth-child(4),
    body.lodge-printing #${TICKET_PRINT_ID} td:nth-child(4) { width: 24% !important; text-align: right !important; }

    /* Texto dentro del ticket — forzar monospace y tamaños explícitos para
       evitar que el driver de la impresora sustituya fuentes con spacing raro */
    body.lodge-printing #${TICKET_PRINT_ID} .nv-logo,
    body.lodge-printing #${TICKET_PRINT_ID} .nv-nombre-empresa,
    body.lodge-printing #${TICKET_PRINT_ID} .nv-linea,
    body.lodge-printing #${TICKET_PRINT_ID} .nv-linea-uno,
    body.lodge-printing #${TICKET_PRINT_ID} .nv-cliente,
    body.lodge-printing #${TICKET_PRINT_ID} .nv-totales,
    body.lodge-printing #${TICKET_PRINT_ID} .nv-total-row,
    body.lodge-printing #${TICKET_PRINT_ID} .nv-footer,
    body.lodge-printing #${TICKET_PRINT_ID} .nv-corte,
    body.lodge-printing #${TICKET_PRINT_ID} .nv-total-final,
    body.lodge-printing #${TICKET_PRINT_ID} .nv-pagado {
      display: block !important;
      color: #000 !important;
      font-family: 'Courier New', Courier, monospace !important;
      letter-spacing: 0 !important;
      word-spacing: 0 !important;
    }
    body.lodge-printing #${TICKET_PRINT_ID} .nv-logo { font-size: 16px !important; font-weight: 700 !important; text-align: center !important; }
    body.lodge-printing #${TICKET_PRINT_ID} .nv-nombre-empresa { font-size: 12px !important; font-weight: 700 !important; text-align: center !important; }
    body.lodge-printing #${TICKET_PRINT_ID} .nv-linea-uno { font-size: 11px !important; font-weight: 600 !important; text-align: center !important; }
    body.lodge-printing #${TICKET_PRINT_ID} .nv-linea { font-size: 10px !important; text-align: center !important; }
    body.lodge-printing #${TICKET_PRINT_ID} .nv-cliente { font-size: 10.5px !important; line-height: 1.3 !important; }
    body.lodge-printing #${TICKET_PRINT_ID} .nv-total-row { font-size: 11px !important; }
    body.lodge-printing #${TICKET_PRINT_ID} .nv-total-final { font-size: 13px !important; font-weight: 900 !important; }
    body.lodge-printing #${TICKET_PRINT_ID} .nv-pagado { font-size: 11px !important; font-weight: 700 !important; }
    body.lodge-printing #${TICKET_PRINT_ID} .nv-footer { font-size: 10px !important; text-align: center !important; }
    body.lodge-printing #${TICKET_PRINT_ID} .nv-corte { font-size: 9px !important; text-align: center !important; }
    body.lodge-printing #${TICKET_PRINT_ID} .nv-total-row span {
      display: inline !important;
      color: #000 !important;
      font-family: 'Courier New', Courier, monospace !important;
      letter-spacing: 0 !important;
      word-spacing: 0 !important;
    }
    body.lodge-printing #${TICKET_PRINT_ID} .nv-header { text-align: center !important; }

    /* Evitar saltos de página */
    body.lodge-printing #${TICKET_PRINT_ID} .nota-venta,
    body.lodge-printing #${TICKET_PRINT_ID} table,
    body.lodge-printing #${TICKET_PRINT_ID} tr,
    body.lodge-printing #${TICKET_PRINT_ID} td,
    body.lodge-printing #${TICKET_PRINT_ID} th,
    body.lodge-printing #${TICKET_PRINT_ID} div {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
  `;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);

  // Crear wrapper y mover el ticket al body
  const wrapper = document.createElement('div');
  wrapper.id = TICKET_PRINT_ID;
  document.body.appendChild(wrapper);
  wrapper.appendChild(ticket); // Mueve el ticket (no clona)

  // Estilos inline: ancho 100% para llenar el area imprimible, fuente y color
  // para garantizar que se apliquen sin importar la especificidad CSS.
  ticket.style.setProperty('width', '100%', 'important');
  ticket.style.setProperty('max-width', '100%', 'important');
  ticket.style.setProperty('font-family', "'Courier New', Courier, monospace", 'important');
  ticket.style.setProperty('font-size', '12px', 'important');
  ticket.style.setProperty('color', '#000', 'important');
  ticket.style.setProperty('background', '#fff', 'important');
  ticket.style.setProperty('padding', '1mm 2mm', 'important');
  ticket.style.setProperty('margin', '0', 'important');
  ticket.style.setProperty('box-sizing', 'border-box', 'important');

  wrapper.style.setProperty('width', '100%', 'important');
  wrapper.style.setProperty('max-width', '100%', 'important');

  // Ocultar #root (donde está ion-app) con estilo en línea !important
  const rootEl = document.getElementById('root') || document.querySelector('#root');
  const rootOriginalDisplay = rootEl ? rootEl.style.display : '';
  if (rootEl) {
    rootEl.style.setProperty('display', 'none', 'important');
  }
  // También ocultar ion-toast y otros overlays de Ionic
  const overlays = document.querySelectorAll('ion-toast, ion-modal, ion-popover, ion-alert, ion-action-sheet');
  overlays.forEach(el => { (el as HTMLElement).style.setProperty('display', 'none', 'important'); });

  // Activar modo impresión
  document.body.classList.add(PRINTING_CLASS);

  // Forzar reflow para que el navegador calcule las dimensiones reales del ticket
  void document.body.offsetHeight;

  // Listener para limpiar y devolver el ticket
  let limpiado = false;
  const limpiar = () => {
    if (limpiado) return;
    limpiado = true;
    document.body.classList.remove(PRINTING_CLASS);
    // Restaurar #root (removeProperty elimina el !important)
    if (rootEl) {
      rootEl.style.removeProperty('display');
      if (rootOriginalDisplay) rootEl.style.display = rootOriginalDisplay;
    }
    // Restaurar overlays
    overlays.forEach(el => { (el as HTMLElement).style.removeProperty('display'); });
    // Devolver el ticket a su posición original
    if (parentOriginal) {
      if (nextSiblingOriginal) {
        parentOriginal.insertBefore(ticket, nextSiblingOriginal);
      } else {
        parentOriginal.appendChild(ticket);
      }
    }
    wrapper.remove();
    style.remove();
    window.removeEventListener('afterprint', limpiar);
    if (callbackAfterPrint) callbackAfterPrint();
  };
  window.addEventListener('afterprint', limpiar);

  // Esperar a que el DOM y CSS se apliquen, luego imprimir
  setTimeout(() => {
    // Forzar reflow
    void document.body.offsetHeight;
    window.print();
    // Fallback por si afterprint no dispara (algunos navegadores)
    setTimeout(() => {
      if (!limpiado) limpiar();
    }, 20000);
  }, delayMs);
}
