import TransferTracePage from '../../../modulos/traspasos/paginas/TransferTracePage';
import { WorkspaceProvider } from '../../../shared/workspace/providers/WorkspaceProvider';
import { WorkspaceContent } from '../../../shared/workspace/componentes/WorkspaceContent';
import { BackLink } from '../../../shared/componentes/DetailHeader';
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
