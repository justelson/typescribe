import { useRef } from 'react';

export function PreviewTabs({ id, label, items, value, onChange, vertical = false, numbered = false, className = '' }) {
  const refs = useRef([]);
  const handleKey = (event, index) => {
    const next = vertical ? 'ArrowDown' : 'ArrowRight';
    const previous = vertical ? 'ArrowUp' : 'ArrowLeft';
    let target;
    if (event.key === next) target = (index + 1) % items.length;
    else if (event.key === previous) target = (index + items.length - 1) % items.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = items.length - 1;
    else return;
    event.preventDefault();
    onChange(items[target].id);
    refs.current[target]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} aria-orientation={vertical ? 'vertical' : 'horizontal'} className={className}>
      {items.map((item, index) => (
        <button
          type="button" role="tab" id={`${id}-${item.id}-tab`} aria-controls={`${id}-${item.id}-panel`}
          aria-selected={value === item.id} tabIndex={value === item.id ? 0 : -1}
          ref={(node) => { refs.current[index] = node; }} onClick={() => onChange(item.id)} onKeyDown={(event) => handleKey(event, index)}
          key={item.id}
        >
          {numbered && <span className="transcript-step-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>}
          <span><strong>{item.label}</strong><span>{item.detail}</span></span>
        </button>
      ))}
    </div>
  );
}
