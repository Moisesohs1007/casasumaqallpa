# Sistema de gestión para lodge

**Estructura de módulos, campos y funciones, priorizada por etapas**

Septiembre 2026

## 1. Cómo usar este documento

Este documento describe todo lo que puede tener un sistema de gestión para un lodge, similar a lo que ofrecen plataformas como Cloudbeds, más módulos específicos para lodges y para el mercado peruano. Está organizado por etapas: se recomienda construir o contratar en ese orden, porque cada etapa se apoya en la anterior.

Cada módulo indica sus campos principales (los datos que guarda) y sus funciones (lo que permite hacer).

## 2. Resumen por etapas

| Etapa | Módulos | Para qué sirve | Complejidad |
| --- | --- | --- | --- |
| **1. Núcleo de reservas** | Habitaciones, tarifas, calendario, reservas, huéspedes | Saber qué hay disponible y quién viene | Media |
| **2. Recepción, cuenta y POS** | Check-in/out, folio, cobros, **POS comida y bebida**, usuarios y roles | Operar la llegada, los consumos, los pedidos y el cobro | Media a alta |
| **3. Operación diaria** | Housekeeping, mantenimiento, reportes básicos | Tener habitaciones listas y medir el negocio | Baja a media |
| **4. Facturación y normativa** | Facturación SUNAT, registro de huéspedes, IGV selva | Cumplir con la ley | Alta |
| **5. Extras del lodge** | Tours, traslados, paquetes, WhatsApp, inventario | Lo que diferencia a un lodge de un hotel | Media |
| **6. Distribución y pagos** | Motor de reservas, channel manager, pasarela, web | Vender en línea sin intermediarios y en OTAs | Alta |
| **7. Crecimiento y experiencia** | Precios dinámicos, upselling, CRM, reseñas, check-in online, portal, llave digital, eventos | Aumentar ingresos y mejorar la experiencia | Media a alta |
| **8. Administración interna** | Lavandería, turnos, caja y contabilidad, energía y agua | Controlar costos y operación | Media |

## Etapa 1. Núcleo de reservas

### 1.1 Habitaciones y tipos

*Catálogo de todo lo que se puede alquilar en el lodge.*

**Campos principales**

- Código o nombre de la habitación
- Tipo (simple, doble, familiar, cabaña, suite)
- Capacidad (adultos y niños) y camas
- Descripción y fotos
- Servicios incluidos
- Estado y notas

**Funciones**

- Crear, editar y desactivar habitaciones
- Agrupar por tipo
- Bloquear por mantenimiento
- Vista general del inventario

### 1.2 Tarifas y temporadas

*Define cuánto cuesta cada noche y bajo qué reglas.*

**Campos principales**

- Nombre de la tarifa y tipo de habitación
- Precio base y moneda (PEN o USD)
- Temporadas (alta, baja, feriados) y fechas
- Mínimo de noches
- Régimen (solo alojamiento, desayuno, pensión completa)
- Política de cancelación
- Impuestos y códigos promocionales

**Funciones**

- Calcular precio por noche y total de la estadía
- Reglas por fecha, ocupación y niños
- Descuentos y promociones
- Tarifas especiales para agencias o grupos

### 1.3 Calendario de disponibilidad

*Vista central para saber qué habitaciones están libres, reservadas u ocupadas.*

**Datos que muestra**

- Habitación y fecha
- Estado (libre, reservada, ocupada, bloqueada)
- Reserva asociada

**Funciones**

- Vista por día, semana y mes
- Mover reservas arrastrando y soltando
- Evitar dobles reservas
- Bloquear fechas
- Buscar disponibilidad por fechas y número de personas

### 1.4 Reservas

*Registro de cada estadía desde que se solicita hasta que termina.*

**Campos principales**

- Código de reserva y huésped titular
- Fechas de entrada y salida
- Habitaciones, adultos y niños
- Tarifa aplicada, total y anticipo
- Estado (pendiente, confirmada, check-in, check-out, cancelada, no show)
- Origen (directa, WhatsApp, Booking, Airbnb, agencia)
- Hora estimada de llegada y pedidos especiales

