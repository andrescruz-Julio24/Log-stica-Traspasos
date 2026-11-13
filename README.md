# SGTL — MVP de trazabilidad logística

**MVP local, NO apto para producción.** Next.js/React con componentes y páginas `.jsx`, NestJS en TypeScript, Prisma y PostgreSQL.

## Ejecutar
1. Node.js >=22, npm y Docker instalados.
2. npm install
3. docker compose up -d db
4. Copiar .env.example a apps/api/.env
5. npm run db:generate
6. npm run db:migrate (nombrar migración init_sgtl)
7. npm run db:seed
8. npm run dev
9. http://localhost:3000 y http://localhost:5200/api/health

## Incluido
Dashboard, clientes, pedidos, traspasos, inventario por ubicación, reserva de stock, despacho, recepción parcial, incidencias, bitácora y validaciones del servidor. Hay transacciones serializables, versionado CAS de stock y claves de idempotencia obligatorias para despacho y recepción.

## Prueba funcional
Crear un pedido de cliente para Punto de Venta Centro con SKU-001, crear un traspaso desde Almacén Central al mismo destino, reservar con la línea del pedido, despachar, registrar aceptación, y revisar Inventario, Pedidos y Auditoría.

## Límites y riesgos
No existe autenticación empresarial, RBAC, permisos por sucursal, integración ERP, evidencia, cancelaciones, cierres excepcionales, conciliación de incidencias ni idempotencia para reservas. El backend no inicia con NODE_ENV=production. El valor de cabecera x-demo-actor NO es identidad verificable. Las reglas de autorización y políticas definitivas no están implementadas. Cierre mostrado significa que aceptado iguala despachado, NO cierre administrativo autorizado. No desplegar públicamente.

El seed inicial muestra existencias reservadas para demostrar el cálculo de disponible; esas reservas iniciales no tienen documentos relacionados y no son adecuadas para una contabilidad productiva. Para uso real se requiere migrarlas a registros individualizados.

## Arquitectura
apps/web: rutas Next.js y componentes JS. apps/api: NestJS/DTO/Prisma TS. Docker Compose levanta PostgreSQL de desarrollo. Next reenvía peticiones /api a Nest mediante rewrite same-origin.

Ver docs/MVP_SCOPE.md para pendientes y criterios de validación.

## Convenciones de código

- `apps/web/src/app/**/*.jsx`, `features/**/*.jsx` y `shared/ui/**/*.jsx`: componentes y páginas React que renderizan JSX.
- `apps/web/src/shared/api/client.js`: utilidades JavaScript sin JSX (se conserva `.js`).
- `apps/api/src/**/*.ts`: backend NestJS con TypeScript.
- Se preservan imports sin extensión para permitir resolución automática de `.jsx` por Next.js.

## Arquitectura modular (frontend JSX / backend TypeScript)

El código se organiza por dominio y responsabilidad. Lee `docs/ARQUITECTURA_REFACTORIZADA.md` para el árbol real, archivos migrados y validaciones. No se han creado providers ni contextos globales porque las pantallas actuales sólo necesitan estado de consulta local. Se conservó Prisma `schema.prisma` sin migraciones nuevas.

## Validación de integración con PostgreSQL

GitHub Actions levanta un PostgreSQL temporal, crea el esquema mediante Prisma y ejecuta pruebas de reserva concurrente, despacho, recepción parcial, auditoría e idempotencia. Las pruebas unitarias aisladas se ejecutan con `npm test`.

La integración local **sólo** debe ejecutarse sobre una base de datos de pruebas separada de cualquier base con información real, configurando `DATABASE_URL` y `SGTL_INTEGRATION_TEST_DB=1`, y ejecutando `npm run test:integration -w @sgtl/api`. El comando modifica esa base insertando fixtures de prueba.
