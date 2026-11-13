import OrderDetailPage from '../../../features/pedidos/pages/OrderDetailPage';
import { WorkspaceProvider } from '../../../features/workspace/providers/WorkspaceProvider';
import { WorkspaceContent } from '../../../features/workspace/components/WorkspaceContent';
import { BackLink } from '../../../features/trazabilidad/components/DetailHeader';
export default async function Page({ params }) {
  const { id } = await params;
  return (
    <WorkspaceProvider section="orderDetail">
      <WorkspaceContent fallback={<BackLink href="/pedidos" label="pedidos" />}>
        <OrderDetailPage id={id} />
      </WorkspaceContent>
    </WorkspaceProvider>
  );
}
