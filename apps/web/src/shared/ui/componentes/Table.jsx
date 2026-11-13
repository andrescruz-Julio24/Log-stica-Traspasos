'use client';
import styles from '../styles/Table.module.css';
import { Empty } from './Empty';

export function Table({ headers, rows, empty = 'No hay registros.' }) {
  return (
    <div className={styles.scroll}>
      <table>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th scope="col" key={i}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.key || i}>
              {row.cells.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <Empty message={empty} />}
    </div>
  );
}
