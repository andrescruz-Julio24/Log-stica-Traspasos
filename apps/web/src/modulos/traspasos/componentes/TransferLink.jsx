import Link from 'next/link';
export function TransferLink({t}){return <Link href={'/traspasos/'+t.id} className="text-link">{t.code}</Link>}
