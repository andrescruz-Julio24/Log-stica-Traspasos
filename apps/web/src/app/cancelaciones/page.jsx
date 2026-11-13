import Workspace from '../../features/workspace/components/Workspace';
import { CancellationsPage } from '../../features/cancelaciones/pages/CancellationsPage';
export default function Page() {
  return (
    <Workspace section="cancellations">
      <CancellationsPage />
    </Workspace>
  );
}
