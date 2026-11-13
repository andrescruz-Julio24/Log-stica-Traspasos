'use client';
import { useWorkspace } from '../../workspace/hooks/useWorkspace';
import { useState } from 'react';
import {
  Hint,
  Panel,
  SearchField,
  Table,
  Unavailable,
  stockAvailable,
} from '../../../shared/ui/ModuleKit';
import { sumField } from '../../../shared/utils/quantities';

export function AdministrationPage() {
  const { data } = useWorkspace();
  const [tab, setTab] = useState('products'),
    [q, setQ] = useState('');
  const active = data.products.filter((p) =>
    (p.sku + ' ' + p.name).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <Hint title="Catálogos de sólo lectura">
        Los catálogos mostrados provienen de PostgreSQL. Este MVP no incorpora
        edición de usuarios, sucursales, productos, roles ni permisos. Ningún
        control visual suplanta la autorización del backend.
      </Hint>
      <div
        className="module-tabs"
        role="tablist"
        aria-label="Secciones de administración"
      >
        {['products', 'locations', 'roles'].map((k) => (
          <button
            role="tab"
            aria-selected={tab === k}
            key={k}
            className={tab === k ? 'active' : ''}
            onClick={() => setTab(k)}
          >
            {
              {
                products: 'Productos',
                locations: 'Ubicaciones',
                roles: 'Usuarios y permisos',
              }[k]
            }
          </button>
        ))}
      </div>
      {tab === 'products' && (
        <Panel
          title="Catálogo de productos"
          description="Identificación por SKU; lotes y variantes quedan pendientes de definición."
        >
          <div className="module-toolbar">
            <SearchField
              value={q}
              onChange={setQ}
              placeholder="Buscar SKU o nombre"
            />
          </div>
          <Table
            headers={[
              'SKU',
              'Producto',
              'Ubicaciones con stock',
              'Existencia física total',
              'Disponible calculado',
            ]}
            rows={active.map((p) => {
              const stocks = data.stocks.filter((s) => s.productId === p.id);
              return {
                key: p.id,
                cells: [
                  <strong key="column-1">{p.sku}</strong>,
                  p.name,
                  stocks.length,
                  sumField(stocks, 'physical'),
                  stocks.reduce((n, s) => n + stockAvailable(s), 0),
                ],
              };
            })}
            empty="No hay productos con ese filtro."
          />
        </Panel>
      )}
      {tab === 'locations' && (
        <Panel
          title="Ubicaciones logísticas"
          description="Almacenes, bodegas, distribuidoras y puntos de venta."
        >
          <Table
            headers={[
              'Nombre de ubicación',
              'Productos con existencias',
              'Unidades físicas',
              'Unidades disponibles',
            ]}
            rows={data.locations.map((l) => {
              const stocks = data.stocks.filter((s) => s.locationId === l.id);
              return {
                key: l.id,
                cells: [
                  <strong key="column-1">{l.name}</strong>,
                  stocks.length,
                  sumField(stocks, 'physical'),
                  stocks.reduce((n, s) => n + stockAvailable(s), 0),
                ],
              };
            })}
            empty="Sin ubicaciones."
          />
        </Panel>
      )}
      {tab === 'roles' && (
        <Panel
          title="Usuarios y permisos"
          description="El servidor verifica credenciales individuales y las facultades de operador o supervisor."
        >
          <Unavailable
            title="Administración de cuentas fuera de esta pantalla"
            description="Las cuentas se configuran en el servidor. Una solicitud requiere un supervisor distinto para aprobarse."
            dependency="BE-07 Seguridad · PM-BA Matriz de permisos · QA-09"
          />
        </Panel>
      )}
    </>
  );
}
