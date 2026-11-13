'use client';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import Link from 'next/link';
import { useMovements } from '../hooks/useMovements';
import {
  Hint,
  NextStep,
  Panel,
  SearchField,
  Table,
  formatDate,
} from '../../../shared/ui/ModuleKit';

export function MovementsPage() {
  const { data } = useWorkspace();
  const { q, setQ, events } = useMovements(data.transfers);
  return (
    <>
      <Hint title="Secuencia de eventos logísticos, no libro mayor físico">
        Esta vista reconstruye reservas, despachos y aceptaciones desde los
        registros disponibles. Aún falta el modelo de movimiento de inventario
        completo y las relaciones despacho–recepción para una conciliación
        física exhaustiva.
      </Hint>
      <Panel
        title="Movimientos registrados"
        description="Eventos consultables por traspaso y SKU."
        actions={<NextStep label="Abrir operación de traspasos" />}
      >
        <div className="module-toolbar">
          <SearchField
            value={q}
            onChange={setQ}
            placeholder="Folio, SKU o tipo de movimiento"
          />
        </div>
        <Table
          headers={[
            'Tipo',
            'Traspaso',
            'SKU',
            'Unidades',
            'Origen',
            'Destino o condición',
            'Fecha',
          ]}
          rows={events.map((e) => ({
            key: e.key,
            cells: [
              e.type,
              <Link
                key="column-1"
                className="text-link"
                href={'/traspasos/' + e.t.id}
              >
                {e.t.code}
              </Link>,
              e.sku,
              e.quantity,
              e.from,
              e.to,
              formatDate(e.createdAt),
            ],
          }))}
          empty="No hay movimientos registrados con ese filtro."
        />
      </Panel>
    </>
  );
}
