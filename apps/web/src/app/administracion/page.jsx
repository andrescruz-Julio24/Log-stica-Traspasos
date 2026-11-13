import Workspace from '../../shared/workspace/componentes/Workspace';
import { AdministrationPage } from '../../modulos/supervision/paginas/AdministrationPage';
export default function Page() {
  return (
    <Workspace section="admin">
      <AdministrationPage />
    </Workspace>
  );
}
