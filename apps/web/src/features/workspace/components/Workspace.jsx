'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname,useRouter } from 'next/navigation';
import { AlertTriangle,ClipboardCheck,Package,RefreshCw } from 'lucide-react';
import { navigation,sectionForPath } from '../data/navigation';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import ModuleViews from './ModuleViews';
import OverviewPage from '../../dashboard/pages/OverviewPage';
import PedidosPage from '../../pedidos/pages/PedidosPage';
import TraspasosPage from '../../traspasos/pages/TraspasosPage';
import InventarioPage from '../../inventario/pages/InventarioPage';
import IncidenciasPage from '../../incidencias/pages/IncidenciasPage';
import AuditoriaPage from '../../auditoria/pages/AuditoriaPage';
import { CreateOrder } from '../../pedidos/components/CreateOrder';
import { CreateTransfer } from '../../traspasos/components/CreateTransfer';
import { CreateIncident } from '../../incidencias/components/CreateIncident';

const modals={
  'new-order':{title:'Nuevo pedido de cliente',Component:CreateOrder},
  'new-transfer':{title:'Nuevo traspaso',Component:CreateTransfer},
  'new-incident':{title:'Registrar incidencia',Component:CreateIncident}
};
function Dialog({title,onClose,children}){
  return <div className="overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><h2>{title}</h2><button type="button" className="ghost" onClick={onClose}>Cerrar ×</button></div>
      {children}
    </div>
  </div>;
}

export default function Workspace(){
  const pathname=usePathname();
  const router=useRouter();
  const section=sectionForPath(pathname);
  const {data,loading,busy,error,notice,setError,setNotice,reload,act}=useWorkspaceData(section);
  const [modal,setModal]=useState(null);
  const [selected,setSelected]=useState(null);
  const title=navigation.find(item=>item.key===section)?.label||'Resumen';
  const onAction=(task)=>act(task,()=>setModal(null));
  const selectedModal=modal?modals[modal]:null;

  function renderSection(){
    switch(section){
      case 'dashboard':return <OverviewPage data={data} router={router}/>;
      case 'orders':return <PedidosPage data={data} setModal={setModal}/>;
      case 'transfers':return <TraspasosPage data={data} setModal={setModal} selected={selected} setSelected={setSelected} busy={busy} act={onAction}/>;
      case 'stock':return <InventarioPage data={data}/>;
      case 'incidents':return <IncidenciasPage data={data} setModal={setModal}/>;
      case 'audit':return <AuditoriaPage data={data}/>;
      default:return <ModuleViews section={section} data={data}/>;
    }
  }

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Package size={22}/></div><div><strong>SGTL</strong><small>Gestión logística</small></div></div>
      <p className="menu-label">OPERACIÓN</p>
      <nav aria-label="Navegación principal">
        {navigation.map(({key,label,icon:Icon,href})=>
          <Link key={key} href={href} aria-current={section===key?'page':undefined}
            className={'nav-btn '+(section===key?'active':'')} onClick={()=>setSelected(null)}>
            <Icon size={18}/>{label}
          </Link>)}
      </nav>
      <div className="sidebar-bottom"><span className="online-dot"/> Entorno de demostración <small>Sin autenticación empresarial</small></div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div><span className="eyebrow">Operaciones / {title}</span><h1>{title}</h1></div>
        <div className="top-actions"><span className="tag">MVP · Desarrollo local</span><button type="button" className="secondary" onClick={()=>reload().catch(()=>{})}><RefreshCw size={16}/> Actualizar</button></div>
      </header>
      {error&&<div className="message error" role="alert"><AlertTriangle size={18}/> {error}<button type="button" className="ghost" onClick={()=>setError('')}>×</button></div>}
      {notice&&<div className="message success" role="status"><ClipboardCheck size={18}/> {notice}<button type="button" className="ghost" onClick={()=>setNotice('')}>×</button></div>}
      {loading?<div className="loading">Cargando datos de operación...</div>:!error||data?renderSection():null}
    </main>
    {selectedModal&&<Dialog title={selectedModal.title} onClose={()=>setModal(null)}>
      <selectedModal.Component data={data} busy={busy} act={onAction}/>
    </Dialog>}
  </div>;
}
