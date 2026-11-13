import { queries } from '../../modulos/inventario/data/queries';
import Workspace from '../../shared/workspace/componentes/Workspace';
import InventarioPage from '../../modulos/inventario/paginas/InventarioPage';
export default function Page() {
  return (
    <Workspace section="stock" query={queries.stock}>
      <InventarioPage />
    </Workspace>
  );
}
