import { useLayoutEffect, useRef, useState } from 'react';
import { layoutChartLabels } from './chartGeometry.js';

export function useChartLabels(containerRef, points, metricName) {
  const labelNodes = useRef(new Map());
  const [layout, setLayout] = useState({ key: null, labels: [] });
  const key = `${metricName}:${points.map(({ model, x, y, value }) => `${model.id}:${model.label}:${x}:${y}:${value}`).join('|')}`;
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const win = container.ownerDocument.defaultView;
    let frame;
    let disposed = false;
    const measure = () => {
      frame = undefined;
      if (disposed) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      const items = points.flatMap(({ model, x, y }) => {
        const node = labelNodes.current.get(model.id);
        if (!node?.offsetWidth || !node?.offsetHeight) return [];
        return [{ id: model.id, x: x / 100 * width, y: y / 100 * height, width: node.offsetWidth, height: node.offsetHeight }];
      });
      const labels = layoutChartLabels(items, { width, height });
      setLayout((current) => current.key === key && JSON.stringify(current.labels) === JSON.stringify(labels) ? current : { key, labels });
    };
    const schedule = () => {
      if (!disposed && frame === undefined) frame = win.requestAnimationFrame(measure);
    };
    const observer = win.ResizeObserver ? new win.ResizeObserver(schedule) : null;
    observer?.observe(container);
    labelNodes.current.forEach((node) => observer?.observe(node));
    win.addEventListener('resize', schedule, { passive: true });
    const fonts = container.ownerDocument.fonts;
    fonts?.addEventListener?.('loadingdone', schedule);
    fonts?.ready?.then(() => { if (!disposed) schedule(); });
    measure();
    return () => {
      disposed = true;
      if (frame !== undefined) win.cancelAnimationFrame(frame);
      observer?.disconnect();
      win.removeEventListener('resize', schedule);
      fonts?.removeEventListener?.('loadingdone', schedule);
    };
  }, [key, containerRef]);
  const register = (id, node) => {
    if (node) labelNodes.current.set(id, node);
    else labelNodes.current.delete(id);
  };
  return { register, placements: new Map((layout.key === key ? layout.labels : []).map((label) => [label.id, label])) };
}
