import { api } from '../../services/apiClient';

export async function loadResource(key, signal) {
  const deadline = AbortSignal.timeout(15000);
  try {
    const isOrderDelivery = key.startsWith('client-deliveries:');
    const isOrderReturn = key.startsWith('commercial-returns:');
    const isTransferSchedule = key.startsWith('transfer-schedules:');
    const endpoint = isOrderDelivery
      ? '/client-deliveries?orderId=' + encodeURIComponent(key.slice('client-deliveries:'.length))
      : isOrderReturn ? '/commercial-returns?orderId=' + encodeURIComponent(key.slice('commercial-returns:'.length))
      : isTransferSchedule ? '/transfers/' + encodeURIComponent(key.slice('transfer-schedules:'.length)) + '/schedules'
      : '/' + key;
    const value = await api(endpoint, {
      signal: AbortSignal.any([signal, deadline]),
    });
    const valid =
      key === 'bootstrap'
        ? ['products', 'locations', 'stocks'].every((field) =>
            Array.isArray(value?.[field]),
          )
        : Array.isArray(value);
    if (!valid) throw new Error('La respuesta de ' + key + ' está incompleta.');
    return key === 'bootstrap' ? value : key === 'inventory-observations' ? { inventoryObservations: value } : key === 'supplier-receipts' ? { supplierReceipts: value } : key === 'measured-transfers' ? { measuredTransfers: value } : key === 'unit-stocks' ? { unitStocks: value } : (key === 'client-deliveries' || isOrderDelivery) ? { clientDeliveries: value } : (key === 'commercial-returns' || isOrderReturn) ? { commercialReturns: value } : key === 'weight-orders' ? { weightOrders: value } : isTransferSchedule ? { transferSchedules: value } : { [key]: value };
  } catch (error) {
    if (deadline.aborted && !signal.aborted)
      throw new Error('La consulta tardó demasiado.');
    throw error;
  }
}
