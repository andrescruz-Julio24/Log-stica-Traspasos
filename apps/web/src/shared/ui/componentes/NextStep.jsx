'use client';
import Link from 'next/link';

export function NextStep({ href = '/traspasos', label = 'Ir a traspasos' }) {
  return (
    <Link href={href} className="secondary">
      {label}
    </Link>
  );
}
