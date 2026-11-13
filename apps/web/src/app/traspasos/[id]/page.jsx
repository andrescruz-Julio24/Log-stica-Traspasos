import EntityDetail from '../../../features/trazabilidad/pages/EntityDetail';
export default async function TraspasoDetailPage({params}){
  const {id}=await params;
  return <EntityDetail kind="transfer" id={id}/>;
}
