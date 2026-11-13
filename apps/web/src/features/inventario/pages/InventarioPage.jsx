'use client';
import { Status, Panel, Empty } from '../../../shared/ui/ModuleKit';
export default function InventarioPage({data}){
  return (<Panel title="Inventario por ubicación" subtitle="Existencia física ≠ disponible para nuevas reservas"><div className="table-scroll"><table><thead><tr><th>SKU</th><th>Producto</th><th>Ubicación</th><th>Físico</th><th>Reservado</th><th>Bloqueado</th><th>Disponible</th></tr></thead><tbody>{data.stocks.map(s=><tr key={s.id}><td><strong>{s.product.sku}</strong></td><td>{s.product.name}</td><td>{s.location.name}</td><td>{s.physical}</td><td>{s.reserved}</td><td>{s.blocked}</td><td><strong className="positive">{s.physical-s.reserved-s.blocked}</strong></td></tr>)}</tbody></table>{!data.stocks.length&&<Empty>Sin registros de inventario.</Empty>}</div></Panel>);
}
