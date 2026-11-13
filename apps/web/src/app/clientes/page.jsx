import Workspace from '../../shared/workspace/componentes/Workspace';
import { ClientsPage } from '../../modulos/pedidos/paginas/ClientsPage';
export default function Page() {
  return (
    <Workspace section="clients">
      <ClientsPage />
    </Workspace>
  );
}
