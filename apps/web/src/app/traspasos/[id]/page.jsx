import TransferTracePage from '../../../features/traspasos/pages/TransferTracePage';
import { WorkspaceProvider } from '../../../features/workspace/providers/WorkspaceProvider';
import { WorkspaceContent } from '../../../features/workspace/components/WorkspaceContent';
import { BackLink } from '../../../features/trazabilidad/components/DetailHeader';
export default async function Page({ params }) {
  const { id } = await params;
  return (
    <WorkspaceProvider section="transferDetail">
      <WorkspaceContent
        fallback={<BackLink href="/traspasos" label="traspasos" />}
      >
        <TransferTracePage id={id} />
      </WorkspaceContent>
    </WorkspaceProvider>
  );
}
