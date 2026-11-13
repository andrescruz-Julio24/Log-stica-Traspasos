import Workspace from '../../features/workspace/components/Workspace';
import { SearchPage } from '../../features/buscar/pages/SearchPage';
export default function Page() {
  return (
    <Workspace section="search">
      <SearchPage />
    </Workspace>
  );
}
