# Arquitectura refactorizada SGTL — 12 de noviembre de 2026

## Principios de la intervención
- Se reorganizó el código existente por dominio, sin crear carpetas vacías ni proveedores de estado innecesarios.
- Frontend React/Next.js permanece en JSX; hooks y utilidades sin JSX permanecen en JS.
- Backend NestJS y DTO permanecen en TS. Los controllers, módulos, servicios y la infraestructura transaccional tienen responsabilidades diferenciadas.
- **No se modificó el esquema Prisma** ni se ejecutó migración destructiva; los contratos HTTP actuales no cambian.
- Reglas de cierre, cancelación, roles y trazabilidad por despacho están pendientes de decisión empresarial; no se inventaron políticas para completar pantallas.

## Árbol real de archivos fuente (después de la reorganización)

```text
API/app.controller.ts
API/app.module.ts
API/main.ts
API/modules/auditoria/auditoria.controller.ts
API/modules/auditoria/auditoria.module.ts
API/modules/auditoria/auditoria.service.ts
API/modules/catalogos/catalogos.controller.ts
API/modules/catalogos/catalogos.module.ts
API/modules/catalogos/catalogos.service.ts
API/modules/incidencias/dto/incidencias.dto.ts
API/modules/incidencias/incidencias.controller.ts
API/modules/incidencias/incidencias.module.ts
API/modules/incidencias/incidencias.service.ts
API/modules/pedidos/dto/pedidos.dto.ts
API/modules/pedidos/pedidos.controller.ts
API/modules/pedidos/pedidos.module.ts
API/modules/pedidos/pedidos.service.ts
API/modules/traspasos/dto/traspasos.dto.ts
API/modules/traspasos/tests/logistica.spec.ts
API/modules/traspasos/tests/traspasos.service.spec.ts
API/modules/traspasos/traspasos.controller.ts
API/modules/traspasos/traspasos.module.ts
API/modules/traspasos/traspasos.service.ts
API/shared/database/database.module.ts
API/shared/database/prisma.service.ts
API/shared/database/transaction.service.ts
API/shared/domain/assertions.ts
WEB/app/[module]/page.jsx
WEB/app/globals.css
WEB/app/layout.jsx
WEB/app/page.jsx
WEB/app/pedidos/[id]/page.jsx
WEB/app/traspasos/[id]/page.jsx
WEB/features/administracion/pages/AdministrationPage.jsx
WEB/features/alertas/pages/AlertsPage.jsx
WEB/features/auditoria/pages/AuditoriaPage.jsx
WEB/features/autorizaciones/pages/AuthorizationsPage.jsx
WEB/features/buscar/pages/SearchPage.jsx
WEB/features/cancelaciones/pages/CancellationsPage.jsx
WEB/features/clientes/pages/ClientsPage.jsx
WEB/features/dashboard/pages/OverviewPage.jsx
WEB/features/despachos/pages/DispatchesPage.jsx
WEB/features/incidencias/components/CreateIncident.jsx
WEB/features/incidencias/pages/IncidenciasPage.jsx
WEB/features/inventario/pages/InventarioPage.jsx
WEB/features/movimientos/pages/MovementsPage.jsx
WEB/features/pedidos/components/CreateOrder.jsx
WEB/features/pedidos/pages/PedidosPage.jsx
WEB/features/preparacion/pages/PreparationPage.jsx
WEB/features/recepciones/pages/ReceiptsPage.jsx
WEB/features/reportes/pages/ReportsPage.jsx
WEB/features/reservas/pages/ReservationsPage.jsx
WEB/features/transito/pages/TransitPage.jsx
WEB/features/traspasos/components/CreateTransfer.jsx
WEB/features/traspasos/components/TransferDetail.jsx
WEB/features/traspasos/pages/TraspasosPage.jsx
WEB/features/trazabilidad/pages/EntityDetail.jsx
WEB/features/workspace/components/ModuleViews.jsx
WEB/features/workspace/components/Workspace.jsx
WEB/features/workspace/data/navigation.js
WEB/features/workspace/data/queries.js
WEB/features/workspace/hooks/useWorkspaceData.js
WEB/features/workspace/services/workspace.service.js
WEB/shared/components/FormFields.jsx
WEB/shared/components/TransferLink.jsx
WEB/shared/services/apiClient.js
WEB/shared/styles/base.css
WEB/shared/styles/details.css
WEB/shared/styles/modules.css
WEB/shared/ui/ModuleKit.jsx
WEB/shared/utils/quantities.js
```