**Funciones**

- Crear, modificar y cancelar
- Reservas grupales con varias habitaciones
- Cálculo automático de saldo
- Historial de cambios
- Lista de llegadas y salidas del día

### 1.5 Huéspedes

*Ficha única de cada persona que se aloja.*

**Campos principales**

- Nombres y apellidos
- Tipo y número de documento
- Nacionalidad y fecha de nacimiento
- Teléfono y correo
- País y ciudad de procedencia
- Preferencias y restricciones alimentarias
- Consentimiento de tratamiento de datos personales

**Funciones**

- Ficha sin duplicados
- Búsqueda rápida
- Historial de estadías
- Etiquetas (recurrente, VIP)
- Notas internas

## Etapa 2. Recepción, cuenta y POS

### 2.1 Check-in y check-out

*Operación de llegada y salida en recepción.*

**Campos principales**

- Reserva y habitación asignada
- Hora real de llegada y salida
- Documentos verificados
- Aceptación de normas del lodge
- Llave entregada
- Estado de la habitación al salir

**Funciones**

- Check-in rápido desde la reserva
- Cambio de habitación
- Extensión o salida anticipada
- Check-out con cuenta final
- Aviso automático a housekeeping al salir

### 2.2 Folio (cuenta del huésped)

*Cuenta donde se acumula todo lo que el huésped consume durante la estadía.*

**Campos principales**

- Reserva y huésped
- Fecha del cargo
- Concepto (alojamiento, **comida, bebida**, consumo general, tour, traslado, otros)
- Cantidad, precio, impuesto y descuento
- Usuario que registró el cargo
- Pedido o comanda asociada (si viene del POS)

**Funciones**

- Cargo automático del alojamiento cada noche
- Cargos manuales
- **Cargo automático desde el POS al cerrar un pedido**
- Dividir la cuenta entre varios huéspedes
- Transferir cargos entre cuentas
- Anular cargos indicando el motivo
- Cuenta maestra para grupos

### 2.3 Cobros y pagos

*Registro de todo el dinero que entra y sale.*

**Campos principales**

- Método (efectivo, tarjeta, transferencia, Yape o Plin, pasarela)
- Moneda, monto y tipo de cambio
- Referencia o número de operación
- Fecha y usuario

**Funciones**

- Anticipos y pagos parciales
- Devoluciones
- Cierre de caja diario
- Conciliación de pagos
- **Pago parcial de comandas del POS**

### 2.4 Usuarios y roles

*Control de quién puede ver y hacer qué.*

**Campos principales**

- Nombre y correo
- Rol
- Estado (activo o inactivo)

**Funciones**

- Roles: administración, recepción, housekeeping, **mozo/a, bartender, cocina**, contabilidad
- Permisos por módulo
- Registro de actividad (quién hizo qué y cuándo)

### 2.5 POS de comida y bebida

*Punto de venta para tomar pedidos, enviarlos a cocina/bar y cargarlos al folio del huésped o cobrarlos directamente. Módulo esencial para el funcionamiento diario.*

**Submódulos incluidos:** carta de productos, comandas, cocina/bar (KDS), caja POS, reportes de ventas F&B.

---

#### 2.5.1 Carta y productos F&B

*Catálogo de todo lo que se puede pedir en bar, restaurante, room service o áreas comunes.*

**Campos principales del producto**

- Nombre y descripción
- Categoría (desayuno, almuerzo, cena, postre, bebida fría, bebida caliente, tragos, snacks, room service, otros)
- Subcategoría o grupo (ej: platos a la carta, parrilla, piscos, vinos)
- Precio de venta y costo
- Moneda (PEN o USD)
- Impuesto (IGV, inafecto, exonerado según Ley Selva)
- **Presentaciones o variantes** (ej: sopa + plato de fondo para almuerzo)
- **Modificadores permitidos** (ej: sin cebolla, extra queso, poco azúcar)
- **Horario de disponibilidad** (ej: desayuno 6:00-10:00, cena 18:00-22:00)
- **Puntos de venta** donde se sirve (restaurante, bar, habitación, piscina, terraza)
- Imagen o foto
- Estado (activo, agotado, inactivo)
- Inventario asociado (ingredientes o producto terminado)
- Código de barras o código rápido (para cobro rápido en bar)

