import { useLayoutEffect, useRef, useState } from 'react';

export function useLanguageLabels(pairs) {
  const nodes = useRef(new Map());
  const [layout, setLayout] = useState({ key: null, positions: {} });
  const key = pairs.map((pair) => `${pair.model.id}:${pair.english}:${pair.swahili}`).join('|');
  useLayoutEffect(() => {
    const first = nodes.current.values().next().value;
    if (!first) return undefined;
    const doc = first.ownerDocument;
    const win = doc.defaultView;
    let frame;
    let disposed = false;
    const measure = () => {
      frame = undefined;
      if (disposed) return;
      const positions = {};
      nodes.current.forEach((node, id) => {
        const point = node.parentElement;
        const track = point.closest('.language-pair-track');
        const width = track?.clientWidth;
        if (!width || !node.offsetWidth) return;
        const pointX = parseFloat(point.style.left) / 100 * width;
        const left = Math.max(0, Math.min(width - node.offsetWidth, pointX - node.offsetWidth / 2));
        positions[id] = left - pointX + 9;
      });
      setLayout((current) => current.key === key && JSON.stringify(current.positions) === JSON.stringify(positions) ? current : { key, positions });
    };
    const schedule = () => { if (!disposed && frame === undefined) frame = win.requestAnimationFrame(measure); };
    const observer = win.ResizeObserver ? new win.ResizeObserver(schedule) : null;
    nodes.current.forEach((node) => { observer?.observe(node); observer?.observe(node.closest('.language-pair-track')); });
    win.addEventListener('resize', schedule, { passive: true });
    doc.fonts?.addEventListener?.('loadingdone', schedule);
    doc.fonts?.ready?.then(() => { if (!disposed) schedule(); });
    measure();
    return () => {
      disposed = true;
      if (frame !== undefined) win.cancelAnimationFrame(frame);
      observer?.disconnect();
      win.removeEventListener('resize', schedule);
      doc.fonts?.removeEventListener?.('loadingdone', schedule);
    };
  }, [key]);
  return {
    register(id, node) { if (node) nodes.current.set(id, node); else nodes.current.delete(id); },
    style(id) {
      const left = layout.key === key ? layout.positions[id] : undefined;
      return { left: left ?? 0, transform: 'none', visibility: left === undefined ? 'hidden' : 'visible' };
    },
  };
}
