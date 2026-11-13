import { queries } from '@/modulos/incidencias/data/queries';
import Workspace from '@/shared/workspace/componentes/Workspace';
import IncidenciasPage from '@/modulos/incidencias/paginas/IncidenciasPage';
export default function Page() {
  return (
    <Workspace section="incidents" query={queries.incidents}>
      <IncidenciasPage />
    </Workspace>
  );
}
