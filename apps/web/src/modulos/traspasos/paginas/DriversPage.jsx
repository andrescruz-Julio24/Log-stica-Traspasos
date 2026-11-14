'use client';
import styles from '../styles/DriversPage.module.css';
import { Panel } from '../../../shared/ui/ModuleKit';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { DriverRegistration } from '../componentes/DriverRegistration';
import { TripForm, TripAssignment } from '../componentes/TripForm';
export function DriversPage() {
  const { data }=useWorkspace();
  return <div className={styles.content}>
    <Panel title="Choferes autorizados y disponibilidad"
      description="T-23: altas y disponibilidad bajo autorización de supervisor; apoyo temporal exige vigencia.">
      <DriverRegistration/>
    </Panel>
    <Panel title="Viajes y cambios de chofer"
      description="Cada cambio conserva conductor anterior, motivo, responsable y fecha. No sobreescribe el historial.">
      <TripForm/>
      <div className={styles.trips}>{data.trips.map(t=><TripAssignment trip={t} key={t.id}/>)}</div>
      {!data.trips.length&&<p>No hay viajes programados.</p>}
    </Panel>
  </div>;
}
