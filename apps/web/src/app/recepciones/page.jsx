import { queries } from '../../modulos/traspasos/data/queries';
import Workspace from '../../shared/workspace/componentes/Workspace';
import { ReceiptsPage } from '../../modulos/traspasos/paginas/ReceiptsPage';
export default function Page() {
  return (
    <Workspace section="receipts" query={queries.receipts}>
      <ReceiptsPage />
    </Workspace>
  );
}
