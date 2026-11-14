import Workspace from '@/shared/workspace/componentes/Workspace';
import { queries } from '@/modulos/pedidos/data/queries';
import { WeightOrdersPage } from '@/modulos/pedidos/paginas/WeightOrdersPage';
export default function Page() {
  return <Workspace section="weightOrders" query={queries.weightOrders}><WeightOrdersPage /></Workspace>;
}
