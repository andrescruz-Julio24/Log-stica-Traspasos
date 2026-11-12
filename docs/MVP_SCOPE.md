# Alcance validable del MVP
Implementado: pedidos; traspasos; stock; reservas; despachos; recepciones; incidencias; bitácora append-only; transacciones PostgreSQL; reintentos de concurrencia; idempotencia en despachos y recepciones.

No implementado: autenticación real, roles, comprobación por sucursal, cierre administrativo autorizado, cancelación, evidencias, almacenamiento de archivos, flujo de aprobaciones, entregas detalladas por despacho, ERP, tiempo real. No interpretar el estado CLOSED como cumplimiento integral.

Invariantes:
- Solicitar no altera stock; reservar no es despachar; despachar no es recibir.
- Disponibilidad = físico - reservado - bloqueado.
- La reserva no puede superar el saldo ni el solicitado.
- Una recepción sólo suma al destino lo aceptado, no lo rechazado.
- El pedido se declara listo si se aceptaron todas sus líneas.
- Los eventos de auditoría se guardan en la misma transacción.
- Las claves de idempotencia impiden duplicar despacho/recepción reintentados.

Ejecución de pruebas pendiente: el código no ha sido compilado ni probado sobre una base conectada desde el asistente. Ejecutar npm install, migración, npm test y pruebas E2E antes de usar.

Decisión pendiente D-01: autoridad de inventario (SGTL u otro ERP).
