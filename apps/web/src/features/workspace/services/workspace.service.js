import { api } from '../../../shared/services/apiClient';
import { emptyWorkspaceData,queriesBySection } from '../data/queries';

export async function fetchWorkspaceSection(section){
  const keys=queriesBySection[section]||[];
  const values=await Promise.all(keys.map(key=>api('/'+key)));
  const result={...emptyWorkspaceData};
  keys.forEach((key,index)=>{
    if(key==='bootstrap')Object.assign(result,values[index]);
    else result[key]=values[index];
  });
  return result;
}
