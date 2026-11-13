import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const modulesRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../src/modulos');
const domains = ['incidencias', 'inventario', 'pedidos', 'supervision', 'traspasos'];

test('cada módulo dispone de carpeta styles y todos sus JSX importan su CSS Module homónimo', () => {
  let count = 0;
  for (const domain of domains) {
    const domainRoot = join(modulesRoot, domain);
    const stylesDir = join(domainRoot, 'styles');
    assert.ok(existsSync(stylesDir), `Falta styles/ en ${domain}`);
    for (const folder of ['componentes', 'paginas']) {
      const dir = join(domainRoot, folder);
      if (!existsSync(dir)) continue;
      for (const jsx of readdirSync(dir).filter((filename) => filename.endsWith('.jsx'))) {
        const css = jsx.replace(/\.jsx$/, '.module.css');
        assert.ok(existsSync(join(stylesDir, css)), `Sin CSS Module: ${domain}/${folder}/${jsx}`);
        const body = readFileSync(join(dir, jsx), 'utf8');
        assert.ok(body.includes(`../styles/${css}`), `No se importa ${css} en ${domain}/${folder}/${jsx}`);
        count++;
      }
    }
  }
  assert.ok(count >= 35, `Se esperaban 35 componentes/páginas actuales; recibidos ${count}`);
});

test('cada CSS Module de dominio corresponde a un componente o página existente', () => {
  for (const domain of domains) {
    const domainRoot = join(modulesRoot, domain);
    for (const css of readdirSync(join(domainRoot, 'styles')).filter((name) => name.endsWith('.module.css'))) {
      const jsx = css.replace(/\.module\.css$/, '.jsx');
      const owned = ['componentes', 'paginas'].some((folder) => existsSync(join(domainRoot, folder, jsx)));
      assert.ok(owned, `Estilo sin JSX correspondiente: ${domain}/styles/${css}`);
    }
  }
});
