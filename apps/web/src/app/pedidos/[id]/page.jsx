import EntityDetail from '../../../features/trazabilidad/pages/EntityDetail';
export default async function PedidoDetailPage({params}){
  const {id}=await params;
  return <EntityDetail kind="order" id={id}/>;
}
