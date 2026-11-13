import Workspace from '../../features/workspace/components/Workspace';
import PedidosPage from '../../features/pedidos/pages/PedidosPage';
export default function Page() {
  return (
    <Workspace section="orders">
      <PedidosPage />
    </Workspace>
  );
}