**Funciones**

- Crear, editar y desactivar productos
- Agrupar por categoría y cambiar el orden visual
- **Menús del día o especiales temporales** (con fecha de vigencia)
- **Precios diferentes por punto de venta** (ej: habitación = +10%)
- Control de productos agotados (no aparece en carta o marca "agotado")
- Duplicar productos para crear variantes rápido

---

#### 2.5.2 Puntos de venta y mesas / áreas

*Lugares físicos donde se reciben pedidos y se cobra.*

**Campos principales**

- Nombre del punto de venta (Restaurante Principal, Bar, Room Service, Piscina, Tienda)
- Tipo (restaurante con mesas, bar, atención a habitación, área común, tienda)
- **Mesas o unidades** (código, capacidad, ubicación: interior / terraza / etc.)
- Estado de mesa (libre, ocupada, reservada, en limpieza)
- Usuario o área asignada

**Funciones**

- **Vista gráfica de mesas** (plano del restaurante con colores por estado)
- Arrastrar y soltar para mover una comanda de mesa
- Unir o dividir mesas (grupos que se juntan o separan)
- Reservar mesas directamente desde el POS o desde la reserva de huésped
- Mostrar el número de personas por mesa
- **Asignar mozo/a a mesas**

---

#### 2.5.3 Comandas y pedidos

*Registro de cada pedido realizado por un cliente, huésped o habitación.*

**Campos principales de la comanda**

- Número de comanda (correlativo)
- Tipo de consumo:
  - **A habitación** (cargado al folio — la opción más común)
  - **Mesa** (restaurante o bar)
  - **Para llevar**
  - **Delivery** (si aplica)
- Habitación asociada (si es a habitación) → obligatorio para cargar al folio
- Reserva asociada (si el huésped tiene reserva)
- Mesa asociada (si es restaurante)
- Mozo/a que toma el pedido
- Fecha y hora de apertura y cierre
- Cantidad de personas
- Estado de la comanda:
  - `abierta` (tomando pedido)
  - `en cocina/bar` (pedido enviado a preparar)
  - `lista` (preparación terminada)
  - `entregada` (entregada al cliente)
  - `cerrada` (cobrada y/o cargada al folio)
  - `anulada` (con motivo)
- **Prioridad** (normal, urgente — para room service o solicitudes especiales)
- Observaciones generales del pedido
- **Solicitud de entrega** (hora de entrega para room service, por ejemplo)

**Campos del detalle (cada línea de la comanda)**

- Producto y categoría
- Cantidad
- Precio unitario (según tarifa del punto de venta)
- Subtotal, impuesto y descuento por línea
- **Modificadores aplicados** (ej: "sin sal", "carne término medio", "sin hielo")
- **Adiciones o extras** (ej: +papas fritas, +guarnición) con costo adicional
- Comentarios especiales por línea
- **Estado de preparación** (pendiente, en preparación, listo, servido, anulado)
- Cocina o estación asignada (cocina caliente, parrilla, bar, pastelería, etc.)
- Usuario que registró la línea

**Funciones de comandas**

- **Tomar pedido rápido** desde dispositivo móvil (tablet del mozo) o caja
- Búsqueda de producto por nombre, categoría o código
- **Modificadores y adiciones obligatorios/opcionales** (sistema pregunta automáticamente)
- **Cantidades fraccionales** (ej: 0.5 botella de vino)
- **Agrupar por estación de cocina** (cada línea se envía solo a quien le corresponde)
- **Editar pedido mientras esté abierto** (agregar productos, cambiar cantidades)
- **Anular líneas con motivo** (ej: "cliente se arrepintió", "producto agotado")
- **Dividir el pago** de una comanda entre varias personas o varios métodos
- **Transferir una comanda a otra mesa o a otra habitación**
- **Historial completo de modificaciones** (quién agregó/quitó qué, cuándo)
- **Recordatorios y tiempos de preparación** (alerta si una comanda demora mucho)

