import Workspace from '../../features/workspace/components/Workspace';
import { MovementsPage } from '../../features/movimientos/pages/MovementsPage';
export default function Page() {
  return (
    <Workspace section="movements">
      <MovementsPage />
    </Workspace>
  );
}
