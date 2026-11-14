'use client';
import styles from '../styles/MeasuredTransfersPage.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { Panel, Table, formatDate } from '../../../shared/ui/ModuleKit';
import { CreateMeasuredTransfer } from '../componentes/CreateMeasuredTransfer';
import { MeasuredReservationForm } from '../componentes/MeasuredReservationForm';
import { MeasuredDispatchForm } from '../componentes/MeasuredDispatchForm';
import { MeasuredReceptionForm } from '../componentes/MeasuredReceptionForm';

export function MeasuredTransfersPage() {
  const { data } = useWorkspace();
  return <div className={styles.content}>
    <Panel title="Traspasos por peso y unidad" description="Reserva, salida, tránsito y recepción medidos. KG/CAJA no se convierten a piezas sin política aprobada.">
      <CreateMeasuredTransfer />
      {data.measuredTransfers.map(transfer => <details className={styles.transfer} key={transfer.id}>
        <summary><strong>{transfer.code}</strong> · {transfer.origin.name} → {transfer.destination.name}
          {' · '}{formatDate(transfer.createdAt)} · {transfer.status}</summary>
        <Table headers={['Producto','Unidad','Solicitado','Reservado','Despachado','Aceptado','Bloqueado','En tránsito']}
          rows={transfer.measuredLines.map(l => ({ key: l.id, cells: [
            l.product.name, l.unit, String(l.requested),String(l.reserved),
            String(l.dispatched),String(l.accepted),String(l.blocked),
            (Number(l.dispatched)-Number(l.accepted)-Number(l.blocked)).toFixed(3),
          ] }))}/>
        {transfer.measuredLines.map(line => <div className={styles.line} key={line.id}>
          <h3>{line.product.name} ({line.unit})</h3>
          {line.estimatedPackages != null && <p>Estimación: {line.estimatedPackages} cajas; peso promedio:
            {' '}{line.averageWeightKg || 'sin dato'}</p>}
          <div className={styles.actions}>
            <MeasuredReservationForm transfer={transfer} line={line}/>
            <MeasuredDispatchForm transfer={transfer} line={line}/>
          </div>
        </div>)}
        {transfer.measuredDispatches.map(dispatch => {
          const line = transfer.measuredLines.find(l => l.id === dispatch.lineId);
          return <details key={dispatch.id} className={styles.dispatch}>
            <summary>Salida {formatDate(dispatch.dispatchedAt)} · {dispatch.custodian} ·
              {' '}{String(dispatch.quantity)} {line?.unit}</summary>
            <MeasuredReceptionForm transfer={transfer} dispatch={dispatch} unit={line?.unit}/>
            <div className={styles.history}>
              {dispatch.receipts.map(r => <p key={r.id}>Recibido {formatDate(r.observedAt)}:
                {' '}{String(r.accepted)} aceptado · {String(r.blocked)} bloqueado ·
                {' '}{r.receivedBy}</p>)}
            </div>
          </details>;
        })}
        {transfer.status === 'RECEIVING' &&
          <p className={styles.warning}>Si el peso no coincide o hay daño, el expediente permanece pendiente;
            un cierre con diferencias requiere autorización y resolución de incidencias.</p>}
      </details>)}
      {!data.measuredTransfers.length && <p>No hay traspasos de peso/CAJA.</p>}
    </Panel>
  </div>;
}
