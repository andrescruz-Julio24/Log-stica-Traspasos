import Workspace from '../../shared/workspace/componentes/Workspace';
import { ReservationsPage } from '../../modulos/inventario/paginas/ReservationsPage';
export default function Page() {
  return (
    <Workspace section="reservations">
      <ReservationsPage />
    </Workspace>
  );
}
