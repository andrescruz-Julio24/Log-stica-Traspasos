import EntityDetail from '../../../features/details/EntityDetail';
export default async function TraspasoDetailPage({params}){
  const {id}=await params;
  return <EntityDetail kind="transfer" id={id}/>;
}
