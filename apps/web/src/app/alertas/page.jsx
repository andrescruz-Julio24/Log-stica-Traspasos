import Workspace from '../../shared/workspace/componentes/Workspace';
import { AlertsPage } from '../../modulos/incidencias/paginas/AlertsPage';
export default function Page() {
  return (
    <Workspace section="alerts">
      <AlertsPage />
    </Workspace>
  );
}
