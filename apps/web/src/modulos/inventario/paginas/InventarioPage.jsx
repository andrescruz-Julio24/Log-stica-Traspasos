'use client';
import styles from '../styles/InventarioPage.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { Panel, Table, stockAvailable } from '../../../shared/ui/ModuleKit';
import Link from 'next/link';

export default function InventarioPage() {
  const { data } = useWorkspace();
  return (
    <div className={styles.content}>
    <Panel
      title="Inventario por ubicación"
      description="SGTL es el registro oficial: existencias físicas, reservas, bloqueos y movimientos por ubicación."
    >
      <p><Link className="text-link" href="/conteos">Registrar conteo digital o corrección autorizada</Link></p>
      <Table
        headers={[
          'SKU',
          'Producto',
          'Ubicación',
          'Físico',
          'Reservado',
          'Bloqueado',
          'Disponible',
          'Fuente',
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
            <strong key="disponible" className={styles.positive}>
              {stockAvailable(stock)}
            </strong>,
            stock.stale
              ? 'Referencia externa pendiente · reserva bloqueada'
              : data.inventorySource,
          ],
        }))}
        empty="Sin registros de inventario."
      />
    </Panel>
    <Panel title="Inventario por kilogramo y caja" description="Registro por producto, unidad y ubicación sin conversiones automáticas entre cajas, piezas y kg.">
      <Table headers={['Producto', 'Ubicación', 'Unidad', 'Físico', 'Reservado', 'Bloqueado', 'Disponible']}
        rows={data.unitStocks.map((s) => ({ key: s.id, cells: [s.product.sku + ' · ' + s.product.name,
          s.location.name, s.unit, String(s.physical), String(s.reserved), String(s.blocked),
          <strong key="available">{(Number(s.physical) - Number(s.reserved) - Number(s.blocked)).toFixed(3)}</strong> ] }))}
        empty="Sin existencias por KG o CAJA todavía." />
    </Panel>
    </div>
  );
}
