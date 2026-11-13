import Workspace from '../../features/workspace/components/Workspace';
import { DispatchesPage } from '../../features/despachos/pages/DispatchesPage';
export default function Page() {
  return (
    <Workspace section="dispatches">
      <DispatchesPage />
    </Workspace>
  );
}
