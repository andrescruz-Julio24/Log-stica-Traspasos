import Workspace from '../../shared/workspace/componentes/Workspace';
import { CancellationsPage } from '../../modulos/pedidos/paginas/CancellationsPage';
export default function Page() {
  return (
    <Workspace section="cancellations">
      <CancellationsPage />
    </Workspace>
  );
}