## Migraciones y consolidaciones
| Antes | Después | Criterio |
| --- | --- | --- |
| features/dashboard/Dashboard.jsx | features/workspace/components/Workspace.jsx; features/dashboard/pages/OverviewPage.jsx; features/{pedidos,traspasos,inventario,incidencias,auditoria}/pages/ | Separar layout, vistas y estado |
| features/modules/OperationsViews.jsx | features/{reservas,preparacion,despachos,transito,recepciones,cancelaciones,movimientos}/pages/ | Vistas por dominio operativo |
| features/modules/GovernanceViews.jsx | features/{alertas,autorizaciones,administracion}/pages/ | Control y permisos |
| features/modules/InsightViews.jsx | features/{clientes,reportes,buscar}/pages/ | Consultas y agregación |
| features/modules/ModuleViews.jsx | features/workspace/components/ModuleViews.jsx | Registro de vistas bajo workspace |
| features/operations/WorkflowForms.jsx | features/{pedidos,traspasos,incidencias}/components/; shared/components/FormFields.jsx | Formularios por dominio, controles comunes |
| features/details/EntityDetail.jsx | features/trazabilidad/pages/EntityDetail.jsx | Detalle compartido entre entidades |
| shared/api/client.js | shared/services/apiClient.js | Comunicación HTTP |
| app/globals.css (único archivo de estilos) | shared/styles/base.css, modules.css, details.css; globals.css como entrada | Separar estilos base, módulos y detalle |
| api/src/domain.service.ts | modules/{pedidos,traspasos,incidencias,catalogos,auditoria}/*.service.ts; shared/database/transaction.service.ts | Aislar casos de uso y transacciones |
| api/src/app.controller.ts (todos los endpoints) | app.controller.ts (health) y controllers por módulo | Responsabilidad de endpoints |
| api/src/dto.ts | modules/{pedidos,traspasos,incidencias}/dto/*.dto.ts | Validaciones por dominio |
| api/src/prisma.service.ts | shared/database/prisma.service.ts | Infraestructura de acceso a datos |
| api/src/domain.spec.ts | modules/traspasos/tests/logistica.spec.ts | Ubicar pruebas junto al módulo |

## Reutilización
- ModuleKit.jsx: tablas, estados, indicadores, paneles, estados vacíos, avisos, búsqueda y barras de progreso.
- FormFields.jsx: Quantity y Select (inputs de los formularios).
- TransferLink.jsx: vínculo consistente entre traspasos y módulos.
- quantities.js: sumas, disponibilidad calculada y porcentajes puros.
- useWorkspaceData.js + workspace.service.js: estado de consulta, carga, errores y actualización por sección.
- TransactionService: transacción serializable, idempotencia, auditoría en el mismo commit.
- DatabaseModule: proveedor de Prisma para servicios de dominio.

## Endpoints conservados
- GET /api/health, /api/bootstrap, /api/orders, /api/transfers, /api/incidents, /api/audit.
- POST /api/orders, /api/transfers, /api/incidents.
- POST /api/transfers/:id/reservations, /dispatches, /receipts.
- El frontend no realiza escrituras directas en PostgreSQL.

## Comprobaciones
- GitHub Actions ejecuta instalación, generación de Prisma Client, pruebas Vitest, ESLint frontend y compilación de NestJS/Next.js (ver último run).
- No se realizaron pruebas E2E ni de concurrencia contra PostgreSQL real; tampoco se verificó el diseño mediante pruebas con usuarios.
- Las pruebas con servicios simulados revisan negativas de reservas, despachos y recepciones; no sustituyen la integración transaccional.
- No existe configuración de linter backend independiente en esta versión; TypeScript se comprueba en el build.

## Decisiones abiertas
1. Autoridad definitiva del inventario (sistema/ERP).
2. Transiciones de estado para varios despachos, cierre parcial y recepción con diferencias.
3. Política de cancelación, permisos, custodia, firmas y evidencias.
4. Autenticación real, autorización por sucursal y auditoría de actor autenticado.
5. Paginación y APIs de detalle; aún se consultan listas completas para algunos detalles.
6. CI con PostgreSQL aislado, fixtures y validación E2E.

**Estado:** refactorización estructural; pendiente la validación funcional de negocio y las decisiones anteriores.
