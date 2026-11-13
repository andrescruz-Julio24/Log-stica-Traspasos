'use client';
import { useEffect,useState } from 'react';
import { emptyWorkspaceData } from '../data/queries';
import { fetchWorkspaceSection } from '../services/workspace.service';

export function useWorkspaceData(section){
  const [snapshot,setSnapshot]=useState({section:null,data:emptyWorkspaceData,error:''});
  const [action,setAction]=useState({section:null,error:'',notice:''});
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    let active=true;
    fetchWorkspaceSection(section)
      .then(data=>{if(active)setSnapshot({section,data,error:''});})
      .catch(err=>{if(active)setSnapshot({section,data:emptyWorkspaceData,error:err.message});});
    return ()=>{active=false;};
  },[section]);
  const loading=snapshot.section!==section;
  const data=loading?emptyWorkspaceData:snapshot.data;
  const error=action.section===section&&action.error? action.error:loading?'':snapshot.error;
  const notice=action.section===section?action.notice:'';
  const setError=(message)=>setAction(prev=>({...prev,section,error:message}));
  const setNotice=(message)=>setAction(prev=>({...prev,section,notice:message}));
  async function reload(){
    try{
      const result=await fetchWorkspaceSection(section);
      setSnapshot({section,data:result,error:''});
      setAction(prev=>({...prev,section,error:''}));
      return result;
    }catch(err){
      setSnapshot({section,data:emptyWorkspaceData,error:err.message});
      throw err;
    }
  }
  async function act(task,onSuccess){
    setBusy(true);setAction({section,error:'',notice:''});
    try{
      await task();await reload();
      setAction({section,error:'',notice:'Operación confirmada por el servidor.'});
      onSuccess?.();return true;
    }catch(err){setAction({section,error:err.message,notice:''});return false;}
    finally{setBusy(false);}
  }
  return {data,loading,busy,error,notice,setError,setNotice,reload,act};
}
