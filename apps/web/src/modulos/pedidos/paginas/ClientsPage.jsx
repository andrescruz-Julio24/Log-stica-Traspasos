'use client';
import styles from '../styles/ClientsPage.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { useState } from 'react';
import Link from 'next/link';
import {
  Hint,
  Panel,
  Progress,
  SearchField,
  Table,
} from '../../../shared/ui/ModuleKit';
import { sumField } from '../../../shared/utils/quantities';

export function ClientsPage() {
  const { data } = useWorkspace();
  const [q, setQ] = useState('');
  const grouped = Object.values(
    data.orders.reduce((acc, o) => {
      const k = o.customer.trim().toLocaleLowerCase('es-MX');
      if (!acc[k])
        acc[k] = { name: o.customer, orders: [], required: 0, accepted: 0 };
      acc[k].orders.push(o);
      acc[k].required += sumField(o.lines, 'required');
      acc[k].accepted += sumField(o.lines, 'accepted');
      return acc;
    }, {}),
  ).filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Hint title="Clientes derivados de pedidos">
        Esta lista agrupa por nombre escrito en los pedidos; aún no existe
        catálogo de clientes con identificador empresarial. Dos nombres
        distintos pueden referirse a la misma persona o empresa.
      </Hint>
      <Panel
        title="Clientes con pedidos registrados"
        description="Vista de abastecimiento comercial por cliente."
        actions={
          <Link href="/pedidos" className="secondary">
            Ir a pedidos
          </Link>
        }
      >
        <div className={`module-toolbar ${styles.toolbar}`}>
          <SearchField value={q} onChange={setQ} placeholder="Buscar cliente" />
        </div>
        <Table
          headers={[
            'Cliente',
            'Pedidos',
            'Pedidos listos',
            'Abastecimiento',
            'Unidades faltantes',
          ]}
          rows={grouped.map((c) => ({
            key: c.name,
            cells: [
              <strong key="column-1">{c.name}</strong>,
              c.orders.length,
              c.orders.filter((o) => o.status === 'READY').length,
              <Progress
                key="column-2"
                actual={c.accepted}
                total={c.required}
              />,
              Math.max(0, c.required - c.accepted),
            ],
          }))}
          empty="No hay clientes que coincidan."
        />
      </Panel>
    </>
  );
}
