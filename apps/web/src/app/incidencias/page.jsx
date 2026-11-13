import Workspace from '../../shared/workspace/componentes/Workspace';
import IncidenciasPage from '../../modulos/incidencias/paginas/IncidenciasPage';
export default function Page() {
  return (
    <Workspace section="incidents">
      <IncidenciasPage />
    </Workspace>
  );
}
