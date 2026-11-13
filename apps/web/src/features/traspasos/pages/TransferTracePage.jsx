'use client';
import {
  Empty,
  Hint,
  Metric,
  Panel,
  Progress,
  Status,
  Table,
  formatDate,
} from '../../../shared/ui/ModuleKit';
import { activeReserved, sumField } from '../../../shared/utils/quantities';
import {
  DetailHeader,
  BackLink,
} from '../../trazabilidad/components/DetailHeader';
import { useWorkspace } from '../../workspace/hooks/useWorkspace';
export default function TransferTracePage({ id }) {
  const { data } = useWorkspace();
  const t = data.transfers.find((t) => t.id === id);
  if (!t)
    return (
      <div className="standalone-loading">
        <Empty message="Traspaso no encontrado." />
        {<BackLink href="/traspasos" label="traspasos" />}
      </div>
    );
  const req = sumField(t.lines, 'requested'),
    dispatched = sumField(t.lines, 'dispatched'),
    accepted = sumField(t.lines, 'accepted');
  const relatedIncidents = data.incidents.filter((i) => i.transferId === t.id);
  const history = data.audit.filter(
    (e) => e.entityId === t.id || e.data?.transferId === t.id,
  );
  return (
    <main className="detail-page">
      <DetailHeader
        title={t.code}
        subtitle={
          t.origin.name +
          ' → ' +
          t.destination.name +
          ' · ' +
          formatDate(t.createdAt)
        }
        href="/traspasos"
        backLabel="traspasos"
      />
      <div className="stats">
        <Metric label="Solicitado" value={req} detail="Solicitud original" />
        <Metric
          label="Despachado"
          value={dispatched}
          detail="Salidas físicas"
        />
        <Metric
          label="Aceptado"
          value={accepted}
          detail="Recepciones verificadas"
        />
        <Metric
          label="Pendiente"
          value={Math.max(0, req - accepted)}
          detail="Contra cantidad solicitada"
        />
      </div>
      <Hint
        title="Cierre registrado no implica cumplimiento autorizado"
        warning
      >
        El estado de cierre actual es una aproximación del MVP; no representa
        aprobación de diferencias ni conciliación formal de incidencias.
      </Hint>
      <div className="two-cols">
        <Panel title="Información general" description="Resumen del traspaso.">
          <div className="detail-fields">
            <div>
              <span>Estado</span>
              <Status
                value={
                  t.closedWithDifferences ? 'Cerrado con diferencias' : t.status
                }
              />
            </div>
            <div>
              <span>Origen</span>
              <strong>{t.origin.name}</strong>
            </div>
            <div>
              <span>Destino</span>
              <strong>{t.destination.name}</strong>
            </div>
            <div>
              <span>Incidencias vinculadas</span>
              <strong>{relatedIncidents.length}</strong>
            </div>
          </div>
        </Panel>
        <Panel
          title="Progreso del movimiento"
          description="Solicitado → enviado → aceptado."
        >
          <div className="detail-progress">
            <div>
              <span>Despachado</span>
              <Progress actual={dispatched} total={req} />
            </div>
            <div>
              <span>Aceptado</span>
              <Progress actual={accepted} total={req} />
            </div>
          </div>
        </Panel>
      </div>
      <Panel
        title="Líneas de mercancía"
        description="Cantidades registradas por producto."
      >
        <Table
          headers={[
            'SKU',
            'Producto',
            'Requerido',
            'Despachado',
            'Aceptado',
            'Reservado activo',
          ]}
          rows={t.lines.map((l) => ({
            key: l.id,
            cells: [
              l.product.sku,
              l.product.name,
              l.requested,
              l.dispatched,
              l.accepted,
              activeReserved(l),
            ],
          }))}
        />
      </Panel>
      <div className="two-cols">
        <Panel title="Despachos" description="Salidas individuales del origen.">
          <Table
            headers={['Registro', 'Unidades', 'Fecha']}
            rows={t.dispatches.map((d) => ({
              key: d.id,
              cells: [
                d.id.slice(0, 10) +
                  ' · ' +
                  (d.custodian || 'Custodio histórico sin registrar'),
                sumField(d.lines, 'quantity'),
                formatDate(d.createdAt),
              ],
            }))}
            empty="Sin despachos registrados."
          />
        </Panel>
        <Panel
          title="Recepciones"
          description="Aceptado y rechazado por evento."
        >
          <Table
            headers={['Registro', 'Presentado', 'Aceptado', 'Rechazado']}
            rows={t.receipts.map((r) => ({
              key: r.id,
              cells: [
                r.id.slice(0, 10),
                sumField(
                  r.lines.filter((l) => !l.reversed),
                  'presented',
                ),
                sumField(
                  r.lines.filter((l) => !l.reversed),
                  'accepted',
                ),
                sumField(
                  r.lines.filter((l) => !l.reversed),
                  'rejected',
                ),
              ],
            }))}
            empty="Sin recepciones."
          />
        </Panel>
      </div>
      <Panel title="Incidencias" description="Problemas asociados al traspaso.">
        <Table
          headers={['Tipo', 'Observación', 'Estado', 'Creada']}
          rows={relatedIncidents.map((i) => ({
            key: i.id,
            cells: [
              i.type,
              i.notes,
              <Status key="column-1" value={i.status} />,
              formatDate(i.createdAt),
            ],
          }))}
          empty="No hay incidencias relacionadas."
        />
      </Panel>
      <Panel
        title="Historial disponible"
        description="Eventos almacenados en la ventana de auditoría consultada (últimos 200)."
      >
        <Table
          headers={['Evento', 'Actor demo', 'Fecha', 'Entidad']}
          rows={history.map((e) => ({
            key: e.id,
            cells: [
              e.type,
              e.actor,
              formatDate(e.createdAt),
              e.entity + ' / ' + e.entityId.slice(0, 10),
            ],
          }))}
          empty="No hay eventos relacionados dentro de los registros consultados."
        />
      </Panel>
    </main>
  );
}
