import { queries } from '../../modulos/inventario/data/queries';
import Workspace from '../../shared/workspace/componentes/Workspace';
import { MovementsPage } from '../../modulos/inventario/paginas/MovementsPage';
export default function Page() {
  return (
    <Workspace section="movements" query={queries.movements}>
      <MovementsPage />
    </Workspace>
  );
}
