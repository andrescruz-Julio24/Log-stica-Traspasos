import { AlertTriangle, ArrowLeftRight, Boxes, ClipboardCheck, ClipboardList, LayoutDashboard, PackageCheck, Truck, History, Bell, ShieldCheck, Users, Search, BarChart3, Settings, CircleX, ListChecks } from 'lucide-react';

export const navigation=[
  {key:'dashboard',label:'Resumen',icon:LayoutDashboard,href:'/'},
  {key:'orders',label:'Pedidos de clientes',icon:ClipboardList,href:'/pedidos'},
  {key:'clients',label:'Clientes',icon:Users,href:'/clientes'},
  {key:'transfers',label:'Traspasos',icon:ArrowLeftRight,href:'/traspasos'},
  {key:'movements',label:'Movimientos',icon:ArrowLeftRight,href:'/movimientos'},
  {key:'stock',label:'Inventario',icon:Boxes,href:'/inventario'},
  {key:'reservations',label:'Reservas',icon:PackageCheck,href:'/reservas'},
  {key:'preparation',label:'Preparación',icon:ListChecks,href:'/preparacion'},
  {key:'dispatches',label:'Despachos',icon:Truck,href:'/despachos'},
  {key:'transit',label:'En tránsito',icon:Truck,href:'/transito'},
  {key:'receipts',label:'Recepciones',icon:ClipboardCheck,href:'/recepciones'},
  {key:'incidents',label:'Incidencias',icon:AlertTriangle,href:'/incidencias'},
  {key:'cancellations',label:'Cancelaciones',icon:CircleX,href:'/cancelaciones'},
  {key:'authorizations',label:'Autorizaciones',icon:ShieldCheck,href:'/autorizaciones'},
  {key:'alerts',label:'Alertas',icon:Bell,href:'/alertas'},
  {key:'audit',label:'Auditoría',icon:History,href:'/auditoria'},
  {key:'reports',label:'Reportes',icon:BarChart3,href:'/reportes'},
  {key:'search',label:'Búsqueda global',icon:Search,href:'/buscar'},
  {key:'admin',label:'Administración',icon:Settings,href:'/administracion'},
];
export function sectionForPath(pathname){return navigation.find(x=>x.href===pathname)?.key||'dashboard';}
