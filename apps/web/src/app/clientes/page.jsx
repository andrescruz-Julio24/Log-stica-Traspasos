import Workspace from '../../features/workspace/components/Workspace';
import { ClientsPage } from '../../features/clientes/pages/ClientsPage';
export default function Page() {
  return (
    <Workspace section="clients">
      <ClientsPage />
    </Workspace>
  );
}
