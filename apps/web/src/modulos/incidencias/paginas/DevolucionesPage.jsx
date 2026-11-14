'use client';
import styles from '../styles/DevolucionesPage.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { Panel } from '../../../shared/ui/ModuleKit';
import { CreateWeightReturn } from '../componentes/CreateWeightReturn';
import { CommercialReturnCase } from '../componentes/CommercialReturnCase';
export function DevolucionesPage() {
  const { data }=useWorkspace();
  return <div className={styles.content}>
    <Panel title="Regreso de pedido cargado por peso"
      description="T-24: se debe volver a pesar y documentar una diferencia antes de decidir si reingresa al inventario.">
      <CreateWeightReturn/>
    </Panel>
    <Panel title="Devoluciones por rechazo del cliente y retorno de mercancía"
      description="T-27: cada rechazo parcial tiene expediente, cantidad esperada, recepción física, inspección y papeleta a Contabilidad.">
      {data.commercialReturns.map(entry=><CommercialReturnCase key={entry.id} entry={entry}/>)}
      {!data.commercialReturns.length&&<p>No se han registrado devoluciones comerciales.</p>}
    </Panel>
  </div>;
}
