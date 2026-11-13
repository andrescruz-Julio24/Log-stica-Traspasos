'use client';
import { useWorkspace } from '../../workspace/hooks/useWorkspace';
import { Panel, Table, stockAvailable } from '../../../shared/ui/ModuleKit';

export default function InventarioPage() {
  const { data } = useWorkspace();
  return (
    <Panel
      title="Inventario por ubicación"
      description="Existencia física ≠ existencia disponible para nuevas reservas"
    >
      <Table
        headers={[
          'SKU',
          'Producto',
          'Ubicación',
          'Físico',
          'Reservado',
          'Bloqueado',
          'Disponible',
        ]}
        rows={data.stocks.map((stock) => ({
          key: stock.id,
          cells: [
            <strong key="sku">{stock.product.sku}</strong>,
            stock.product.name,
            stock.location.name,
            stock.physical,
            stock.reserved,
            stock.blocked,
            <strong key="disponible" className="positive">
              {stockAvailable(stock)}
            </strong>,
          ],
        }))}
        empty="Sin registros de inventario."
      />
    </Panel>
  );
}
