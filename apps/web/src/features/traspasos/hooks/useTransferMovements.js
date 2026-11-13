import { useRef } from 'react';
import { submit } from '../../../shared/services/apiClient';
export function useTransferMovements(transferId) {
  const pendingKeys = useRef(new Map());
  async function submitMovement(operation, item, extra = {}) {
    const path = '/transfers/' + transferId + '/' + operation;
    const payload = { items: [item], ...extra };
    const signature = path + JSON.stringify(payload);
    const key = pendingKeys.current.get(signature) || crypto.randomUUID();
    pendingKeys.current.set(signature, key);
    const result = await submit(path, payload, {
      headers: { 'Idempotency-Key': key },
    });
    pendingKeys.current.delete(signature);
    return result;
  }
  function reserve(payload) {
    return submit('/transfers/' + transferId + '/reservations', payload);
  }
  return { reserve, submitMovement };
}
