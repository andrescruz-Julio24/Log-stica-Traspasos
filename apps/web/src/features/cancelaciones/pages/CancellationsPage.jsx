'use client';
import { useWorkspace } from '../../workspace/hooks/useWorkspace';
import { useState } from 'react';
import {
  Hint,
  Panel,
  Progress,
  SearchField,
  Table,
  Unavailable,
} from '../../../shared/ui/ModuleKit';
import { sumField } from '../../../shared/utils/quantities';

export function CancellationsPage() {
  const { data } = useWorkspace();
  const [q, setQ] = useState('');
  const candidates = data.orders.filter(
    (o) =>
      o.status !== 'CANCELLED' &&
      (o.customer + ' ' + o.code).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <Hint
        title="Cancelaciones: consulta preliminar, sin autorización de ejecución"
        warning
      >
        Actualmente el backend no implementa cancelación, liberación de
        reservas, redirección de mercancía en tránsito ni movimientos
        compensatorios. No se mostrará un botón que aparente cancelar realmente
        un pedido.
      </Hint>
      <Panel
        title="Pedidos susceptibles de evaluación"
        description="Para aprobar una cancelación se debe verificar reservas, despachos, custodia y asignaciones existentes."
      >
        <div className="module-toolbar">
          <SearchField
            value={q}
            onChange={setQ}
            placeholder="Buscar pedido o cliente"
          />
        </div>
        <Table
          headers={[
            'Pedido',
            'Cliente',
            'Destino',
            'Abastecimiento',
            'Reservas relacionadas',
            'Evaluación',
          ]}
          rows={candidates.map((o) => {
            const reservations = data.transfers
              .flatMap((t) => t.lines.flatMap((l) => l.reservations))
              .filter((r) => o.lines.some((l) => l.id === r.orderLineId));
            return {
              key: o.id,
              cells: [
                o.code,
                o.customer,
                o.destination.name,
                <Progress
                  key="column-1"
                  actual={sumField(o.lines, 'accepted')}
                  total={sumField(o.lines, 'required')}
                />,
                reservations.length,
                <span key="column-2" className="muted">
                  Requiere evaluación y autorización
                </span>,
              ],
            };
          })}
          empty="Sin pedidos para evaluar."
        />
      </Panel>
      <Panel
        title="Flujo de cancelación controlada"
        description="Diseño de proceso no habilitado en el MVP."
      >
        <div className="workflow-steps">
          <span>Solicitud</span>
          <span>Impacto en inventario</span>
          <span>Aprobación</span>
          <span>Compensación</span>
          <span>Auditoría</span>
        </div>
        <Unavailable
          title="Operación pendiente de backend"
          description="Se debe construir una transacción de anulación que conserve el historial y evite liberar stock en tránsito."
          dependency="LOG-07-CANCELACION · BE-09 · QA-VALIDATION"
        />
      </Panel>
    </>
  );
}
