import { queries } from '@/modulos/incidencias/data/queries';
import Workspace from '@/shared/workspace/componentes/Workspace';
import { AuthorizationsPage } from '@/modulos/incidencias/paginas/AuthorizationsPage';
export default function Page() {
  return (
    <Workspace section="authorizations" query={queries.authorizations}>
      <AuthorizationsPage />
    </Workspace>
  );
}
