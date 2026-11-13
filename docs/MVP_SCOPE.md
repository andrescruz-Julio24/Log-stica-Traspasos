# Alcance validable del MVP
Implementado: pedidos; traspasos; stock; reservas; despachos; recepciones; incidencias; bitácora append-only; transacciones PostgreSQL; reintentos de concurrencia; idempotencia en despachos y recepciones.

La cobertura actual, los permisos y las reglas del flujo con diferencias se describen en [Operación](OPERACION.md). Integración con un ERP concreto, archivos adjuntos y permisos por ubicación requieren configuración o desarrollo adicional.

Invariantes:
- Solicitar no altera stock; reservar no es despachar; despachar no es recibir.
- Disponibilidad = físico - reservado - bloqueado.
- La reserva no puede superar el saldo ni el solicitado.
- Una recepción sólo suma al destino lo aceptado, no lo rechazado.
- El pedido se declara listo si se aceptaron todas sus líneas.
- Los eventos de auditoría se guardan en la misma transacción.
- Las claves de idempotencia impiden duplicar despacho/recepción reintentados.

La suite de integración usa PostgreSQL temporal. Incluye el escenario de 33 unidades, cierre excepcional, compensación de recepción y segregación de funciones.

Decisión pendiente D-01: autoridad de inventario (SGTL u otro ERP).
