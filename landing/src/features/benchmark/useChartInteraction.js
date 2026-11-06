import { useEffect, useRef, useState } from 'react';

export function useChartInteraction(resetKey) {
  const [active, setActive] = useState(null);
  const hovered = useRef(null);
  const focused = useRef(null);
  const cardHovered = useRef(false);
  const timer = useRef(null);
  const cancelClose = () => { clearTimeout(timer.current); timer.current = null; };
  const closeLater = () => {
    cancelClose();
    timer.current = setTimeout(() => {
      timer.current = null;
      if (!cardHovered.current) setActive(hovered.current || focused.current);
    }, 160);
  };
  const activate = (model, anchor, source = 'pointer') => {
    cancelClose();
    const next = { key: resetKey, model, anchor };
    if (source === 'focus') focused.current = next;
    else hovered.current = next;
    setActive(next);
  };
  const leave = (anchor, source = 'pointer') => {
    const current = source === 'focus' ? focused : hovered;
    if (current.current?.anchor === anchor || anchor.contains(current.current?.anchor)) current.current = null;
    closeLater();
  };
  useEffect(() => {
    cancelClose();
    hovered.current = null;
    focused.current = null;
    cardHovered.current = false;
    setActive(null);
    const dismiss = (event) => {
      if (event.key !== 'Escape') return;
      cancelClose();
      hovered.current = null;
      focused.current = null;
      cardHovered.current = false;
      setActive(null);
    };
    window.addEventListener('keydown', dismiss);
    return () => { cancelClose(); window.removeEventListener('keydown', dismiss); };
  }, [resetKey]);
  return {
    active: active?.key === resetKey ? active : null,
    activate,
    leave,
    cardEvents: {
      onMouseEnter() { cardHovered.current = true; cancelClose(); },
      onMouseLeave() { cardHovered.current = false; closeLater(); },
    },
  };
}
