export function inventorySource() {
  return process.env.SGTL_INVENTORY_SOURCE === 'ERP' ? 'ERP' : 'SGTL';
}
export function hasFreshInventory(checkedAt: Date | null) {
  if (inventorySource() !== 'ERP') return true;
  const maxAge = Number(process.env.SGTL_ERP_MAX_AGE_MINUTES || 15) * 60000;
  return checkedAt !== null && Date.now() - checkedAt.getTime() <= maxAge;
}