---

#### 2.5.4 Cocina y bar (KDS — Kitchen Display System)

*Visualización en tiempo real de los pedidos que deben preparar cocina y bar.*

**Qué muestra**

- Comandas pendientes y en preparación, ordenadas por tiempo
- Detalle de cada línea (producto, cantidad, modificadores, comentarios)
- Tipo de consumo (habitación / mesa / llevar) y habitación/mesa
- Hora de envío y tiempo transcurrido
- Prioridad (urgentes resaltadas)
- Estación asignada (cocina caliente, fría, parrilla, bar, postres)

**Funciones**

- **Pantalla táctil por estación** (sin necesidad de teclado en cocina)
- **Ticket impreso por estación** (si prefiere papel — impresoras de cocina)
- Marcar línea como `en preparación` → `lista` → `servida`
- **Alerta visual/sonora** cuando llega un pedido nuevo
- **Alerta de demora** si un pedido supera el tiempo estimado (configurable por producto)
- Reimpresión de tickets
- **Solicitar ingredientes o reportar faltantes** desde la misma pantalla

---

#### 2.5.5 Cobro y cargo al folio

*Cierre de la comanda: pago directo o cargo automático a la cuenta del huésped.*

**Opciones de cierre**

| Tipo | Cómo funciona | Cuándo usar |
| --- | --- | --- |
| **✅ Cargar a habitación** | Se envía todo el detalle al folio del huésped con concepto "Comida / Bebida" y se marca la comanda como cerrada | Predeterminado para huéspedes alojados |
| **Pagar en el lugar** | Cobro directo en el POS (efectivo, tarjeta, Yape/Plin, etc.) | Clientes externos, para llevar, o huéspedes que prefieren pagar en el momento |
| **Mixto** | Parte cargada a habitación, parte pagada en el lugar | Ej: habitación paga platos, cliente paga tragos extra |
| **Cortesía o comp** | Cargo a casa / cuenta de cortesía con motivo autorizado | Visitas, staff, compensaciones |
| **Cuenta abierta / cuenta corriente** | Se queda abierta para ir sumando pedidos durante la estadía (por ejemplo, en restaurante) | Familias o grupos que van y vienen |

**Funciones de cobro**

- **Cargo a habitación en 1 clic** (solo si la habitación está ocupada / check-in realizado)
- **Validación automática de existencia de folio** antes de cargar
- **Selección de folio** si una reserva tiene varios folios o cuenta maestra de grupo
- **Múltiples métodos de pago** por comanda (ej: 50% tarjeta + 50% efectivo)
- **Propinas** (campo separado, asignable al personal)
- **Descuentos** (porcentaje o monto fijo) con motivo y usuario que autorizó
- **Ticket de consumición** (cliente firma si es a habitación — opción física/digital)
- **Factura directa desde el POS** (para clientes externos) o al cerrar folio en check-out
- **Reimpresión de recibos / facturas**

---

#### 2.5.6 Room service (servicio a habitación)

*Flujo específico para pedidos solicitados desde la habitación del huésped.*

**Campos adicionales**

- Hora solicitada de entrega
- Instrucciones de entrega (dejar en puerta, tocar timbre, no molestar)
- Servicio adicional: cubiertos, menaje, cubiertos extra, sillas, etc.
- Confirmación de entrega (hora, firma del huésped o foto)

**Funciones específicas**

- Identificar al huésped por número de habitación (sugerir nombre si ya está en sistema)
- Tarifa específica de room service (marca "Room Service" en el producto)
- **Aviso automático a cocina y a housekeeping** (si pidió menaje)
- Confirmación de entrega por el staff que lleva el pedido
- **Cargo instantáneo al folio** en el momento de entregar

---

#### 2.5.7 Reportes F&B

