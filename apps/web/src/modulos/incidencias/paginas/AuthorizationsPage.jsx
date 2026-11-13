import styles from '../styles/AuthorizationsPage.module.css';
import { ExceptionRequestForm } from '../componentes/ExceptionRequestForm';
import { ExceptionDecisions } from '../componentes/ExceptionDecisions';
export function AuthorizationsPage() {
  return (
    <div className={styles.content}>
      <ExceptionRequestForm />
      <ExceptionDecisions />
    </div>
  );
}
