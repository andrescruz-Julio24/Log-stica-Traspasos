import Workspace from '../../features/workspace/components/Workspace';
import { ReservationsPage } from '../../features/reservas/pages/ReservationsPage';
export default function Page() {
  return (
    <Workspace section="reservations">
      <ReservationsPage />
    </Workspace>
  );
}
