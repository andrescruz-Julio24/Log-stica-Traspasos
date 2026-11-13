import Workspace from '../../features/workspace/components/Workspace';
import IncidenciasPage from '../../features/incidencias/pages/IncidenciasPage';
export default function Page() {
  return (
    <Workspace section="incidents">
      <IncidenciasPage />
    </Workspace>
  );
}
