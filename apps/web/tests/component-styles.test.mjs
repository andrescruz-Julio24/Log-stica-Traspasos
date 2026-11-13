import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = resolve(dirname(fileURLToPath(import.meta.url)), '../src');
const examples = [
  ['modulos/supervision/paginas/AuditoriaPage.jsx', 'AuditoriaPage.module.css'],
  ['modulos/supervision/paginas/OverviewPage.jsx', 'OverviewPage.module.css'],
  ['modulos/supervision/paginas/AdministrationPage.jsx', 'AdministrationPage.module.css'],
  ['modulos/supervision/paginas/ReportsPage.jsx', 'ReportsPage.module.css'],
  ['modulos/supervision/componentes/ReportBar.jsx', 'ReportBar.module.css'],
  ['modulos/pedidos/componentes/OrderListPanel.jsx', 'OrderListPanel.module.css'],
  ['modulos/traspasos/componentes/TransferDetail.jsx', 'TransferDetail.module.css'],
  ['modulos/traspasos/paginas/TransferTracePage.jsx', 'TransferTracePage.module.css'],
  ['shared/componentes/DetailHeader.jsx', 'DetailHeader.module.css'],
  ['shared/workspace/componentes/Workspace.jsx', 'Workspace.module.css'],
  ['shared/workspace/componentes/WorkspaceNavigation.jsx', 'WorkspaceNavigation.module.css'],
  ['shared/workspace/componentes/CreateRecordAction.jsx', 'CreateRecordAction.module.css'],
  ...['Panel', 'Metric', 'Status', 'Table', 'Progress', 'Empty', 'Hint', 'SearchField', 'Unavailable'].map((name) => [`shared/ui/componentes/${name}.jsx`, `${name}.module.css`]),
];

test('cada componente con estilos propios importa su CSS Module correspondiente', () => {
  for (const [file, style] of examples) {
    const code = readFileSync(resolve(src, file), 'utf8');
    const importPath = code.match(/from ['"]([^'"]+\.module\.css)['"]/g)?.find((entry) => entry.includes(style));
    assert.ok(importPath, `Falta import de ${style} en ${file}`);
    const relative = importPath.match(/from ['"]([^'"]+)['"]/)[1];
    assert.ok(existsSync(resolve(dirname(resolve(src, file)), relative)), `No existe ${relative} en ${file}`);
  }
});

test('los estilos privados no se importan desde el CSS global', () => {
  const css = readFileSync(resolve(src, 'app/globals.css'), 'utf8');
  assert.doesNotMatch(css, /\.module\.css/);
  for (const line of css.split('\n')) {
    const path = line.match(/^@import ['"]([^'"]+)['"];?/);
    if (path) assert.ok(existsSync(resolve(src, 'app', path[1])), `Import CSS no resuelto: ${path[1]}`);
  }
});

test('no quedan las hojas globales antiguas que mezclaban responsabilidades', () => {
  for (const path of [
    'shared/styles/base.css', 'shared/styles/modules.css', 'shared/styles/details.css',
    'shared/workspace/styles/shell.css', 'shared/workspace/styles/navigation.css',
    'shared/workspace/styles/workspace.css',
  ]) assert.equal(existsSync(resolve(src, path)), false, `Hoja legacy encontrada: ${path}`);
});
