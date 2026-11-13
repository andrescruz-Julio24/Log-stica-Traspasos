'use client';
import { useState } from 'react';
export function OperatorAccess() {
  const [open, setOpen] = useState(false);
  function save(e) {
    e.preventDefault();
    const token = new FormData(e.currentTarget).get('token');
    if (token) sessionStorage.setItem('sgtlAccess', token);
    else sessionStorage.removeItem('sgtlAccess');
    window.location.reload();
  }
  return (
    <>
      <button
        className="secondary"
        type="button"
        onClick={() => setOpen(!open)}
      >
        Acceso de operador
      </button>
      {open && (
        <form onSubmit={save}>
          <label>
            Credencial individual
            <input type="password" name="token" autoComplete="off" />
          </label>
          <button>Aplicar</button>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('sgtlAccess');
              window.location.reload();
            }}
          >
            Salir
          </button>
        </form>
      )}
    </>
  );
}
