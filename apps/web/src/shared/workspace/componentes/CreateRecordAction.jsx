'use client';
import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import styles from '../styles/CreateRecordAction.module.css';
export function CreateRecordAction({ label, title, form: Form }) {
  const dialog = useRef(null);
  const [open, setOpen] = useState(false);
  const { data, busy, saving, act, error } = useWorkspace();
  function show() {
    setOpen(true);
    dialog.current.showModal();
  }
  function close() {
    dialog.current.close();
  }
  return (
    <>
      <button type="button" className="primary" disabled={busy} onClick={show}>
        <Plus size={16} />
        {label}
      </button>
      <dialog
        className={styles.dialog}
        ref={dialog}
        aria-label={title}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialog.current && !saving) close();
        }}
        onCancel={(event) => {
          if (saving) event.preventDefault();
        }}
      >
        {open && (
          <div>
            <div className={styles.head}>
              <h2>{title}</h2>
              <button className="ghost" disabled={saving} onClick={close}>
                Cerrar ×
              </button>
            </div>
            {error && (
              <p role="alert" className="message error">
                {error}
              </p>
            )}
            <Form data={data} busy={busy} act={(task) => act(task, close)} />
          </div>
        )}
      </dialog>
    </>
  );
}