*Métricas y reportes exclusivos del área de comida y bebida.*

**Indicadores principales**

- Ventas totales F&B (por período, por día, por turno)
- **Ventas por categoría** (platos fuertes vs bebidas vs postres)
- **Productos más vendidos** y menos vendidos (top 10 / bottom 10)
- Ventas por punto de venta (restaurante vs bar vs room service vs piscina)
- Ventas por mozo/a (incluyendo propinas)
- **Consumos cargados a habitación vs pagados directamente**
- Promedio de consumo por persona / por comanda
- **Tiempo promedio de preparación por cocina/bar**
- **Tiempo promedio de mesa** (desde apertura hasta cierre)
- Porcentaje de ocupación de mesas
- Pedidos anulados y motivo
- **Descuentos y cortesías aplicados** (con responsable)
- Consumos por régimen (desayuno incluido, media pensión, pensión completa)
- **Producto vs inventario: merma estimada** (lo vendido descontado del stock)
- Exportar reportes a Excel y PDF

---

#### 2.5.8 Integraciones obligatorias del POS

El POS **no funciona solo**: debe conectarse con los siguientes módulos del sistema:

| Módulo | Qué se integra |
| --- | --- |
| **Folio (2.2)** | Cada comanda cerrada como "a habitación" genera uno o más cargos en el folio con detalle |
| **Huéspedes y Reservas (1.4 / 1.5)** | Permite buscar habitación, mostrar nombre del huésped y validar que tenga check-in activo |
| **Usuarios y roles (2.4)** | Controla quién puede abrir comandas, cobrar, aplicar descuentos, anular, autorizar cortesías |
| **Inventario (5.5)** | Al cerrar una comanda se descuentan automáticamente los ingredientes o productos terminados del stock. Si el producto tiene "receta" se descuenta cada insumo |
| **Caja y cobros (2.3 / 8.3)** | Los pagos directos en POS se integran a la caja diaria y cierre de caja |
| **Facturación SUNAT (4.1)** | Permite emitir boleta o factura desde el POS (clientes externos) o agrupar con el folio al check-out |

## Etapa 3. Operación diaria

### 3.1 Housekeeping

*Coordina la limpieza para que las habitaciones estén listas a tiempo.*

**Campos principales**

- Habitación
- Estado (limpia, sucia, en limpieza, inspeccionada, ocupada, bloqueada)
- Personal asignado
- Hora de inicio y fin
- Observaciones y artículos faltantes

**Funciones**

- Lista diaria de limpieza según salidas y llegadas
- Asignación de tareas al personal
- Actualizar el estado desde el celular
- Alerta a recepción cuando la habitación queda lista

### 3.2 Mantenimiento

*Seguimiento de averías y reparaciones.*

**Campos principales**

- Habitación o área
- Descripción y fotos
- Prioridad y responsable
- Estado y fechas
- Costo

**Funciones**

- Crear solicitudes desde cualquier usuario
- Bloquear la habitación automáticamente
- Seguimiento hasta el cierre
- Historial por habitación

### 3.3 Reportes básicos

*Indicadores para entender cómo va el lodge.*

**Indicadores**

- Porcentaje de ocupación
- Ingresos por alojamiento
- Tarifa promedio diaria (ADR)
- Ingreso por habitación disponible (RevPAR)
- Estadía promedio
- Origen de las reservas
- Cancelaciones y no shows
- Ingresos por método de pago

**Funciones**

- Filtros por fechas y tipo de habitación
- Panel resumen
- Exportar a Excel y PDF

## Etapa 4. Facturación y normativa (Perú)

### 4.1 Facturación electrónica SUNAT

*Emisión de comprobantes válidos. Normalmente el sistema se conecta con un facturador autorizado en lugar de emitir directamente.*

**Campos principales**

- Tipo de comprobante (boleta, factura, nota de crédito y débito)
- Serie y número
- RUC o DNI y razón social del cliente
- Detalle, moneda y forma de pago
- IGV o exoneración
- Estado ante SUNAT

**Funciones**

