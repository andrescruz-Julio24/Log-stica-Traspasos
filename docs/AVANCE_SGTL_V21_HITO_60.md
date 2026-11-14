# SGTL v2.1 · Hito de consolidación hacia 60%

Referencias: Planteamiento v2.1 del 13 de noviembre de 2026; funcionalidades del mismo PR.

| Requisito | Avance implementado | Prueba |
|---|---|---|
| LOG-04 / INV-17 / T-17 | Registro de observaciones de papel, Excel, medición digital; unidades, cantidades decimales y procedencia. | Conteo nunca altera stock por sí solo; Excel estimado no se puede verificar. |
| LOG-04 / INV-18 | Validación supervisada de medición física y auditoría con actor y fecha. | Validar no edita stock ni borra el dato anterior. |
| LOG-12 / INV-23 / T-26 | Despacho comercial independiente, con custodio, saldo descontado en origen y mercancía en tránsito comercial. | La salida no declara la recepción; despachos idempotentes. |
| LOG-12 / INV-24 / T-27 | Recepción del cliente con receptor, fecha, aceptados, rechazados y referencias. | No se puede recibir más de lo despachado; el rechazo no se reintegra automáticamente. |
| LOG-02 / T-30 | Reserva local de stock verificado para un pedido, seguida de despacho comercial desde la misma ubicación. | Requiere conteo válido concordante, no crea traspaso ficticio y conserva auditoría. |

## Pendientes expresos
1. D-01 y D-16: política oficial de saldos/ajustes, conciliación y sustitución del papel.
2. D-02 y D-13: uso de kilogramos decimales para reservas/traspasos, conversiones, precios y remisiones (las cantidades de negocio existentes siguen siendo enteras).
3. D-07: permisos por área, puesto y delegación (se usa operador/supervisor básico).
4. D-14 y D-17: firma electrónica, pruebas de recepción y política de evidencia.
5. Entrega directa desde inventario local ya registrado se incluye de forma conservadora, **sujeta a conteo físico verificado**. Faltan devoluciones físicas de clientes y reintegro con inspección.
6. Validación presencial de T-16 a T-30 por los responsables. Este PR no debe considerarse aprobación operacional ni garantía automática del 60%.

La suite de integración de PostgreSQL se amplía con pruebas de conteo y entrega comercial. Revisar resultados completos de CI antes de integrar.
