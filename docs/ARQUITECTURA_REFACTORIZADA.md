# Arquitectura refactorizada SGTL — 13 de noviembre de 2026

## Principios de la intervención
- Se reorganizó el código existente por dominio, sin crear carpetas vacías ni proveedores de estado innecesarios.
- Frontend React/Next.js permanece en JSX; hooks y utilidades sin JSX permanecen en JS.
- Backend NestJS y DTO permanecen en TS. Los controllers, módulos, servicios y la infraestructura transaccional tienen responsabilidades diferenciadas.
- **No se modificó el esquema Prisma** ni se ejecutó migración destructiva; los contratos HTTP actuales no cambian.
- Reglas de cierre, cancelación, roles y trazabilidad por despacho están pendientes de decisión empresarial; no se inventaron políticas para completar pantallas.

## Estructura y flujo de datos

Cada URL de App Router tiene un page.jsx que compone el dominio correspondiente. Workspace dibuja la estructura de la página en el servidor. La lista de todas las páginas ya no se importa desde un componente cliente. El catálogo shared/workspace/data/navigation.js agrupa enlaces del lateral y enlaces locales por área.

WorkspaceProvider crea una instancia de useWorkspaceData por pantalla. El hook consulta los recursos que la ruta importa de modulos/<dominio>/data/queries.js a través de services/workspace.service.js y el cliente HTTP compartido. El botón Actualizar, la página, los avisos y el diálogo de creación consumen el mismo estado mediante useWorkspace. Refrescar después de guardar actualiza la tabla que ya está montada. Selecciones de fila, filtros y cantidades pertenecen al componente que los edita.

| Responsabilidad | Archivo o carpeta bajo apps/web/src |
| --- | --- |
| Entradas de URL | app/**/page.jsx |
| Estructura, navegación, mensajes y diálogo reutilizable | shared/workspace/componentes/ |
| Definición, proveedor y consumo del contexto | shared/workspace/contexts/, providers/ y hooks/ |
| Configuración de navegación y recursos de cada vista | shared/workspace/data/navigation.js y modulos/<dominio>/data/queries.js |
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

## Segunda fase: problemas y decisiones

1. Una consulta rechazada descartaba la carga completa. Cada dominio declara sus dependencias de lectura. El proveedor suscribe, agrupa y cancela las solicitudes por recurso en el ámbito de su pantalla.
2. Alertas y Búsqueda admiten datos parciales. La UI identifica fuentes pendientes o fallidas y ofrece reintento individual. Los indicadores sin fuente muestran un guion. Pedidos requiere la colección de pedidos para listar y requiere también el catálogo para habilitar escrituras. En vistas transaccionales que cruzan registros se exige el conjunto declarado completo.
3. La lista de pedidos y el impacto de reabastecimiento se calculaban en el mismo render. Ahora cada panel tiene su propio límite de recuperación. AlertsPage usa una transformación pura para las alertas. El detalle de pedido ya delega sus relaciones a orderTrace; el detalle de traspaso conserva su contrato. ModuleKit mantiene la interfaz de importación existente y delega formatDate a una utilidad pura. Las cinco reglas exclusivas de barras de reportes pertenecen al CSS Module de Supervisión.
4. Cancelaciones consultaba traspasos sin consumirlos. Ahora consulta solo pedidos. Inventario recibe TransferLink desde Traspasos y Traspasos lee el catálogo de prioridades de Pedidos. Son las dependencias directas entre módulos. Los componentes de workspace no importan módulos de negocio.
5. La API de Nest valida escrituras mediante DTO y servicios transaccionales. Se revisaron los recursos HTTP y sus consumidores. Esta fase solo cambia el cliente y sus verificaciones.

## Propiedad y ciclo de vida

| Estado | Propietario y consumidores | Duración y sincronización |
| --- | --- | --- |
| Pedidos, traspasos, incidencias, catálogo y demás recursos | API como fuente; useWorkspaceData alimenta vista, formulario y cabecera | Una instancia por pantalla, estado independiente por recurso. Reintentar una lectura pendiente reutiliza la promesa. Un refresco conserva los datos previos y señala su estado. Un error 401/403 descarta el valor de esa fuente. |
| Resultado de escritura, busy y aviso | act del proveedor; botones, modal y avisos | Una acción explícita. Tras confirmación refresca las fuentes de la pantalla. Las escrituras no se reintentan automáticamente. |
| Captura, filtro, selección, diálogo | Formulario o panel que lo dibuja | Local mientras permanece montado. La ruta identifica el módulo o folio. |
| Claves de reintento de comandos | apiClient y API | sessionStorage de la pestaña hasta confirmación y registro de idempotencia en PostgreSQL. |

