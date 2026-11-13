import { queries } from '../../modulos/pedidos/data/queries';
import Workspace from '../../shared/workspace/componentes/Workspace';
import PedidosPage from '../../modulos/pedidos/paginas/PedidosPage';
export default function Page() {
  return (
    <Workspace section="orders" query={queries.orders}>
      <PedidosPage />
    </Workspace>
  );
}
