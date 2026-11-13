import Workspace from '../../shared/workspace/componentes/Workspace';
import { DispatchesPage } from '../../modulos/traspasos/paginas/DispatchesPage';
export default function Page() {
  return (
    <Workspace section="dispatches">
      <DispatchesPage />
    </Workspace>
  );
}
