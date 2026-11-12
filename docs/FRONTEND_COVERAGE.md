# Cobertura del frontend — SGTL / UX/UI / LOG / DEV / QA

Este documento distingue **pantallas implementadas** de **operaciones aún no soportadas**. El diseño sigue la identidad del kit Figma: #10283B, #0D7479, superficies claras, estados textuales y navegación lateral.

| Ruta | Vista | Datos | Acción disponible | Pendiente |
| --- | --- | --- | --- | --- |
| / | Dashboard | API | Abrir módulo | Alertas persistidas, SLA |
| /pedidos | Pedidos | API | Alta de pedido (una línea UI) | Edición, cancelación, múltiples líneas UI |
| /clientes | Clientes derivados | API | Consulta | Catálogo de clientes independiente |
| /traspasos | Traspasos | API | Alta, reservar, despachar, recibir | Autorizaciones, correcciones |
| /inventario | Inventario | API | Consulta | Movimientos controlados y ajustes |
| /reservas | Reservas | API | Consulta y acceso a traspasos | Anulación/expiración y reservas por cliente completas |
| /preparacion | Preparación | API | Consulta | Picking y validación física |
| /despachos | Despachos | API | Consulta y acceso a traspasos | Packing, evidencia, transportista |
| /transito | Tránsito | API | Consulta agregada | Custodia y seguimiento por despacho |
| /recepciones | Recepciones | API | Consulta y acceso a traspasos | Evidencia, vínculo a despacho |
| /incidencias | Incidencias | API | Registro | Flujo completo de resolución |
| /cancelaciones | Evaluación de cancelación | API | Sólo consulta | Transacción compensatoria y aprobación |
| /autorizaciones | Políticas y bandeja | Sin endpoint de autorizaciones | Sólo consulta | Modelo IAM, aprobaciones y restricciones |
| /alertas | Alertas derivadas | API | Navegación | Notificaciones persistidas |
| /auditoria | Eventos | API | Consulta | Filtros y paginación por entidad |
| /reportes | KPIs agregados | API | Consulta | SLA y datos de tiempos reales |
| /buscar | Búsqueda | API | Búsqueda local en datos cargados | Índice paginado en servidor |
| /administracion | Catálogos | API | Consulta | Roles, permisos y edición |

## Reglas innegociables

- No mostrar la mercancía en tránsito como recibida.
- No confundir cierre de demo con cierre administrativo autorizado.
- Existencia física y disponibilidad no son iguales.
- La interfaz **nunca** concede permisos o reservas: NestJS valida el cambio.
- Las vistas sin endpoints muestran sus dependencias expresamente; no ejecutan acciones fingidas.
- Datos de demo ≠ validación con operadores / UAT.
- En cada módulo se deben revisar accesibilidad, estados vacíos, errores, filtros y responsividad.

## Próximo hito QA

El build de Next.js debe generar las 18 rutas sin errores. El MVP no se considerará completo hasta ejecutar pruebas de integración reales de inventario, transacciones y recepción contra una base de pruebas, y validar con operadores el flujo esperado.

| /pedidos/[id] | Detalle individual de pedido | API | Consulta de líneas, reservas y traspasos relacionados | Autorizaciones comerciales |
| /traspasos/[id] | Detalle individual de traspaso | API | Consulta de despachos, recepciones, incidencias y eventos | Cierre formal con evidencia |
