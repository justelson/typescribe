export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
export const FINE_POINTER_QUERY = '(pointer: fine)';
export const NATIVE_SCROLL_EVENT = 'typescribe:native-route-scroll';

export function shouldSmoothScroll({ reducedMotion, finePointer }) {
  return !reducedMotion && finePointer;
}

export function shouldSmoothGesture(event) {
  return !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
}

// Cancel wheel inertia before the router reveals a delayed hash destination.
export function prepareNativeScroll(browser = window) {
  browser.dispatchEvent(new browser.Event(NATIVE_SCROLL_EVENT));
}
