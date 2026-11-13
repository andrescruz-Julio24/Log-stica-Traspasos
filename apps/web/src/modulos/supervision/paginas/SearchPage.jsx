'use client';
import styles from '../styles/SearchPage.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import Link from 'next/link';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import { Empty, Panel, SearchField, Table } from '../../../shared/ui/ModuleKit';

export function SearchPage() {
  const { data, complete } = useWorkspace();
  const { q, setQ, normalized, entries } = useGlobalSearch(data);
  return (
    <Panel
      title="Búsqueda global"
      description="Busca por SKU, folio, cliente o descripción. Los resultados se limitan a los registros disponibles en la API."
    >
      <div className={`module-toolbar ${styles.toolbar}`}>
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Escribe un SKU, cliente, folio o incidencia"
        />
      </div>
      {normalized ? (
        <Table
          headers={['Tipo', 'Identificador', 'Referencia', 'Acción']}
          rows={entries.map((x) => ({
            key: x.key,
            cells: [
              x.type,
              <strong key="column-1">{x.title}</strong>,
              x.detail,
              <Link key="column-2" href={x.href} className="text-link">
                Consultar
              </Link>,
            ],
          }))}
          empty={
            complete
              ? 'Sin coincidencias para la búsqueda.'
              : 'Sin coincidencias en las fuentes disponibles.'
          }
        />
      ) : (
        <Empty message="Introduce al menos un término para buscar en los registros del SGTL." />
      )}
    </Panel>
  );
}
