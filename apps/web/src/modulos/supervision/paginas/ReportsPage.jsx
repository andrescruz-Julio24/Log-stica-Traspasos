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
} from '../../../shared/ui/ModuleKit';
import { sumField } from '../../../shared/utils/quantities';
import { ReportBar } from '../componentes/ReportBar';
import { useReportMetrics } from '../hooks/useReportMetrics';
import { reportStatuses } from '../data/reportStatuses';

export function ReportsPage() {
  const { data } = useWorkspace();
  const { orders, transfers, requested, dispatched, accepted, totalOrders, statusCounts } = useReportMetrics(data);
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
          value={statusCounts.READY}
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
            {reportStatuses.map((s) => (
              <ReportBar
                key={s.key}
                label={s.label}
                value={statusCounts[s.key]}
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
              <ReportBar
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