No se conserva una caché de saldos al navegar entre módulos. El coste es una nueva lectura al entrar; evita que una vista operativa presente como vigente una consulta hecha antes de una operación en otra pantalla. El catálogo de endpoints compartidos tiene un único transporte. Cada dominio mantiene su política de dependencias.

## Aislamiento y recuperación

Las lecturas tienen límite de 15 segundos y cancelación al desmontar. Los errores de lectura muestran el recurso y un reintento. Las respuestas sin la colección requerida se rechazan antes del render. Una escritura inválida conserva el formulario. La respuesta de un comando confirmado y el estado de su refresco se muestran por separado.

ViewBoundary protege la vista. En Pedidos también protege independientemente tabla e impacto comercial. app/error.jsx y app/global-error.jsx cubren excepciones de segmento y de raíz, respectivamente. Un fallo compartido de infraestructura todavía puede impedir la lectura de varias fuentes.

## Pruebas reproducibles

Desde la raíz, ejecutar npm test, npm run test -w @sgtl/web, npm run lint -w @sgtl/web y npm run build. El workflow levanta PostgreSQL aislado, aplica migraciones, corre la integración de la API, carga las semillas y arranca Nest y Next en localhost. npm run test:e2e -w @sgtl/web requiere SGTL_INTEGRATION_TEST_DB=1 y Chromium de Playwright. El recorrido crea datos solo en la instalación local de prueba.

La suite E2E comprueba consulta y alta de pedido, validación nativa de formulario, rechazo HTTP y nuevo envío manual, detalle por folio, alta de traspaso, reserva, consulta de recepciones, alta de incidencia y bandeja de autorizaciones. Fuerza desconexión, catálogo malformado, excepción de tabla, demora y cambio de página durante la lectura. Ejercita el hook y el proveedor a través de componentes reales. Los límites raíz/segmento se compilan; la prueba de excepción inyectada corresponde al panel. No sustituye una prueba de UX con operadores ni un ejercicio de caída completa de infraestructura.

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
├── app/
│   ├── (supervision)/        # /, /buscar, /reportes, /auditoria, /administracion
│   ├── (pedidos)/           # /pedidos, /pedidos/[id], /clientes, /cancelaciones
│   ├── (traspasos)/         # /traspasos, /traspasos/[id], /preparacion, /despachos, /transito, /recepciones
│   ├── (inventario)/        # /inventario, /reservas, /movimientos
│   └── (incidencias)/       # /incidencias, /alertas, /autorizaciones
├── modulos/
│   ├── pedidos/
│   │   ├── componentes/  ├── paginas/  ├── hooks/
│   │   ├── data/         ├── utils/   └── styles/
│   ├── traspasos/
│   │   ├── componentes/  ├── paginas/  ├── hooks/
│   │   ├── data/         └── styles/
│   ├── supervision/
│   │   ├── componentes/  ├── paginas/  ├── hooks/
│   │   ├── data/         ├── utils/   └── styles/
│   ├── inventario/
│   │   ├── paginas/      ├── hooks/   ├── utils/  └── data/
│   └── incidencias/
│       ├── componentes/  ├── paginas/ ├── hooks/
│       ├── data/         └── utils/
└── shared/
    ├── componentes/         # DetailHeader y DetailLayout
    │   └── styles/
    ├── ui/
    │   ├── componentes/     # Panel, Table, Status, etc.
    │   └── styles/          # Cada componente con su *.module.css
    ├── workspace/
    │   ├── componentes/  ├── hooks/  ├── providers/
    │   ├── contexts/     ├── data/   ├── services/  └── styles/
    ├── services/
    ├── styles/              # Fundamentos y utilidades verdaderamente globales
    └── utils/
