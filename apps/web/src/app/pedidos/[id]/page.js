import EntityDetail from '../../../features/details/EntityDetail';
export default async function PedidoDetailPage({params}){
  const {id}=await params;
  return <EntityDetail kind="order" id={id}/>;
}
