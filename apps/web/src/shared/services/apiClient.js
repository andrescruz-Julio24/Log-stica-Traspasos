const base = process.env.NEXT_PUBLIC_API_BASE || '/api';
export async function api(path, options = {}) {
  const token =
    typeof window !== 'undefined' && sessionStorage.getItem('sgtlAccess');
  const response = await fetch(base + path, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers || {}),
    },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(json.message)
      ? json.message.join(', ')
      : json.message;
    throw new Error(message || 'Error HTTP ' + response.status);
  }
  return json;
}
export function submit(path, data, extra = {}) {
  return api(path, { method: 'POST', body: JSON.stringify(data), ...extra });
}

// Conservar la clave ante una respuesta perdida, incluso si se vuelve a abrir
// el formulario en la misma pestaña. Una confirmación permite una nueva captura.
export async function submitOnce(path,data){
  const intent=JSON.stringify([sessionStorage.getItem('sgtlAccess'),path,data]);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(intent));
  const storageKey='sgtl:pending:'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  const key=sessionStorage.getItem(storageKey)||crypto.randomUUID();
  sessionStorage.setItem(storageKey,key);
  const result=await submit(path,data,{headers:{'Idempotency-Key':key}});
  if(sessionStorage.getItem(storageKey)===key)sessionStorage.removeItem(storageKey);
  return result;
}
