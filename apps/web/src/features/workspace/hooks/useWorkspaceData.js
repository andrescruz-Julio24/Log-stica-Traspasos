'use client';
import { useEffect,useState } from 'react';
import { emptyWorkspaceData } from '../data/queries';
import { fetchWorkspaceSection } from '../services/workspace.service';

export function useWorkspaceData(section){
  const [data,setData]=useState(emptyWorkspaceData);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  useEffect(()=>{
    let active=true;
    setLoading(true);setError('');setNotice('');
    fetchWorkspaceSection(section).then(result=>{if(active)setData(result);})
      .catch(err=>{if(active)setError(err.message);})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[section]);

  async function reload(){
    setError('');
    try{
      const result=await fetchWorkspaceSection(section);
      setData(result);
      return result;
    }catch(err){
      setError(err.message);
      throw err;
    }
  }
  async function act(task,onSuccess){
    setBusy(true);setError('');setNotice('');
    try{
      await task();
      await reload();
      setNotice('Operación confirmada por el servidor.');
      onSuccess?.();
      return true;
    }catch(err){
      setError(err.message);
      return false;
    }finally{setBusy(false);}
  }
  return {data,loading,busy,error,notice,setError,setNotice,reload,act};
}
