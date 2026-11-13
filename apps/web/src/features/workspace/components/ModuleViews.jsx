'use client';
import { ReservationsPage } from '../../reservas/pages/ReservationsPage';
import { PreparationPage } from '../../preparacion/pages/PreparationPage';
import { DispatchesPage } from '../../despachos/pages/DispatchesPage';
import { TransitPage } from '../../transito/pages/TransitPage';
import { ReceiptsPage } from '../../recepciones/pages/ReceiptsPage';
import { CancellationsPage } from '../../cancelaciones/pages/CancellationsPage';
import { MovementsPage } from '../../movimientos/pages/MovementsPage';
import { AlertsPage } from '../../alertas/pages/AlertsPage';
import { AuthorizationsPage } from '../../autorizaciones/pages/AuthorizationsPage';
import { AdministrationPage } from '../../administracion/pages/AdministrationPage';
import { ClientsPage } from '../../clientes/pages/ClientsPage';
import { ReportsPage } from '../../reportes/pages/ReportsPage';
import { SearchPage } from '../../buscar/pages/SearchPage';

const views={
  reservations: ReservationsPage,
  preparation: PreparationPage,
  dispatches: DispatchesPage,
  transit: TransitPage,
  receipts: ReceiptsPage,
  cancellations: CancellationsPage,
  movements: MovementsPage,
  alerts: AlertsPage,
  authorizations: AuthorizationsPage,
  admin: AdministrationPage,
  clients: ClientsPage,
  reports: ReportsPage,
  search: SearchPage,
};
export default function ModuleViews({section,data}){const View=views[section];return View?<View data={data}/>:null;}
