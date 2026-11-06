import { useLayoutEffect, useState } from 'react';
import { intersectRects, placeChartCard } from './chartGeometry.js';

const box = (rect) => ({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });

export function useChartCardPosition(cardRef, anchor, contentKey) {
  const [position, setPosition] = useState(null);
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || !anchor?.isConnected) return undefined;
    const doc = anchor.ownerDocument;
    const win = doc.defaultView;
    const boundaryNode = anchor.closest('.score-map-view, .language-pair-view, .score-chart');
    let frame;
    let disposed = false;
    const measure = () => {
      frame = undefined;
      if (disposed || !anchor.isConnected) return;
      const vv = win.visualViewport;
      const viewport = { x: vv?.offsetLeft || 0, y: vv?.offsetTop || 0, width: vv?.width || win.innerWidth, height: vv?.height || win.innerHeight };
      const boundary = boundaryNode ? box(boundaryNode.getBoundingClientRect()) : viewport;
      const visible = intersectRects(boundary, viewport);
      const usableWidth = visible.width >= 200 ? visible.width : viewport.width;
      card.style.width = `${Math.min(290, Math.max(0, usableWidth - 20))}px`;
      card.style.maxHeight = `${Math.max(0, viewport.height - 20)}px`;
      const size = { width: card.offsetWidth, height: card.offsetHeight };
      if (!size.width || !size.height) return;
      const mark = anchor.closest('.score-point') || anchor;
      const activeLabel = mark.querySelector('.score-point-label');
      const obstacles = [...(boundaryNode?.querySelectorAll('.score-point-label') || [])]
        .filter((node) => node.style.visibility !== 'hidden')
        .map((node) => ({ ...box(node.getBoundingClientRect()), weight: node === activeLabel ? 5 : 1 }));
      if (mark !== anchor) obstacles.push({ ...box(mark.getBoundingClientRect()), weight: 25 });
      const next = placeChartCard({ anchor: box(anchor.getBoundingClientRect()), boundary, viewport, size, obstacles });
      setPosition((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    const schedule = () => { if (!disposed && frame === undefined) frame = win.requestAnimationFrame(measure); };
    const observer = win.ResizeObserver ? new win.ResizeObserver(schedule) : null;
    observer?.observe(card);
    observer?.observe(anchor);
    if (boundaryNode) observer?.observe(boundaryNode);
    const anchorObserver = win.MutationObserver ? new win.MutationObserver(schedule) : null;
    anchorObserver?.observe(anchor, { attributes: true, attributeFilter: ['style'] });
    win.addEventListener('resize', schedule, { passive: true });
    win.addEventListener('scroll', schedule, { capture: true, passive: true });
    win.visualViewport?.addEventListener('resize', schedule);
    win.visualViewport?.addEventListener('scroll', schedule);
    doc.fonts?.addEventListener?.('loadingdone', schedule);
    measure();
    return () => {
      disposed = true;
      if (frame !== undefined) win.cancelAnimationFrame(frame);
      observer?.disconnect();
      anchorObserver?.disconnect();
      win.removeEventListener('resize', schedule);
      win.removeEventListener('scroll', schedule, true);
      win.visualViewport?.removeEventListener('resize', schedule);
      win.visualViewport?.removeEventListener('scroll', schedule);
      doc.fonts?.removeEventListener?.('loadingdone', schedule);
    };
  }, [anchor, contentKey, cardRef]);
  return position;
}
