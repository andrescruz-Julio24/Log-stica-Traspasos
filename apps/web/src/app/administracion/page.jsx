import Workspace from '../../features/workspace/components/Workspace';
import { AdministrationPage } from '../../features/administracion/pages/AdministrationPage';
export default function Page() {
  return (
    <Workspace section="admin">
      <AdministrationPage />
    </Workspace>
  );
}