```


## Iteración 13-nov-2026 — carpetas y responsabilidades del frontend

Esta iteración trabaja sobre una rama separada para facilitar la revisión sin alterar la rama base.

### Route Groups sin cambios de URL

Los archivos de entrada `app/**/page.jsx` se agruparon bajo `app/(supervision)/`, `app/(pedidos)/`, `app/(traspasos)/`, `app/(inventario)/` y `app/(incidencias)/`. Las carpetas entre paréntesis no participan en las URLs de Next.js: `/buscar`, `/pedidos/[id]`, `/traspasos/[id]` y las demás rutas conservan sus direcciones. Los imports de estas páginas usan el alias `@/` configurado en `apps/web/jsconfig.json`.

### Estilos

Se reemplazaron los archivos agregadores `shared/styles/base.css` y `shared/styles/modules.css` por hojas más pequeñas y organizadas:

- `shared/styles/`: fundamentos y reglas responsivas globales.
- `shared/workspace/styles/`: shell, navegación y layout general.
- `shared/ui/styles/`: controles, tablas, estados, formularios y paneles compartidos.
- `modulos/pedidos/styles/OrderListPanel.module.css`: presentación exclusiva de líneas de pedidos.
- `modulos/traspasos/styles/TransferDetail.module.css`: interfaz operativa del detalle de traspaso.
- `modulos/supervision/styles/`: reportes y reglas propias de administración.

Se conservaron las reglas reutilizables en shared y el orden global de imports para minimizar diferencias visuales. La existencia de estilos compartidos no implica mezclar las reglas de cada módulo.

### Hooks y utilidades de dominio

- `pedidos/hooks/useOrderHistory.js`: consulta de historial con cancelación al desmontar.
- `inventario/hooks/useMovements.js` y `utils/movementEvents.js`: filtro y proyección de eventos logísticos.
- `inventario/hooks/useReservations.js` y `utils/reservationSummary.js`: filtros, relaciones y agregados de reservas.
- `incidencias/hooks/useAlerts.js`: selección local y derivación de alertas usando `utils/alerts.js`.
- `supervision/hooks/useGlobalSearch.js` y `utils/searchEntries.js`: estado del buscador y transformación pura de registros.
- `supervision/hooks/useReportMetrics.js`, `utils/reportMetrics.js`, `data/reportStatuses.js` y `componentes/ReportBar.jsx`: cálculo, configuración y representación de reportes desacoplados.

### Providers: decisión explícita

`shared/workspace/providers/WorkspaceProvider.jsx` administra los datos de cada vista. No se crearon providers artificiales por módulo: un Context de módulo solo será apropiado si existe estado mutable que requiera persistir entre varias rutas o componentes y no sea estado de servidor. Añadir carpetas vacías o duplicar el contexto global no mejora la arquitectura. Se estabilizó la referencia de los datos del workspace con `useMemo` para evitar recalcular proyecciones de manera innecesaria ante renders sin cambios en los recursos.

### Validación

La confirmación del build y las pruebas depende de la ejecución de CI y de las verificaciones posteriores a estos commits. Esta nota describe cambios implementados, no sustituye pruebas funcionales ni visuales.


## Organización de estilos por componente — 13 de noviembre de 2026

### Convención definitiva

- Un componente con reglas propias importa `NombreDelComponente.module.css` desde `styles/` del **mismo módulo**. Las importaciones se escriben en el JSX dueño del estilo, nunca en `app/globals.css`.
- Los componentes reutilizables de `shared/ui/componentes/` tienen CSS Modules homónimos en `shared/ui/styles/`, sin duplicar los estilos en cada consumidor.
- Los componentes estructurales de Workspace utilizan `shared/workspace/styles/Workspace.module.css`, `WorkspaceNavigation.module.css` y `CreateRecordAction.module.css`.
- `shared/componentes/styles/DetailLayout.module.css` es compartido deliberadamente entre detalles de Pedidos y Traspasos. `DetailHeader.module.css` y `modulos/traspasos/styles/TransferTracePage.module.css` cubren sus estilos específicos.
- Los estilos de formulario genéricos, botones, disposición de métricas, responsive y accesibilidad que **usan varias funcionalidades** permanecen en las hojas globales acotadas de `shared/ui/styles/` y `shared/styles/`. No se copian por módulo.
- No se crean archivos de estilos vacíos o con reglas decorativas artificiales para componentes que solo componen otros componentes estilizados.

### Mapa de estilos implementados

| Módulo | Componentes y sus estilos |
| --- | --- |
| `pedidos` | `OrderListPanel → styles/OrderListPanel.module.css` |
| `traspasos` | `TransferDetail → styles/TransferDetail.module.css`; `TransferTracePage → styles/TransferTracePage.module.css` |
| `supervision` | `OverviewPage`, `AuditoriaPage`, `AdministrationPage`, `ReportsPage` y `ReportBar` → archivos CSS Module homónimos en `styles/` |
| `shared/ui` | `Panel`, `Metric`, `Status`, `Table`, `Progress`, `Empty`, `Hint`, `SearchField`, `Unavailable` → archivos CSS Module homónimos |
| `shared/workspace` | `Workspace`, `WorkspaceNavigation`, `CreateRecordAction` → CSS Module propio |

`ModuleKit.jsx` mantiene las exportaciones públicas y delega el código a `shared/ui/componentes/`. Esta fachada evita reescribir los consumidores de todos los módulos.

### Protección contra regresiones de estilo

La prueba `apps/web/tests/component-styles.test.mjs` comprueba que los estilos específicos son importados por sus componentes, que los archivos existen, que `globals.css` importa solo estilos compartidos y que no quedan referencias a los archivos CSS globales sustituidos.

Los resultados de CI se deben consultar en el Pull Request; no sustituye la comprobación visual de cada módulo en diferentes resoluciones de pantalla.
