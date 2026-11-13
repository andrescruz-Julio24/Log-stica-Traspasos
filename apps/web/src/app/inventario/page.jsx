import Workspace from '../../features/workspace/components/Workspace';
import InventarioPage from '../../features/inventario/pages/InventarioPage';
export default function Page() {
  return (
    <Workspace section="stock">
      <InventarioPage />
    </Workspace>
  );
}
