'use client';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import styles from '../styles/reports.module.css';
import Link from 'next/link';
import {
  Hint,
  Metric,
  Panel,
  Status,
  Table,
  percentage,
} from '../../../shared/ui/ModuleKit';
import { sumField } from '../../../shared/utils/quantities';

function SimpleBar({ label, value, total }) {
  return (
    <div className={styles.bar}>
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
      <div className="progress-track">
        <div style={{ width: percentage(value, total) + '%' }} />
      </div>
    </div>
  );
}
export function ReportsPage() {
  const { data } = useWorkspace();
  const orders = data.orders;
  const transfers = data.transfers;
  const requested = transfers.reduce(
    (a, t) => a + sumField(t.lines, 'requested'),
    0,
  );
  const dispatched = transfers.reduce(
    (a, t) => a + sumField(t.lines, 'dispatched'),
    0,
  );
  const accepted = transfers.reduce(
    (a, t) => a + sumField(t.lines, 'accepted'),
    0,
  );
  const statuses = ['PENDING', 'PARTIAL', 'BLOCKED', 'READY', 'CANCELLED'];
  const totalOrders = orders.length;
  return (
    <>
      <Hint title="Reporte descriptivo del estado actual">
        No se calculan SLA, puntualidad, tiempo promedio de preparación ni
        desempeño por usuario porque faltan eventos detallados y fechas de
        compromiso. Los conteos corresponden a los registros actualmente
        consultables, no a un histórico consolidado de períodos.
      </Hint>
      <div className="stats">
        <Metric
          label="Pedidos registrados"
          value={totalOrders}
          detail="Sin filtro temporal"
        />
        <Metric
          label="Pedidos listos"
          value={orders.filter((o) => o.status === 'READY').length}
          detail="Según recepción aceptada en el MVP"
        />
        <Metric
          label="Unidades despachadas"
          value={dispatched}
          detail={'De ' + requested + ' solicitadas'}
        />
        <Metric
          label="Unidades aceptadas"
          value={accepted}
          detail={'De ' + dispatched + ' despachadas'}
        />
      </div>
      <div className="two-cols">
        <Panel
          title="Abastecimiento de clientes"
          description="Conteos por estado de pedido."
        >
          <div className={styles.bars}>
            {statuses.map((s) => (
              <SimpleBar
                key={s}
                label={
                  {
                    PENDING: 'Pendientes',
                    PARTIAL: 'Parciales',
                    BLOCKED: 'Retenidos',
                    READY: 'Listos',
                    CANCELLED: 'Cancelados',
                  }[s]
                }
                value={orders.filter((o) => o.status === s).length}
                total={Math.max(1, totalOrders)}
              />
            ))}
          </div>
        </Panel>
        <Panel
          title="Volúmenes del flujo logístico"
          description="Solicitado, enviado y aceptado no representan lo mismo."
        >
          <div className={styles.bars}>
            {[
              ['Solicitado', requested],
              ['Despachado', dispatched],
              ['Aceptado', accepted],
            ].map(([label, value]) => (
              <SimpleBar
                key={label}
                label={label}
                value={value}
                total={Math.max(1, requested)}
              />
            ))}
          </div>
        </Panel>
      </div>
      <Panel
        title="Detalle de resultados por traspaso"
        description="El cierre registrado no certifica cumplimiento total."
      >
        <Table
          headers={[
            'Traspaso',
            'Ruta',
            'Solicitado',
            'Despachado',
            'Aceptado',
            'Diferencia contra solicitud',
            'Estado',
          ]}
          rows={transfers.map((t) => {
            const req = sumField(t.lines, 'requested'),
              dis = sumField(t.lines, 'dispatched'),
              acc = sumField(t.lines, 'accepted');
            return {
              key: t.id,
              cells: [
                <Link
                  key="column-1"
                  href={'/traspasos/' + t.id}
                  className="text-link"
                >
                  {t.code}
                </Link>,
                t.origin.name + ' → ' + t.destination.name,
                req,
                dis,
                acc,
                Math.max(0, req - acc),
                <Status key="column-2" value={t.status} />,
              ],
            };
          })}
          empty="No hay traspasos para generar el reporte."
        />
      </Panel>
    </>
  );
}
