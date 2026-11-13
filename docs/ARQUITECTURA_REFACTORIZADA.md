# Arquitectura refactorizada SGTL — 12 de noviembre de 2026

## Principios de la intervención
- Se reorganizó el código existente por dominio, sin crear carpetas vacías ni proveedores de estado innecesarios.
- Frontend React/Next.js permanece en JSX; hooks y utilidades sin JSX permanecen en JS.
- Backend NestJS y DTO permanecen en TS. Los controllers, módulos, servicios y la infraestructura transaccional tienen responsabilidades diferenciadas.
- **No se modificó el esquema Prisma** ni se ejecutó migración destructiva; los contratos HTTP actuales no cambian.
- Reglas de cierre, cancelación, roles y trazabilidad por despacho están pendientes de decisión empresarial; no se inventaron políticas para completar pantallas.

## Estructura y flujo de datos

Cada URL de App Router tiene un page.jsx que compone el dominio correspondiente. Workspace dibuja la estructura de la página en el servidor. La lista de todas las páginas ya no se importa desde un componente cliente. El catálogo features/workspace/data/navigation.js agrupa enlaces del lateral y enlaces locales por área.

WorkspaceProvider crea una instancia de useWorkspaceData por pantalla. El hook consulta las claves declaradas en data/queries.js a través de services/workspace.service.js y el cliente HTTP compartido. El botón Actualizar, la página, los avisos y el diálogo de creación consumen el mismo estado mediante useWorkspace. Refrescar después de guardar actualiza la tabla que ya está montada. Selecciones de fila, filtros y cantidades pertenecen al componente que los edita.

| Responsabilidad | Archivo o carpeta bajo apps/web/src |
| --- | --- |
| Entradas de URL | app/**/page.jsx |
| Estructura, navegación, mensajes y diálogo reutilizable | features/workspace/components/ |
| Definición, proveedor y consumo del contexto | features/workspace/contexts/, providers/ y hooks/ |
| Configuración de navegación y recursos de cada vista | features/workspace/data/ |
| Consultas paralelas a la API | features/workspace/services/ |
| Reintentos y escrituras durante la operación del traspaso | features/traspasos/hooks/useTransferMovements.js |
| Detalle comercial y detalle logístico | features/pedidos/pages/OrderDetailPage.jsx y features/traspasos/pages/TransferTracePage.jsx |
| Encabezado y retorno desde los detalles | features/trazabilidad/components/DetailHeader.jsx |
| Controles de formulario, tablas e indicadores | shared/components/ y shared/ui/ |
| Cálculos de presentación reutilizables | shared/utils/quantities.js |

Para agregar una vista, crear la página de dominio y la ruta que la compone, registrar sus consultas y añadir un enlace en su área. Para añadir un campo que afecta únicamente un formulario, mantener su estado dentro de ese formulario. Una regla que cambia saldos o acepta operaciones corresponde al servicio de NestJS.

## Navegación del MVP

- Resumen incluye búsqueda, reportes, auditoría y administración.
- Pedidos incluye clientes y cancelaciones.
- Traspasos incluye preparación, despachos, tránsito y recepciones.
- Inventario incluye reservas y movimientos.
- Incidencias incluye alertas y autorizaciones.
- Los detalles de pedidos y traspasos se abren desde el folio.

## Fuentes de diseño técnico

[Organización de proyectos con App Router](https://nextjs.org/docs/app/getting-started/project-structure) · [Server y Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) · [Context](https://react.dev/learn/passing-data-deeply-with-context) · [Hooks personalizados](https://react.dev/learn/reusing-logic-with-custom-hooks).

## Reutilización
- ModuleKit.jsx: tablas usadas también por Pedidos, Inventario, Traspasos e Incidencias; estados, indicadores, paneles, estados vacíos, avisos, búsqueda y barras de progreso.
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
- Se incorporaron escenarios de integración con PostgreSQL de prueba para reserva concurrente, despacho, recepción, idempotencia y auditoría; sus resultados dependen del último workflow de CI. No se ejecutaron pruebas E2E de interfaz ni validaciones de UX con usuarios.
- Las pruebas con servicios simulados revisan negativas de reservas, despachos y recepciones. Se agregó un conjunto independiente contra PostgreSQL para verificar transacciones; aún faltan E2E completos por usuario y sucursal.
- No existe configuración de linter backend independiente en esta versión; TypeScript se comprueba en el build.

## Decisiones abiertas
1. Autoridad definitiva del inventario (sistema/ERP).
2. Transiciones de estado para varios despachos, cierre parcial y recepción con diferencias.
3. Política de cancelación, permisos, custodia, firmas y evidencias.
4. Autenticación real, autorización por sucursal y auditoría de actor autenticado.
5. Paginación y APIs de detalle; aún se consultan listas completas para algunos detalles.
6. CI con PostgreSQL aislado, fixtures y validación E2E.

**Estado:** refactorización estructural; pendiente la validación funcional de negocio y las decisiones anteriores.