- Emitir desde el folio al hacer check-out
- Anular y emitir notas de crédito
- Enviar el comprobante por correo al huésped
- Conexión con un facturador u OSE
- Reporte de ventas

### 4.2 Registro de huéspedes y normativa

*Cumplimiento de obligaciones propias del sector turismo.*

**Elementos**

- Datos del huésped exigidos por el sector
- Exoneración de IGV en zona selva (Ley 27037), solo si aplica al lodge
- Consentimiento de datos personales

**Funciones**

- Registro de huéspedes conforme a lo que exija MINCETUR
- Reportes requeridos
- Validar con un contador si el lodge califica para la exoneración

## Etapa 5. Extras del lodge

### 5.1 Tours y actividades

*Venta y programación de excursiones y experiencias.*

**Campos principales**

- Nombre y descripción
- Duración y precio
- Cupo máximo y horarios
- Guía asignado
- Punto de encuentro
- Requisitos (equipo, edad, condición física)
- Estado

**Funciones**

- Programar salidas con cupos
- Reservar desde el folio del huésped
- Asignar guías
- Lista de participantes
- Cargo automático a la cuenta
- Control de capacidad

### 5.2 Traslados y transporte

*Coordinación de recojos y llegadas.*

**Campos principales**

- Origen y destino
- Fecha y hora
- Pasajeros
- Vehículo y conductor
- Vuelo o bus de llegada
- Precio y estado

**Funciones**

- Programar recojos
- Asignar conductor
- Aviso de llegadas del día
- Cargo al folio

### 5.3 Paquetes

*Combinaciones de alojamiento, comidas y actividades.*

**Campos principales**

- Nombre y número de noches
- Tipo de habitación
- Comidas incluidas
- Actividades incluidas
- Precio y vigencia

**Funciones**

- Vender el paquete como una sola reserva
- Desglosar sus componentes
- Controlar lo consumido de lo incluido

### 5.4 Mensajería por WhatsApp

*Comunicación automática con el huésped por el canal que más usa. Requiere WhatsApp Business y plantillas aprobadas.*

**Campos principales**

- Plantillas de mensajes
- Disparadores (reserva creada, 48 horas antes, salida)
- Historial de conversaciones

**Funciones**

- Confirmación de reserva
- Recordatorio previo con indicaciones de cómo llegar
- Recordatorio de pago
- Respuestas a preguntas frecuentes
- Mensaje posterior a la estadía con encuesta

### 5.5 Inventario y compras

*Especialmente importante en lodges alejados, donde reponer cuesta tiempo.*

**Campos principales**

- Producto y categoría
- Unidad y stock actual
- Stock mínimo
- Proveedor y costo
- Ubicación o almacén

**Funciones**

- Entradas y salidas de almacén
- Alertas de stock mínimo
- Órdenes de compra
- Kardex
- Control de amenities y suministros

## Etapa 6. Distribución y pagos en línea

### 6.1 Motor de reservas

*Reservas directas desde tu propia web, sin pagar comisión a terceros.*

**Configuración**

- Idiomas (español e inglés como mínimo)
- Monedas
- Política de pago o anticipo
- Textos y fotos
- Códigos promocionales

**Funciones**

- Consultar disponibilidad y tarifas en tiempo real
- Cobrar anticipo en línea
- Confirmación automática
- Integración con la web del lodge
- Reserva llega directo al sistema

### 6.2 Channel manager

*Sincroniza disponibilidad y tarifas con Booking, Expedia, Airbnb y otras plataformas. Es el módulo más complejo: requiere acuerdos y certificación con cada canal, por lo que suele convenir conectar un proveedor existente en lugar de construirlo.*

**Configuración**

- Canales conectados
- Equivalencia de tipos de habitación por canal
- Reglas de tarifas por canal

**Funciones**

- Actualizar inventario y precios en todos los canales a la vez
- Recibir reservas automáticamente
- Evitar sobreventa
- Reporte de reservas por canal

### 6.3 Pasarela de pagos

*Cobros con tarjeta en línea.*

