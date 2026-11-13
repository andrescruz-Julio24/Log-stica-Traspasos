import Workspace from '../../features/workspace/components/Workspace';
import { AlertsPage } from '../../features/alertas/pages/AlertsPage';
export default function Page() {
  return (
    <Workspace section="alerts">
      <AlertsPage />
    </Workspace>
  );
}
