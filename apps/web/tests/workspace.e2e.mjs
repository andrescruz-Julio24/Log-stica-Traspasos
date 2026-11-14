import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';

if (process.env.SGTL_INTEGRATION_TEST_DB !== '1')
  throw Error('Ejecutar contra la aplicación local con PostgreSQL de pruebas.');
const browser = await chromium.launch(
  process.env.SGTL_CHROMIUM_PATH
    ? {
        executablePath: process.env.SGTL_CHROMIUM_PATH,
        args: ['--no-sandbox', '--single-process', '--disable-dev-shm-usage'],
      }
    : {},
);
try {
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:3000' });
  page.setDefaultTimeout(10000);
  const go = (path) => page.goto(path);
  const button = (name) => page.getByRole('button', { name, exact: true });
  const tag = 'E2E-' + randomUUID().slice(0, 8);
  await go('/pedidos');
  await button('Nuevo pedido').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Crear pedido' }).click();
  assert.ok((await dialog.locator(':invalid').count()) > 0);
  await dialog.locator('[name=customer]').fill(tag);
  // Una escritura fallida conserva el formulario y requiere una nueva acción explícita.
  let writes = 0;
  await page.route('**/api/orders', (r) => {
    if (r.request().method() === 'POST') {
      writes++;
      return r.fulfill({ status: 409, json: { message: 'Fallo de prueba' } });
    }
    return r.continue();
  });
  await dialog.getByRole('button', { name: 'Crear pedido' }).click();
  await dialog.getByText('Fallo de prueba').waitFor();
  assert.equal(writes, 1);
  await page.unroute('**/api/orders');
  await dialog.getByRole('button', { name: 'Crear pedido' }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page
    .getByRole('row')
    .filter({ hasText: tag })
    .getByRole('link')
    .click();
  await page.getByText('Productos solicitados', { exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Entrega efectiva al cliente' }).waitFor();

  await go('/traspasos');
  await button('Nuevo traspaso').click();
  const bootstrap = await (await page.request.get('/api/bootstrap')).json();
  const product = bootstrap.products.find((p) => p.sku === 'SKU-001');
  await dialog
    .locator('[name=originId]')
    .selectOption(
      bootstrap.locations.find((l) => l.name === 'Almacén Central').id,
    );
  await dialog
    .locator('[name=destinationId]')
    .selectOption(
      bootstrap.locations.find((l) => l.name === 'Punto de Venta Centro').id,
    );
  await dialog.locator('[name=productId]').selectOption(product.id);
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/transfers') && r.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Crear traspaso' }).click();
  const transfer = await (await response).json();
  await dialog.waitFor({ state: 'hidden' });
  await page
    .getByRole('row')
    .filter({ hasText: transfer.code })
    .getByRole('button', { name: 'Gestionar' })
    .click();
  const reservation = page.waitForResponse(
    (r) => r.url().endsWith('/reservations') && r.request().method() === 'POST',
  );
  await button('1. Reservar').click();
  assert.ok((await reservation).ok());
  await go('/recepciones');
  await page
    .getByRole('heading', { name: 'Recepciones verificadas' })
    .waitFor();
  await go('/incidencias');
  await button('Registrar incidencia').click();
  await dialog.locator('[name=notes]').fill(tag);
  await dialog.getByRole('button', { name: 'Registrar incidencia' }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByRole('cell', { name: tag, exact: true }).waitFor();
  await go('/autorizaciones');
  await page
    .getByRole('heading', { name: 'Solicitudes y decisiones' })
    .waitFor();

  // La lectura que falla se recupera sin volver a pedir los recursos exitosos.
  let reads = 0;
  page.on('request', (r) => {
    if (r.url().endsWith('/api/orders')) reads++;
  });
  await page.route('**/api/incidents', (r) => r.abort('internetdisconnected'));
  await go('/alertas');
  await button('Reintentar Incidencias').waitFor();
  await page.getByText('Atención operativa', { exact: true }).waitFor();
  assert.equal(reads, 1);
  await page.unroute('**/api/incidents');
  await button('Reintentar Incidencias').click();
  await page.getByRole('cell', { name: tag, exact: true }).waitFor();
  assert.equal(reads, 1);
  await page.route('**/api/bootstrap', (r) => r.fulfill({ json: {} }));
  await go('/pedidos');
  await button('Reintentar Catálogo e inventario').waitFor();
  await page.getByRole('row').filter({ hasText: tag }).waitFor();
  assert.ok(await button('Nuevo pedido').isDisabled());
  await page.unroute('**/api/bootstrap');
  await button('Reintentar Catálogo e inventario').click();
  await button('Nuevo pedido').click();
  await dialog.getByRole('button', { name: /Cerrar/ }).click();

  // Una celda corrupta rompe la lista, mientras el panel de impacto sigue operativo.
  const realOrders = await (await page.request.get('/api/orders')).json();
  const broken = realOrders.find((o) => o.customer === tag);
  broken.lines[0].reservations = null;
  await page.route('**/api/orders', (r) => r.fulfill({ json: [broken] }));
  await go('/pedidos');
  await page.getByText(/La tabla de pedidos no pudo/).waitFor();
  await page
    .getByRole('heading', { name: 'Impacto del reabastecimiento' })
    .waitFor();
  await page.unroute('**/api/orders');
  await button('Reintentar vista').click();
  await page.getByRole('row').filter({ hasText: tag }).waitFor();
  await page.route('**/api/orders', () => {});
  await go('/pedidos');
  await page.getByText(/tardó demasiado/).waitFor({ timeout: 22000 });
  await go('/pedidos');
  await page
    .getByRole('link', { name: 'Inventario', exact: true })
    .first()
    .click();
  await page.getByText('Inventario por ubicación', { exact: true }).waitFor();
  await go('/conteos');
  await page.getByRole('heading', { name: 'Registrar conteo o referencia' }).waitFor();
  await page.getByRole('heading', { name: 'Observaciones y validaciones' }).waitFor();
  await button('Registrar observación').click();
  assert.ok((await page.locator('form :invalid').count()) > 0);
  // Cobertura de nuevas interfaces v2.1 sin suplantar permisos de escritura.
  await go('/proveedores');
  await page.getByRole('heading', { name: 'Registrar llegada prevista del proveedor' }).waitFor();
  await page.getByRole('heading', { name: 'Ingresos e inspecciones de proveedores' }).waitFor();
  await button('Registrar ingreso previsto').click();
  assert.ok((await page.locator('form :invalid').count()) > 0);
  await go('/traspasos-peso');
  await page.getByRole('heading', { name: 'Traspasos por peso y unidad' }).waitFor();
  await page.getByText('Crear solicitud de traspaso por KG o caja').click();
  await page.locator('select[name=originId]').waitFor();
  await go('/inventario');
  await page.getByRole('heading', { name: 'Inventario por kilogramo y caja' }).waitFor();
  await go('/administracion');
  await page.getByText('Registrar producto en el catálogo').click();
  await page.locator('input[name=externalLabel]').waitFor();
  // T-18, T-21, T-23, T-24, T-27: cobertura mínima en navegador.
  await go('/pedidos-peso');
  await page.getByRole('heading', { name: 'Pedidos comerciales por peso' }).waitFor();
  await button('Registrar pedido por peso').click();
  assert.ok((await page.locator('form :invalid').count()) > 0);
  await go('/choferes');
  await page.getByRole('heading', { name: 'Choferes autorizados y disponibilidad' }).waitFor();
  await page.getByRole('heading', { name: 'Viajes y cambios de chofer' }).waitFor();
  await button('Registrar chofer').click();
  assert.ok((await page.locator('form :invalid').count()) > 0);
  await go('/devoluciones');
  await page.getByRole('heading', { name: 'Regreso de pedido cargado por peso' }).waitFor();
  await page.getByRole('heading', { name: 'Devoluciones por rechazo del cliente y retorno de mercancía' }).waitFor();
  await go('/traspasos/' + transfer.id);
  await page.getByRole('heading', { name: 'Programación anticipada vinculada a cliente' }).waitFor();
  console.log(
    'E2E operativo, resultados parciales, bloqueo, reintentos, excepción de panel, timeout y navegación OK',
  );
} finally {
  await browser.close();
}
