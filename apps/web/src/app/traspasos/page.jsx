import { queries } from '../../modulos/traspasos/data/queries';
import Workspace from '../../shared/workspace/componentes/Workspace';
import TraspasosPage from '../../modulos/traspasos/paginas/TraspasosPage';
export default function Page() {
  return (
    <Workspace section="transfers" query={queries.transfers}>
      <TraspasosPage />
    </Workspace>
  );
}
