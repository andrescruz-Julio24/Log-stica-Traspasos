import { queries } from '@/modulos/traspasos/data/queries';
import Workspace from '@/shared/workspace/componentes/Workspace';
import { PreparationPage } from '@/modulos/traspasos/paginas/PreparationPage';
export default function Page() {
  return (
    <Workspace section="preparation" query={queries.preparation}>
      <PreparationPage />
    </Workspace>
  );
}
