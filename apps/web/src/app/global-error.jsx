'use client';
export default function GlobalError({ reset }) {
  return (
    <html lang="es">
      <body>
        <main role="alert">
          <h1>No se pudo iniciar SGTL</h1>
          <button onClick={reset}>Reintentar aplicación</button>
        </main>
      </body>
    </html>
  );
}
