import { queries } from '@/modulos/inventario/data/queries';
import Workspace from '@/shared/workspace/componentes/Workspace';
import { ReservationsPage } from '@/modulos/inventario/paginas/ReservationsPage';
export default function Page() {
  return (
    <Workspace section="reservations" query={queries.reservations}>
      <ReservationsPage />
    </Workspace>
  );
}
