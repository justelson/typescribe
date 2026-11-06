import Lenis from 'lenis';
import { FINE_POINTER_QUERY, NATIVE_SCROLL_EVENT, REDUCED_MOTION_QUERY, shouldSmoothGesture, shouldSmoothScroll } from './scrollPolicy.js';

const nativeScrollKeys = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab', 'Enter']);

function watchMedia(query, listener) {
  if (query?.addEventListener) {
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }
  query?.addListener?.(listener);
  return () => query?.removeListener?.(listener);
}

// One native-window scroll driver, owned by the persistent public-site shell.
export function createSmoothScrollSession(browser = window, createDriver = (options) => new Lenis(options)) {
  const reducedMotion = browser.matchMedia?.(REDUCED_MOTION_QUERY);
  const finePointer = browser.matchMedia?.(FINE_POINTER_QUERY);
  let driver = null;
  let disposed = false;

  const resetNativePosition = () => {
    if (!driver || driver.isStopped) return;
    // Both are public Lenis methods. No scroll write or history change occurs.
    driver.stop();
    driver.start();
  };
  const synchronizeMenu = () => {
    if (!driver) return;
    if (browser.document.body.classList.contains('menu-open')) driver.stop();
    else driver.start();
  };
  const disposeDriver = () => {
    if (!driver) return;
    driver.stop();
    driver.destroy();
    driver = null;
  };
  const synchronizePolicy = () => {
    if (disposed) return;
    const enabled = shouldSmoothScroll({ reducedMotion: reducedMotion?.matches ?? true, finePointer: finePointer?.matches ?? false });
    if (!enabled) { disposeDriver(); return; }
    if (driver) return;
    driver = createDriver({
      wrapper: browser,
      content: browser.document.documentElement,
      autoRaf: true,
      lerp: .1,
      smoothWheel: true,
      syncTouch: false,
      allowNestedScroll: true,
      anchors: false,
      stopInertiaOnNavigate: false,
      virtualScroll: ({ event }) => shouldSmoothGesture(event),
    });
    synchronizeMenu();
  };
  const onKeyDown = (event) => {
    if (event.defaultPrevented || !nativeScrollKeys.has(event.key)) return;
    const target = event.target;
    if (target?.isContentEditable || target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    resetNativePosition();
  };
  const removeMotionListener = watchMedia(reducedMotion, synchronizePolicy);
  const removePointerListener = watchMedia(finePointer, synchronizePolicy);
  const menuObserver = new browser.MutationObserver(synchronizeMenu);
  menuObserver.observe(browser.document.body, { attributes: true, attributeFilter: ['class'] });
  browser.addEventListener(NATIVE_SCROLL_EVENT, resetNativePosition);
  browser.addEventListener('keydown', onKeyDown);
  browser.addEventListener('pointerdown', resetNativePosition, { passive: true });
  synchronizePolicy();

  return {
    resetNativePosition,
    get active() { return driver !== null; },
    destroy() {
      if (disposed) return;
      disposed = true;
      removeMotionListener();
      removePointerListener();
      menuObserver.disconnect();
      browser.removeEventListener(NATIVE_SCROLL_EVENT, resetNativePosition);
      browser.removeEventListener('keydown', onKeyDown);
      browser.removeEventListener('pointerdown', resetNativePosition);
      disposeDriver();
    },
  };
}
