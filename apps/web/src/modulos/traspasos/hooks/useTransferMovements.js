import { submitOnce } from '../../../shared/services/apiClient';
export function useTransferMovements(transferId) {
  const path='/transfers/'+transferId;
  function submitMovement(operation,item,extra={}) {
    return submitOnce(path+'/'+operation,{items:[item],...extra});
  }
  function reserve(payload) {
    return submitOnce(path+'/reservations',payload);
  }
  return {reserve,submitMovement};
}
