import Workspace from '../../shared/workspace/componentes/Workspace';
import InventarioPage from '../../modulos/inventario/paginas/InventarioPage';
export default function Page() {
  return (
    <Workspace section="stock">
      <InventarioPage />
    </Workspace>
  );
}
