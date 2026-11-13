import { queries } from '@/modulos/pedidos/data/queries';
import OrderDetailPage from '@/modulos/pedidos/paginas/OrderDetailPage';
import { WorkspaceProvider } from '@/shared/workspace/providers/WorkspaceProvider';
import { WorkspaceContent } from '@/shared/workspace/componentes/WorkspaceContent';
import { BackLink } from '@/shared/componentes/DetailHeader';
export default async function Page({ params }) {
  const { id } = await params;
  return (
    <WorkspaceProvider query={queries.orderDetail}>
      <WorkspaceContent fallback={<BackLink href="/pedidos" label="pedidos" />}>
        <OrderDetailPage id={id} />
      </WorkspaceContent>
    </WorkspaceProvider>
  );
}
