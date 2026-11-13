import Workspace from '../../shared/workspace/componentes/Workspace';
import PedidosPage from '../../modulos/pedidos/paginas/PedidosPage';
export default function Page() {
  return (
    <Workspace section="orders">
      <PedidosPage />
    </Workspace>
  );
}
