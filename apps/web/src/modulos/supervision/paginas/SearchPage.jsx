'use client';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { useState } from 'react';
import Link from 'next/link';
import { Empty, Panel, SearchField, Table } from '../../../shared/ui/ModuleKit';

export function SearchPage() {
  const { data } = useWorkspace();
  const [q, setQ] = useState('');
  const normalized = q.toLocaleLowerCase('es-MX').trim();
  const entries = [
    ...data.orders.map((x) => ({
      key: 'order:' + x.id,
      type: 'Pedido',
      title: x.code,
      detail: x.customer + ' · ' + x.destination.name,
      href: '/pedidos',
    })),
    ...data.transfers.map((x) => ({
      key: 'transfer:' + x.id,
      type: 'Traspaso',
      title: x.code,
      detail: x.origin.name + ' → ' + x.destination.name,
      href: '/traspasos',
    })),
    ...data.products.map((x) => ({
      key: 'product:' + x.id,
      type: 'Producto',
      title: x.sku,
      detail: x.name,
      href: '/inventario',
    })),
    ...data.incidents.map((x) => ({
      key: 'incident:' + x.id,
      type: 'Incidencia',
      title: x.type,
      detail: x.notes,
      href: '/incidencias',
    })),
  ]
    .filter(
      (x) =>
        normalized &&
        (x.title + ' ' + x.detail + ' ' + x.type)
          .toLocaleLowerCase('es-MX')
          .includes(normalized),
    )
    .slice(0, 100);
  return (
    <Panel
      title="Búsqueda global"
      description="Busca por SKU, folio, cliente o descripción. Los resultados se limitan a los registros disponibles en la API."
    >
      <div className="module-toolbar">
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Escribe un SKU, cliente, folio o incidencia"
        />
      </div>
      {normalized ? (
        <Table
          headers={['Tipo', 'Identificador', 'Referencia', 'Acción']}
          rows={entries.map((x) => ({
            key: x.key,
            cells: [
              x.type,
              <strong key="column-1">{x.title}</strong>,
              x.detail,
              <Link key="column-2" href={x.href} className="text-link">
                Consultar
              </Link>,
            ],
          }))}
          empty="Sin coincidencias para la búsqueda."
        />
      ) : (
        <Empty message="Introduce al menos un término para buscar en los registros del SGTL." />
      )}
    </Panel>
  );
}
