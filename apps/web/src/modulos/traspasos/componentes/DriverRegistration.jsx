'use client';
import styles from '../styles/DriverRegistration.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';
export function DriverRegistration() {
  const { data, busy, act } = useWorkspace();
  function register(e) {
    e.preventDefault();const form=e.currentTarget;const f=new FormData(form);
    act(()=>submitOnce('/drivers',{fullName:String(f.get('name')).trim(),category:f.get('category')}),()=>form.reset());
  }
  return <div className={styles.content}>
    <form onSubmit={register} className={styles.form}>
      <h3>Registrar chofer (requiere supervisor)</h3>
      <label className="field">Nombre completo<input name="name" required maxLength={130}/></label>
      <label className="field">Tipo de chofer
        <select name="category"><option value="REGULAR">Habitual autorizado</option>
          <option value="SUPPORT">Apoyo temporal (requiere nombramiento al asignar)</option>
        </select>
      </label>
      <button className="primary" disabled={busy}>Registrar chofer</button>
    </form>
    <div className={styles.drivers}>
      {data.drivers.map(driver=><div key={driver.id} className={styles.driver}>
        <strong>{driver.fullName}</strong>
        <span>{driver.category==='SUPPORT'?'Personal de apoyo':'Chofer habitual'} · {driver.available?'Disponible':'No disponible'}</span>
        <button type="button" className="secondary" disabled={busy}
          onClick={()=>act(()=>submitOnce('/drivers/'+driver.id+'/availability',{
            available:!driver.available,reason:'Actualización de disponibilidad operativa',
          }))}>{driver.available?'Marcar no disponible':'Marcar disponible'}</button>
      </div>)}
    </div>
  </div>;
}
