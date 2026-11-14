import Workspace from '@/shared/workspace/componentes/Workspace';
import { queries } from '@/modulos/inventario/data/queries';
import { SupplierReceiptsPage } from '@/modulos/inventario/paginas/SupplierReceiptsPage';

export default function Page() {
  return <Workspace section="suppliers" query={queries.suppliers}><SupplierReceiptsPage /></Workspace>;
}
