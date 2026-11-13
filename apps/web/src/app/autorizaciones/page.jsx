import Workspace from '../../shared/workspace/componentes/Workspace';
import { AuthorizationsPage } from '../../modulos/incidencias/paginas/AuthorizationsPage';
export default function Page() {
  return (
    <Workspace section="authorizations">
      <AuthorizationsPage />
    </Workspace>
  );
}
