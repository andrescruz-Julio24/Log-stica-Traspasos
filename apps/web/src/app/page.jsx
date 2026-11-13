import { queries } from '../modulos/supervision/data/queries';
import Workspace from '../shared/workspace/componentes/Workspace';
import OverviewPage from '../modulos/supervision/paginas/OverviewPage';
export default function Page() {
  return (
    <Workspace section="dashboard" query={queries.dashboard}>
      <OverviewPage />
    </Workspace>
  );
}
