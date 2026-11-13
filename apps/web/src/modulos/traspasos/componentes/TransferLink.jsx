import styles from '../styles/TransferLink.module.css';
import Link from 'next/link';
export function TransferLink({t}){return <Link href={'/traspasos/'+t.id} className={`text-link ${styles.transferLink}`}>{t.code}</Link>}
