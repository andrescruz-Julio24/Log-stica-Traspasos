import Workspace from '../../features/workspace/components/Workspace';
import { ReceiptsPage } from '../../features/recepciones/pages/ReceiptsPage';
export default function Page() {
  return (
    <Workspace section="receipts">
      <ReceiptsPage />
    </Workspace>
  );
}
