import Link from 'next/link';
export function BackLink({ href, label }) {
  return (
    <Link href={href} className="secondary">
      ← Volver a {label}
    </Link>
  );
}
export function DetailHeader({ title, subtitle, href, backLabel }) {
  return (
    <header className="detail-page-header">
      <div>
        <span className="eyebrow">Operaciones / Detalle</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <BackLink href={href} label={backLabel} />
    </header>
  );
}
