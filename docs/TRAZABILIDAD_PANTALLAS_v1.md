# Trazabilidad funcional de pantallas SGTL

Versión: ampliación MVP 2026-11-12. Base: árbol de conocimiento SGTL v6.0. Las pantallas no sustituyen la aprobación de reglas de negocio ni prueban el funcionamiento de una operación.

| Rutas | UX | Regla o pendiente | QA |
| --- | --- | --- | --- |
| /, /reportes, /alertas | FIG-03, FIG-12 | LOG-12-LISTO, PM-H-18, PM-H-21 | QA-T-08, QA-T-22 |
| /pedidos, /clientes, /pedidos/[id] | FIG-04 | LOG-02, LOG-12 | QA-T-01, QA-T-08 |
| /traspasos, /traspasos/[id] | FIG-05 | LOG-03, PM-H-04 | QA-T-01, QA-T-05 |
| /inventario, /reservas | FIG-06 | LOG-04-FQR, LOG-17-CONCURRENCIA, PM-H-01, PM-H-02 | QA-T-04, QA-T-06 |
| /movimientos, /preparacion, /despachos, /transito | FIG-07 | LOG-04-TRANSITO, PM-H-08, PM-H-10 | QA-T-03, QA-T-09 |
| /recepciones | FIG-08 | LOG-05, PM-H-09 | QA-T-02, QA-T-10 |
| /incidencias, /cancelaciones | FIG-09 | LOG-07-CANCELACION, PM-H-11 | QA-T-03, QA-T-25 |
| /autorizaciones | FIG-10 | PM-H-05, PM-H-12 | QA-T-17, QA-T-18 |
| /auditoria | FIG-11 | LOG-17-AUDIT, PM-H-14 | QA-T-15, QA-T-24 |
| /administracion, /buscar | FIG-13, FIG-02 | PM-H-12 | QA-T-17, QA-T-21 |

## Organización aplicada

- Workspace.jsx: shell, navegación y mensajes; OverviewPage.jsx: resumen; useWorkspaceData.js: estado remoto por sección.
- CreateOrder.jsx, CreateTransfer.jsx, CreateIncident.jsx y TransferDetail.jsx: formularios por dominio; FormFields.jsx: controles comunes.
- Páginas individuales bajo features/reservas, preparacion, despachos, transito, recepciones, cancelaciones y movimientos.
- Páginas individuales bajo features/alertas, autorizaciones y administracion.
- Páginas individuales bajo features/reportes, clientes y buscar.
- features/trazabilidad/pages/EntityDetail.jsx: trazabilidad individual compartida entre pedidos y traspasos.
- ModuleKit.jsx: tablas, estados, indicadores, progreso, vacíos, avisos y búsqueda reutilizables.
- Rutas Next.js dedicadas con parámetros para detalle.

## Limitaciones

Los módulos sin endpoint de escritura no presentan acciones ficticias. El MVP no está listo para producción por falta de autenticación real, control por sucursal, evidencias, cancelaciones compensatorias, aprobaciones y pruebas transaccionales E2E. Los datos de tránsito son agregados, no ubicación verificada. Los valores de reportes son conteos actuales, no SLA confirmados.

La referencia original del árbol es SGTL v6.0: preservar las decisiones D-01 y las políticas aún pendientes.

Backend: `modules/pedidos`, `modules/traspasos`, `modules/incidencias`, `modules/catalogos`, `modules/auditoria`, y `shared/database` para Prisma y transacciones. Los endpoints originales se mantienen.
