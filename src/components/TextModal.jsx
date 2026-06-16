import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function TextModal({ open, title, label, initialValue = '', confirmLabel = 'Save', onCancel, onConfirm }) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [initialValue, open]);

  if (!open) return null;

  function submit(event) {
    event.preventDefault();
    if (!value.trim()) return;
    onConfirm(value.trim());
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <form className="text-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <strong>{title}</strong>
          <button type="button" aria-label="Close" onClick={onCancel}><X size={15} /></button>
        </header>
        <label>
          <span>{label}</span>
          <input autoFocus value={value} onChange={(event) => setValue(event.target.value)} />
        </label>
        <footer>
          <button type="button" onClick={onCancel}>Cancel</button>
          <button className="primary" type="submit" disabled={!value.trim()}>{confirmLabel}</button>
        </footer>
      </form>
    </div>
  );
}
