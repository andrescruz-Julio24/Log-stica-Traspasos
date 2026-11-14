import Workspace from '@/shared/workspace/componentes/Workspace';
import { queries } from '@/modulos/incidencias/data/queries';
import { DevolucionesPage } from '@/modulos/incidencias/paginas/DevolucionesPage';
export default function Page() { return <Workspace section="returns" query={queries.returns}><DevolucionesPage /></Workspace>; }
