import { queries } from '@/modulos/traspasos/data/queries';
import Workspace from '@/shared/workspace/componentes/Workspace';
import { TransitPage } from '@/modulos/traspasos/paginas/TransitPage';
export default function Page() {
  return (
    <Workspace section="transit" query={queries.transit}>
      <TransitPage />
    </Workspace>
  );
}
