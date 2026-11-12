'use client';
import {ReservationsPage,PreparationPage,DispatchesPage,TransitPage,ReceiptsPage,CancellationsPage} from './OperationsViews';
import {AlertsPage,AuthorizationsPage,AdministrationPage} from './GovernanceViews';
import {ClientsPage,ReportsPage,SearchPage} from './InsightViews';

const views={
  clients:ClientsPage,
  reservations:ReservationsPage,
  preparation:PreparationPage,
  dispatches:DispatchesPage,
  transit:TransitPage,
  receipts:ReceiptsPage,
  cancellations:CancellationsPage,
  authorizations:AuthorizationsPage,
  alerts:AlertsPage,
  reports:ReportsPage,
  search:SearchPage,
  admin:AdministrationPage,
};
export default function ModuleViews({section,data}){
  const View=views[section];
  return View?<View data={data}/>:null;
}
