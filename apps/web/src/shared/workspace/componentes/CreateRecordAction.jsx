'use client';
import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
export function CreateRecordAction({ label, title, form: Form }) {
  const dialog = useRef(null);
  const [open, setOpen] = useState(false);
  const { data, busy, act, error } = useWorkspace();
  function show() {
    setOpen(true);
    dialog.current.showModal();
  }
  function close() {
    dialog.current.close();
  }
  return (
    <>
      <button type="button" className="primary" onClick={show}>
        <Plus size={16} />
        {label}
      </button>
      <dialog
        className="record-dialog"
        ref={dialog}
        aria-label={title}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialog.current && !busy) close();
        }}
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        {open && (
          <div>
            <div className="modal-head">
              <h2>{title}</h2>
              <button className="ghost" disabled={busy} onClick={close}>
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
