'use client';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { Panel, Empty, formatDate } from '../../../shared/ui/ModuleKit';
import styles from '../styles/AuditoriaPage.module.css';
export default function AuditoriaPage() {
  const { data } = useWorkspace();
  return (
    <Panel
      title="Bitácora de auditoría"
      subtitle="Eventos históricos inmutables registrados por el servidor"
    >
      <div className={styles.timeline}>
        {data.audit.map((a) => (
          <div className={styles.event} key={a.id}>
            <span className={styles.dot} />
            <div>
              <strong>{a.type}</strong>
              <p>
                {a.entity} · {a.entityId}
              </p>
              <small>
                {a.actor} · {formatDate(a.createdAt)}
              </small>
              <details>
                <summary>Datos del evento</summary>
                <pre>{JSON.stringify(a.data, null, 2)}</pre>
              </details>
            </div>
          </div>
        ))}
        {!data.audit.length && <Empty>Sin eventos todavía.</Empty>}
      </div>
    </Panel>
  );
}
