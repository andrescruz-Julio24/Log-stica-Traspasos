import Workspace from '../../features/workspace/components/Workspace';
import { AuthorizationsPage } from '../../features/autorizaciones/pages/AuthorizationsPage';
export default function Page() {
  return (
    <Workspace section="authorizations">
      <AuthorizationsPage />
    </Workspace>
  );
}
