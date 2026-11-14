import Workspace from '@/shared/workspace/componentes/Workspace';
import { queries } from '@/modulos/traspasos/data/queries';
import { DriversPage } from '@/modulos/traspasos/paginas/DriversPage';
export default function Page() { return <Workspace section="drivers" query={queries.drivers}><DriversPage/></Workspace>; }
