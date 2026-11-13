const base=process.env.NEXT_PUBLIC_API_BASE||'/api';
export async function api(path,options={}){
  const response=await fetch(base+path,{cache:'no-store',...options,headers:{'Content-Type':'application/json','x-demo-actor':'operador-demo',...(options.headers||{})}});
  const json=await response.json().catch(()=>({}));
  if(!response.ok){
    const message=Array.isArray(json.message)?json.message.join(', '):json.message;
    throw new Error(message||('Error HTTP '+response.status));
  }
  return json;
}
export function submit(path,data,extra={}){return api(path,{method:'POST',body:JSON.stringify(data),...extra});}
