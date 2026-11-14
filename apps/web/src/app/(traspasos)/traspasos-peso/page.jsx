import { queries } from '@/modulos/traspasos/data/queries';
import Workspace from '@/shared/workspace/componentes/Workspace';
import { MeasuredTransfersPage } from '@/modulos/traspasos/paginas/MeasuredTransfersPage';

export default function Page() {
  return <Workspace section="measuredTransfers" query={queries.measuredTransfers}><MeasuredTransfersPage /></Workspace>;
}
