'use client';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { Panel, Table } from '../../../shared/ui/ModuleKit';
import { replenishmentImpact } from '../utils/impact';
export function ReplenishmentPanel() {
  const { data } = useWorkspace();
  return (
    <Panel
      title="Impacto del reabastecimiento"
      description="Pedidos que podrían completarse si se aceptan y asignan todas las unidades faltantes de ese SKU en su destino."
    >
      <Table
        headers={[
          'SKU',
          'Destino',
          'Unidades faltantes',
          'Pedidos',
          'Urgentes',
          'Folios',
        ]}
        rows={replenishmentImpact(data.orders).map((g) => ({
          key: g.key,
          cells: [
            g.sku,
            g.destination,
            g.units,
            g.orders.length,
            g.urgent,
            g.orders.join(', '),
          ],
        }))}
        empty="Ningún pedido activo depende de un único SKU."
      />
    </Panel>
  );
}