**Configuración**

- Proveedor elegido (por ejemplo, Niubiz, Culqi o Izipay)
- Monedas aceptadas
- Comisiones

**Funciones**

- Cobro con tarjeta y anticipos
- Enlaces de pago
- Conciliación con las reservas

## Etapa 7. Crecimiento y experiencia del huésped

### 7.1 Precios dinámicos

*Ajuste de tarifas según la demanda.*

**Reglas**

- Ocupación, temporada y anticipación
- Precios de la competencia
- Límites mínimo y máximo

**Funciones**

- Subir o bajar tarifas automáticamente
- Alertas de movimientos de la competencia
- Comparar resultados

### 7.2 Upselling (venta de extras)

*Ofrecer servicios adicionales antes y durante la estadía.*

**Campos principales**

- Catálogo de extras (tours, traslados, desayunos, spa)
- Precio y disponibilidad
- Momento en que se ofrece

**Funciones**

- Ofrecerlos al reservar, antes de llegar y en el check-in
- Cargo directo al folio
- Reporte de ingresos por extras

### 7.3 CRM y fidelización

*Relación con huéspedes anteriores para que regresen.*

**Campos principales**

- Segmentos de huéspedes
- Campañas y plantillas
- Códigos personalizados

**Funciones**

- Correos y mensajes por temporada
- Ofertas a huéspedes recurrentes
- Programa de fidelización

### 7.4 Reseñas y encuestas

*Conocer la opinión del huésped después de la estadía.*

**Campos principales**

- Preguntas de la encuesta
- Puntaje y comentarios
- Reserva asociada

**Funciones**

- Envío automático al terminar la estadía
- Alerta ante calificaciones bajas
- Invitar a dejar reseña en Google o TripAdvisor

### 7.5 Check-in online

*El huésped completa sus datos antes de llegar.*

**Campos principales**

- Datos personales y documento
- Hora de llegada
- Requerimientos especiales
- Aceptación de normas

**Funciones**

- Formulario previo por enlace
- Firma digital de normas
- Recepción solo confirma y entrega la llave

### 7.6 Portal del huésped

*Página o app para que el huésped se atienda solo.*

**Contenido**

- Cuenta y consumos
- Información del lodge (wifi, horarios, normas)
- Catálogo de servicios y tours

**Funciones**

- Ver su cuenta
- Solicitar servicios
- Reservar tours
- Contactar a recepción

### 7.7 Llave digital y cerraduras electrónicas

*Acceso a la habitación sin llave física.*

**Elementos**

- Cerraduras compatibles
- Códigos temporales por reserva

**Funciones**

- Generar códigos que vencen al check-out
- Registro de accesos
- Requiere integración con el fabricante de la cerradura

### 7.8 Eventos y grupos

*Bodas, retiros y grupos corporativos.*

**Campos principales**

- Tipo de evento y fecha
- Espacios o salones
- Número de asistentes
- Servicios contratados
- Cotización y anticipo

**Funciones**

- Cotizaciones
- Bloqueo de varias habitaciones a la vez
- Cuenta maestra del grupo
- Contrato

## Etapa 8. Administración interna

### 8.1 Lavandería y blancos

*Control de ropa de cama y toallas.*

**Campos principales**

- Tipo de prenda y cantidad
- Envíos y retornos
- Pérdidas y deterioro

**Funciones**

- Registrar juegos por habitación
- Control de envíos a lavandería
- Reposición

### 8.2 Turnos y personal

*Organización del equipo.*

**Campos principales**

- Nombre y área
- Turnos y horarios
- Asistencia

**Funciones**

- Programar turnos
- Asignar personal por área
- Costo de personal por período

### 8.3 Caja, gastos y contabilidad

*Control del dinero del lodge.*

**Campos principales**

- Ingresos y egresos
- Categoría del gasto
- Proveedor y comprobante
- Caja y usuario

**Funciones**

- Cajas por usuario y cierre diario
- Cuentas por pagar a proveedores
- Exportar a contabilidad
- Estado de resultados básico

