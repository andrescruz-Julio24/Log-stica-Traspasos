import { WorkspaceProvider } from '../providers/WorkspaceProvider';
import { Sidebar, SectionNavigation } from './WorkspaceNavigation';
import { WorkspaceContent, RefreshButton } from './WorkspaceContent';
import { areaFor } from '../data/navigation';
export default function Workspace({ section, children }) {
  const area = areaFor(section);
  const current = area.find((item) => item.key === section);
  return (
    <div className="shell">
      <Sidebar area={area} section={section} />
      <WorkspaceProvider key={section} section={section}>
        <main className="main">
          <header className="topbar">
            <div>
              <span className="eyebrow">Operaciones / {area[0].label}</span>
              <h1>{current.label}</h1>
            </div>
            <div className="top-actions">
              <span className="tag">MVP · Desarrollo local</span>
              <RefreshButton />
            </div>
          </header>
          <SectionNavigation area={area} section={section} />
          <WorkspaceContent>{children}</WorkspaceContent>
        </main>
      </WorkspaceProvider>
    </div>
  );
}
