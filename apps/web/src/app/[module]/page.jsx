import { notFound } from 'next/navigation';
import Dashboard from '../../features/dashboard/Dashboard';

const validModules=new Set([
  'pedidos','clientes','traspasos','movimientos','inventario','reservas',
  'preparacion','despachos','transito','recepciones',
  'incidencias','cancelaciones','autorizaciones','alertas',
  'auditoria','reportes','buscar','administracion'
]);
export function generateStaticParams(){return Array.from(validModules).map(module=>({module}));}
export default async function ModulePage({params}){
  const {module}=await params;
  if(!validModules.has(module))notFound();
  return <Dashboard/>;
}
