import { queries } from '@/modulos/supervision/data/queries';
import Workspace from '@/shared/workspace/componentes/Workspace';
import { AdministrationPage } from '@/modulos/supervision/paginas/AdministrationPage';
export default function Page() {
  return (
    <Workspace section="admin" query={queries.admin}>
      <AdministrationPage />
    </Workspace>
  );
}
