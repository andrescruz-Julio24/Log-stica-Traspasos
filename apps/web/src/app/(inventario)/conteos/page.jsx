import Workspace from '@/shared/workspace/componentes/Workspace';
import { queries } from '@/modulos/inventario/data/queries';
import { InventoryObservationsPage } from '@/modulos/inventario/paginas/InventoryObservationsPage';

export default function Page() {
  return <Workspace section="counts" query={queries.counts}><InventoryObservationsPage /></Workspace>;
}
