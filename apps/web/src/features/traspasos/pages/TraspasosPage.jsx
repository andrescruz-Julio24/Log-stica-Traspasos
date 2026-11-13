'use client';
import { useWorkspace } from '../../workspace/hooks/useWorkspace';
import { useState } from 'react';
import Link from 'next/link';
import { CreateRecordAction } from '../../workspace/components/CreateRecordAction';
import { CreateTransfer } from '../components/CreateTransfer';
import { Panel, Table, Status, formatDate } from '../../../shared/ui/ModuleKit';
import { sumField } from '../../../shared/utils/quantities';
import { TransferDetail } from '../components/TransferDetail';

export default function TraspasosPage() {
  const { data, busy, act } = useWorkspace();
  const [selected, setSelected] = useState(null);
  const current = data.transfers.find((t) => t.id === selected);
  return (
    <Panel
      title="Traspasos"
      description="Reserva, despacho y recepción son operaciones distintas"
      actions={
        <CreateRecordAction
          label=" Nuevo traspaso"
          title=" Nuevo traspaso"
          form={CreateTransfer}
        />
      }
    >
      <Table
        headers={[
          'Folio',
          'Ruta',
          'Solicitado',
          'Despachado',
          'Aceptado',
          'Estado',
          'Acción',
        ]}
        rows={data.transfers.map((transfer) => ({
          key: transfer.id,
          cells: [
            <div key="folio">
              <Link className="text-link" href={'/traspasos/' + transfer.id}>
                {transfer.code}
              </Link>
              <small>{formatDate(transfer.createdAt)}</small>
            </div>,
            <div key="ruta">
              {transfer.origin.name}
              <span className="muted"> → {transfer.destination.name}</span>
            </div>,
            sumField(transfer.lines, 'requested'),
            sumField(transfer.lines, 'dispatched'),
            sumField(transfer.lines, 'accepted'),
            <Status key="estado" value={transfer.status} />,
            <button
              key="accion"
              type="button"
              className="secondary"
              onClick={() =>
                setSelected(selected === transfer.id ? null : transfer.id)
              }
            >
              {selected === transfer.id ? 'Ocultar' : 'Gestionar'}
            </button>,
          ],
        }))}
        empty="Crea un traspaso para comenzar."
      />
      {current && (
        <TransferDetail
          key={current.id}
          transfer={current}
          orders={data.orders}
          busy={busy}
          onAction={act}
        />
      )}
    </Panel>
  );
}
