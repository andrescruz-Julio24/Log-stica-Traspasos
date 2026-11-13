import { queries } from '@/modulos/supervision/data/queries';
import Workspace from '@/shared/workspace/componentes/Workspace';
import { SearchPage } from '@/modulos/supervision/paginas/SearchPage';
export default function Page() {
  return (
    <Workspace section="search" query={queries.search}>
      <SearchPage />
    </Workspace>
  );
}
