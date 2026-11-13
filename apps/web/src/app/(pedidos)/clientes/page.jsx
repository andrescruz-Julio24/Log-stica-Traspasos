import { queries } from '@/modulos/pedidos/data/queries';
import Workspace from '@/shared/workspace/componentes/Workspace';
import { ClientsPage } from '@/modulos/pedidos/paginas/ClientsPage';
export default function Page() {
  return (
    <Workspace section="clients" query={queries.clients}>
      <ClientsPage />
    </Workspace>
  );
}
