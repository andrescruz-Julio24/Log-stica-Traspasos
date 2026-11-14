# SGTL v2.1 · Aceptación T-18, T-21, T-23, T-24, T-27

Referencia estricta: **Planteamiento_Sistema_Trazabilidad_Logistica_v2.1_Integrado(2).pdf**, págs. 5–16; requerimientos LOG-02, LOG-05, LOG-06, LOG-07, LOG-09, LOG-12 e INV-04/05/10/11/13/20/22/23/24.

## Matriz de trazabilidad

| Escenario | Backend y modelo | Interfaz y pruebas | Límites |
|---|---|---|---|
| **T-18** | `WeightOrderLine`, `WeightShipment`, `WeightClientReception`. Pedido comercial en KG; cajas/peso promedio como estimación, reserva, peso real y diferencia decimal; `accountingRef`. Nunca calcula dinero ni asume tolerancia. | `/pedidos-peso`, componentes `CreateWeightOrder`, `WeightOrderActions`; `t18-t21-t23-t24-t27.integration.spec.ts` comprueba 30 kg nominal, 29.4 real y -0.6 diferencia. | D-13: precio unitario, fórmula, redondeo, autorización e integración real con Contabilidad. |
| **T-21** | `TransferSchedule` histórico por evento. Requiere pedido con fecha compromiso, destino coincidente y reserva efectivamente vinculada; llegada prevista antes de compromiso; idempotencia. | `TransferSchedulePanel` en `/traspasos/[id]`; prueba programación de mañana y despacho único por reintento. | Horarios reales, ruta/vehículo, disponibilidad global de recursos y automatización de cargas. |
| **T-23** | `DriverProfile`, `Trip`, `DriverAssignment` apéndice histórico. Altas y disponibilidad supervisadas, chofer regular/apoyo, asignación y sustitución con motivo, autor, vigencia temporal, verificación de colisiones temporales y relación opcional de viaje con despachos PIEZA/KG/comercial. | `/choferes`, `DriverRegistration`, `TripForm`, selectores de viajes activos en despachos; prueba relevo regular→apoyo, bloqueo de solapamiento e idempotencia. | D-05/D-07: nómina/horarios/vehículos/capacidad, delegaciones concretas y autorización por puesto. El vínculo a viaje es opcional para preservar operativa histórica. |
| **T-24** | `CommercialReturn`, `ReturnIntake`, `AccountingNotice`. Regreso de salida pesada: cantidad prevista vs pesaje real, incidencia si difieren, constancia de papel contable REFERENCIAL; jamás se reintegra automáticamente. Reintegrar exige inspección de supervisor, condición usable/bloqueada y referencia de conciliación si hay diferencia. | `/devoluciones`; `CreateWeightReturn`, `ReturnIntakeForm`, `ReturnResolutionForm`. Prueba 29.4 regresan 28.9, incidencia, referencia Contabilidad y reintegro separado. | D-06/D-18: tolerancias de pesaje y matriz de responsables/condiciones sanitarias; no se comunica aún automáticamente la papeleta a Contabilidad ni existe firma electrónica. |
| **T-27** | `EntregasService.confirm` abre `CommercialReturn` por cada rechazo en piezas; `PedidosPesoService.confirmCustomer` vincula rechazo en KG con devolución/incident. Resultado comercial independiente de `READY` mediante `EntregasService.deliveryStatus`. | `/pedidos/[id]`, `/pedidos-peso` y `/devoluciones`; pruebas para 4 aceptadas + 2 rechazadas y para 24 kg aceptados + 5.4 kg rechazados. | D-14/D-17: medio de firma o constancia formal; casos complejos de entrega parcial en distintos viajes requieren mayor desarrollo. |

## Invariantes verificadas por las pruebas de integración

- Ningún despacho o recepción de devolución puede duplicar stock por repetición de la misma clave de operación.
- Un rechazo comercial crea un expediente vinculado al evento y una incidencia bloqueante; no crea disponibilidad.
- La **llegada física** de una devolución no suma inventario; el **reintegro supervisado** queda separado, auditado y clasificado como utilizable o bloqueado.
- Una discrepancia de peso crea incidencia y referencia de papeleta; su resolución exige un identificador de conciliación aportado por el responsable, sin inventar un ajuste de precio.
- Una reserva anticipada mantiene vinculada la línea del pedido con su fecha de entrega; no equivale a despacho.
- El reemplazo de conductor se guarda como un nuevo `DriverAssignment` y registra chofer anterior, nuevo, autor, causa y vigencia.

## Límites para una aprobación operativa real

Estas cinco verticales quedan implementadas y cubiertas por pruebas PostgreSQL, pero **no equivale a certificación completa en producción**. Falta la aceptación presencial con responsables y las decisiones abiertas D-05, D-06, D-07, D-13, D-14, D-17 y D-18. El sistema aún tiene roles generales operador/supervisor y referencias de evidencia/documentos, no control fino por puesto o firma legal. El cálculo de dinero y las operaciones de facturación quedan expresamente fuera hasta definir su contrato.

## Publicación

PR #6 sobre la rama de PR #5, ambas en desarrollo; `main` se conserva sin modificaciones. Revisar CI del HEAD del PR y no fusionar hasta validar con personal autorizado.