### 8.4 Energía y agua

*Útil en lodges alejados con generador, paneles o tanques.*

**Campos principales**

- Consumo de combustible o energía
- Nivel de tanques
- Fechas de mantenimiento de equipos

**Funciones**

- Registro de consumos
- Alertas de nivel bajo
- Mantenimiento preventivo

## Anexo. Entidades principales de la base de datos

Si vas a construir el sistema, estas son las tablas centrales y cómo se relacionan entre sí.

| Entidad | Qué guarda | Se relaciona con |
| --- | --- | --- |
| **Tipo de habitación** | Nombre, capacidad, descripción | Habitación, Tarifa |
| **Habitación** | Código, estado, tipo | Reserva, Tarea de limpieza, Mantenimiento, **Comanda** |
| **Tarifa** | Precio, temporada, reglas | Tipo de habitación, Reserva |
| **Huésped** | Datos personales y documento | Reserva, Encuesta |
| **Reserva** | Fechas, estado, origen, total | Huésped, Habitación, Folio, **Comanda** |
| **Folio y cargos** | Conceptos consumidos y montos | Reserva, Pago, Comprobante, **Comanda** |
| **Pago** | Método, monto, moneda | Folio, Caja, **Comanda** |
| **Comprobante** | Boleta o factura y estado SUNAT | Folio, Huésped, **Comanda** |
| **Tarea de limpieza** | Habitación, personal, estado | Habitación, Usuario |
| **Mantenimiento** | Solicitud, prioridad, estado | Habitación, Usuario |
| **Actividad y salida** | Tour, fecha, cupo, guía | Reserva, Folio, Personal |
| **Traslado** | Ruta, hora, conductor | Reserva, Folio |
| **Producto de inventario** | Stock, costo, proveedor | Compra, Consumo, **Producto F&B (receta)** |
| **Usuario** | Nombre, rol, permisos | Todas (registro de actividad) |

---

### Tablas del módulo POS (Comida y Bebida) — Etapa 2.5

| Entidad | Qué guarda | Se relaciona con |
| --- | --- | --- |
| **Categoría F&B** | Nombre, tipo (desayuno, almuerzo, bar, etc.), orden, estado | Producto F&B |
| **Producto F&B** | Nombre, categoría, precio, costo, impuesto, estado, horario disponibilidad | Categoría F&B, Inventario, Comanda Detalle, Modificador, Precio Punto Venta |
| **Modificador y Adición** | Nombre, opciones (sin cebolla, extra queso, etc.), costo adicional, obligatorio/opcional | Producto F&B, Comanda Detalle |
| **Receta / Ingredientes** | Producto final → ingredientes y cantidades (BOM) | Producto F&B, Producto Inventario |
| **Punto de venta (POS)** | Nombre, tipo (restaurante, bar, room service, tienda), estado, prefijo comanda | Comanda, Mesa, Precio Punto Venta |
| **Mesa / Área** | Nombre/código, capacidad, ubicación, estado, punto de venta asignado | Punto Venta, Comanda |
| **Comanda (Pedido)** | Número, tipo (habitación/mesa/llevar), estado, prioridad, fecha apertura/cierre, mozo, obs. | Punto Venta, Mesa, Habitación, Reserva, Folio, Usuario, Comanda Detalle |
| **Comanda Detalle** | Línea por línea: producto, cantidad, precio, subtotal, modificadores, estado prep., estación | Comanda, Producto F&B, Modificador, Folio Cargo |
| **Estación de cocina / bar** | Nombre, tipo (cocina caliente, parrilla, bar, postres), usuario asignado | Comanda Detalle |
| **Precio por Punto de Venta** | Precio diferente por cada lugar (habitación +10%, bar, etc.) | Producto F&B, Punto Venta |
| **Turno de servicio** | Desayuno / almuerzo / cena / coctelería — con horarios y reportes por turno | Comanda, Usuario |
| **Propina y cortesía** | Monto, motivo, usuario que autoriza, asignación a personal | Comanda, Pago, Usuario |
