import Workspace from '../features/workspace/components/Workspace';
import OverviewPage from '../features/dashboard/pages/OverviewPage';
export default function Page() {
  return (
    <Workspace section="dashboard">
      <OverviewPage />
    </Workspace>
  );
}
