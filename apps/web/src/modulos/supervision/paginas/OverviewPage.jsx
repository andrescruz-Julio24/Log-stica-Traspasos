'use client';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { useRouter } from 'next/navigation';
import { Status, Panel, Empty } from '../../../shared/ui/ModuleKit';
import styles from '../styles/OverviewPage.module.css';

export default function OverviewPage() {
  const { data } = useWorkspace();
  const router = useRouter();
  const ready = data.orders.filter((o) => o.status === 'READY').length;
  const partial = data.orders.filter((o) => o.status === 'PARTIAL').length;
  const active = data.transfers.filter(
    (t) => !['CLOSED', 'CANCELLED'].includes(t.status),
  ).length;
  return (
    <>
      <div className="stats">
        {[
          ['Pedidos listos', ready, 'Confirmados para preparación'],
          ['Abastecimiento parcial', partial, 'Requieren mercancía'],
          ['Traspasos activos', active, 'En gestión o movimiento'],
          [
            'Incidencias abiertas',
            data.incidents.filter((i) => i.status === 'OPEN').length,
            'Necesitan revisión',
          ],
        ].map(([label, num, caption]) => (
          <div className="stat" key={label}>
            <small>{label}</small>
            <strong>{num}</strong>
            <span>{caption}</span>
          </div>
        ))}
      </div>
      <div className="two-cols">
        <Panel
          title="Traspasos recientes"
          subtitle="Estado del movimiento y mercancía"
        >
          <div className={styles.stack}>
            {data.transfers.slice(0, 6).map((t) => (
              <button
                className={styles.row}
                onClick={() => router.push('/traspasos/' + t.id)}
                key={t.id}
              >
                <div>
                  <strong>{t.code}</strong>
                  <small>
                    {t.origin.name} → {t.destination.name}
                  </small>
                </div>
                <Status value={t.status} />
              </button>
            ))}
            {!data.transfers.length && <Empty>Aún no hay traspasos.</Empty>}
          </div>
        </Panel>
        <Panel
          title="Pedidos por preparar"
          subtitle="Disponibilidad confirmada por cliente"
        >
          <div className={styles.stack}>
            {data.orders.slice(0, 6).map((o) => (
              <button
                className={styles.row}
                onClick={() => router.push('/pedidos/' + o.id)}
                key={o.id}
              >
                <div>
                  <strong>
                    {o.code} · {o.customer}
                  </strong>
                  <small>
                    {o.lines.reduce((n, l) => n + l.accepted, 0)} /{' '}
                    {o.lines.reduce((n, l) => n + l.required, 0)} unidades
                    aceptadas
                  </small>
                </div>
                <Status value={o.status} />
              </button>
            ))}
            {!data.orders.length && <Empty>Sin pedidos registrados.</Empty>}
          </div>
        </Panel>
      </div>
    </>
  );
}
