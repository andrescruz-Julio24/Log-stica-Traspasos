# SGTL — MVP de trazabilidad logística

**MVP local, NO apto para producción.** Next.js/React con componentes y páginas `.jsx`, NestJS en TypeScript, Prisma y PostgreSQL.

## Ejecutar
1. Node.js >=22, npm y Docker instalados.
2. npm install
3. docker compose up -d db
4. Copiar .env.example a apps/api/.env
5. npm run db:generate
6. Desde apps/api ejecutar npx prisma migrate deploy
7. npm run db:seed
8. npm run dev
9. http://localhost:3000 y http://localhost:5200/api/health

## Operación disponible
Pedidos y traspasos multiproducto, prioridades y compromisos auditados, asignaciones por despacho, recepción parcial e inspección definitiva, incidencias, solicitudes de excepción, compensaciones y verificación de inventario externo. La configuración de operadores, actualización de bases existentes, pasos de prueba y límites del sistema se describen en [Operación](docs/OPERACION.md).

## Arquitectura
apps/web: rutas Next.js y componentes JS. apps/api: NestJS/DTO/Prisma TS. Docker Compose levanta PostgreSQL de desarrollo. Next reenvía peticiones /api a Nest mediante rewrite same-origin.

Ver docs/MVP_SCOPE.md para pendientes y criterios de validación.

## Convenciones de código

- `apps/web/src/app/**/*.jsx`, `modulos/**/*.jsx` y `shared/ui/**/*.jsx`: componentes y páginas React que renderizan JSX.
- `apps/web/src/shared/services/apiClient.js`: utilidades JavaScript sin JSX (se conserva `.js`).
- `apps/api/src/**/*.ts`: backend NestJS con TypeScript.
- Se preservan imports sin extensión para permitir resolución automática de `.jsx` por Next.js.

## Arquitectura modular (frontend JSX / backend TypeScript)

El código se organiza por dominio y responsabilidad. Lee `docs/ARQUITECTURA_REFACTORIZADA.md` para la distribución por responsabilidad, el flujo de datos y la navegación. WorkspaceProvider comparte las consultas y acciones dentro de cada pantalla. Los formularios y filtros mantienen su propio estado. Las migraciones versionadas están en apps/api/prisma/migrations.

## Validación de integración con PostgreSQL

GitHub Actions levanta un PostgreSQL temporal, crea el esquema mediante Prisma y ejecuta pruebas de reserva concurrente, despacho, recepción parcial, auditoría e idempotencia. Las pruebas unitarias aisladas se ejecutan con `npm test`.

La integración local **sólo** debe ejecutarse sobre una base de datos de pruebas separada de cualquier base con información real, configurando `DATABASE_URL` y `SGTL_INTEGRATION_TEST_DB=1`, y ejecutando `npm run test:integration -w @sgtl/api`. El comando modifica esa base insertando fixtures de prueba.
