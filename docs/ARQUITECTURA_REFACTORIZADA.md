# Arquitectura refactorizada SGTL — 12 de noviembre de 2026

## Principios de la intervención
- Se reorganizó el código existente por dominio, sin crear carpetas vacías ni proveedores de estado innecesarios.
- Frontend React/Next.js permanece en JSX; hooks y utilidades sin JSX permanecen en JS.
- Backend NestJS y DTO permanecen en TS. Los controllers, módulos, servicios y la infraestructura transaccional tienen responsabilidades diferenciadas.
- **No se modificó el esquema Prisma** ni se ejecutó migración destructiva; los contratos HTTP actuales no cambian.
- Reglas de cierre, cancelación, roles y trazabilidad por despacho están pendientes de decisión empresarial; no se inventaron políticas para completar pantallas.

## Estructura y flujo de datos

Cada URL de App Router tiene un page.jsx que compone el dominio correspondiente. Workspace dibuja la estructura de la página en el servidor. La lista de todas las páginas ya no se importa desde un componente cliente. El catálogo shared/workspace/data/navigation.js agrupa enlaces del lateral y enlaces locales por área.

WorkspaceProvider crea una instancia de useWorkspaceData por pantalla. El hook consulta las claves declaradas en data/queries.js a través de services/workspace.service.js y el cliente HTTP compartido. El botón Actualizar, la página, los avisos y el diálogo de creación consumen el mismo estado mediante useWorkspace. Refrescar después de guardar actualiza la tabla que ya está montada. Selecciones de fila, filtros y cantidades pertenecen al componente que los edita.

| Responsabilidad | Archivo o carpeta bajo apps/web/src |
| --- | --- |
| Entradas de URL | app/**/page.jsx |
| Estructura, navegación, mensajes y diálogo reutilizable | shared/workspace/componentes/ |
| Definición, proveedor y consumo del contexto | shared/workspace/contexts/, providers/ y hooks/ |
| Configuración de navegación y recursos de cada vista | shared/workspace/data/ |
| Consultas paralelas a la API | shared/workspace/services/ |
| Reintentos y escrituras durante la operación del traspaso | modulos/traspasos/hooks/useTransferMovements.js |
| Detalle comercial y detalle logístico | modulos/pedidos/paginas/OrderDetailPage.jsx y modulos/traspasos/paginas/TransferTracePage.jsx |
| Encabezado y retorno desde los detalles | shared/componentes/DetailHeader.jsx |
| Controles de formulario, tablas e indicadores | shared/componentes/ y shared/ui/ |
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

## Aislamiento y recuperación

El proveedor pertenece a una pantalla. Consultar o refrescar una sección cancela la consulta anterior, y el desmontaje cancela las lecturas en curso. Una lectura dispone de 15 segundos. Una respuesta sin las colecciones obligatorias muestra un error recuperable. Los errores de escritura se comunican a quien inició la operación; el límite de lectura no altera la idempotencia de comandos.

WorkspaceContent conserva encabezado y navegación si falla el contenido y ofrece un nuevo intento. ViewBoundary delimita la excepción de renderizado del componente descendiente y vuelve a cargar datos al reintentar. Un fallo del layout raíz, de una dependencia global o de toda la API puede seguir afectando varias rutas.

## Organización de los módulos

- **incidencias**: AlertsPage, AuthorizationsPage, IncidenciasPage.
- **inventario**: InventarioPage, MovementsPage, ReservationsPage.
- **pedidos**: CancellationsPage, ClientsPage, OrderDetailPage, PedidosPage.
- **supervision**: AdministrationPage, AuditoriaPage, OverviewPage, ReportsPage, SearchPage.
- **traspasos**: DispatchesPage, PreparationPage, ReceiptsPage, TransferTracePage, TransitPage, TraspasosPage.

## Decisiones abiertas
1. Autoridad definitiva del inventario (sistema/ERP).
2. Transiciones de estado para varios despachos, cierre parcial y recepción con diferencias.
3. Política de cancelación, permisos, custodia, firmas y evidencias.
4. Autenticación real, autorización por sucursal y auditoría de actor autenticado.
5. Paginación y APIs de detalle; aún se consultan listas completas para algunos detalles.
6. Aceptación con personal de almacén, recepción y ventas.

**Estado:** refactorización estructural; pendiente la validación funcional de negocio y las decisiones anteriores.

## Mapa de dependencias

La ruta en app compone Workspace y la página de dominio. WorkspaceProvider posee el estado remoto y usa useWorkspaceData para coordinar consultas, avisos y refrescos. Las páginas y controles consumen ese estado con useWorkspace. Los formularios conservan su captura local. El servicio workspace.service interpreta el catálogo de recursos y usa apiClient. Los controladores Nest reciben los comandos y los servicios de dominio ejecutan las transacciones en PostgreSQL.

Autorizaciones compone ExceptionRequestForm y ExceptionDecisions. Los tipos están en data/exceptionTypes y la selección de registros en utils/exceptionTargets. TransferDetail comparte el SKU seleccionado con ReceiptControls, que conserva su conteo e inspección locales. Pedidos deriva reservas y faltantes relacionados mediante utils/orderTrace. Pedidos y Traspasos comparten DetailHeader. El catálogo de inventario y la validación de reservas usan la misma política de vigencia ERP en el backend.

## Árbol de carpetas del frontend

```text
src/
  app/
    administracion/
    alertas/
    auditoria/
    autorizaciones/
    buscar/
    cancelaciones/
    clientes/
    despachos/
    incidencias/
    inventario/
    movimientos/
    pedidos/
      [id]/
    preparacion/
    recepciones/
    reportes/
    reservas/
    transito/
    traspasos/
      [id]/
  modulos/
    incidencias/
      componentes/
      data/
      paginas/
      utils/
    inventario/
      paginas/
    pedidos/
      componentes/
      data/
      paginas/
      utils/
    supervision/
      paginas/
    traspasos/
      componentes/
      hooks/
      paginas/
  shared/
    componentes/
    services/
    styles/
    ui/
    utils/
    workspace/
      componentes/
      contexts/
      data/
      hooks/
      providers/
      services/
      styles/
```
