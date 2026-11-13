import Link from 'next/link';
import {
  Package,
  LayoutDashboard,
  ClipboardList,
  ArrowLeftRight,
  Boxes,
  AlertTriangle,
} from 'lucide-react';
import { areas } from '../data/navigation';
const icons = {
  dashboard: LayoutDashboard,
  orders: ClipboardList,
  transfers: ArrowLeftRight,
  stock: Boxes,
  incidents: AlertTriangle,
};
export function Sidebar({ area, section }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Package size={22} />
        </div>
        <div>
          <strong>SGTL</strong>
          <small>Gestión logística</small>
        </div>
      </div>
      <nav aria-label="Navegación principal">
        {areas.map(([entry]) => {
          const Icon = icons[entry.key];
          return (
            <Link
              key={entry.key}
              href={entry.href}
              aria-current={entry.key === section ? 'page' : undefined}
              className={
                'nav-btn ' + (entry.key === area[0].key ? 'active' : '')
              }
            >
              <Icon size={18} />
              {entry.label}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        Entorno de demostración <small>Sin autenticación empresarial</small>
      </div>
    </aside>
  );
}
export function SectionNavigation({ area, section }) {
  return (
    <nav className="section-nav" aria-label={'Secciones de ' + area[0].label}>
      {area.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.key === section ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
