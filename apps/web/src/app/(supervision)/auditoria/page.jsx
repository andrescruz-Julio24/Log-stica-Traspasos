import { queries } from '@/modulos/supervision/data/queries';
import Workspace from '@/shared/workspace/componentes/Workspace';
import AuditoriaPage from '@/modulos/supervision/paginas/AuditoriaPage';
export default function Page() {
  return (
    <Workspace section="audit" query={queries.audit}>
      <AuditoriaPage />
    </Workspace>
  );
}
