'use client';
import Link from 'next/link';
export default function RouteError({ reset }) {
  return (
    <main role="alert">
      <h1>No se pudo abrir la sección</h1>
      <button onClick={reset}>Reintentar sección</button>{' '}
      <Link href="/">Volver al resumen</Link>
    </main>
  );
}
