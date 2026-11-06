import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, Outlet, RouterProvider, ScrollRestoration, useLocation } from 'react-router-dom';
import { useSmoothScroll } from '../../landing/src/hooks/useSmoothScroll.js';
import { createSmoothScrollSession } from '../../landing/src/hooks/smoothScrollSession.js';
import { FINE_POINTER_QUERY, REDUCED_MOTION_QUERY, prepareNativeScroll, shouldSmoothGesture, shouldSmoothScroll } from '../../landing/src/hooks/scrollPolicy.js';

function fixture(t, { reducedMotion = false, finePointer = true, mountSession = true } = {}) {
  const dom = new JSDOM('<!doctype html><html><body><main id="content"><pre id="nested" style="overflow-y:auto">Sample export</pre><input id="editing" /></main></body></html>', { url: 'http://127.0.0.1:8780/', pretendToBeVisual: true });
  const { window } = dom;
  const media = new Map();
  window.matchMedia = (query) => {
    if (!media.has(query)) media.set(query, { matches: query === REDUCED_MOTION_QUERY ? reducedMotion : query === FINE_POINTER_QUERY ? finePointer : false, listeners: new Set(), addEventListener(_event, handler) { this.listeners.add(handler); }, removeEventListener(_event, handler) { this.listeners.delete(handler); } });
    return media.get(query);
  };
  const changeMedia = (query, matches) => {
    const value = window.matchMedia(query); value.matches = matches;
    for (const handler of [...value.listeners]) handler({ matches });
  };
  let position = 0;
  Object.defineProperty(window, 'scrollY', { get: () => position });
  Object.defineProperty(window, 'scrollX', { get: () => 0 });
  window.scrollTo = (options, top) => { position = typeof options === 'object' ? options.top ?? position : top; window.dispatchEvent(new window.Event('scroll')); };
  for (const [key, value] of Object.entries({ scrollHeight: 4000, clientHeight: 800, scrollWidth: 1200, clientWidth: 1200 })) Object.defineProperty(window.document.documentElement, key, { value });
  Object.defineProperty(window, 'innerHeight', { value: 800 });
  Object.defineProperty(window, 'innerWidth', { value: 1200 });
  const nested = window.document.getElementById('nested');
  for (const [key, value] of Object.entries({ scrollHeight: 700, clientHeight: 200, scrollWidth: 300, clientWidth: 300 })) Object.defineProperty(nested, key, { value });
  let id = 0;
  let time = 0;
  const frames = new Map();
  window.requestAnimationFrame = (handler) => { frames.set(++id, handler); return id; };
  window.cancelAnimationFrame = (frame) => frames.delete(frame);
  const advance = (count = 1) => {
    for (let i = 0; i < count; i++) {
      time += 1000 / 60;
      const current = [...frames.values()]; frames.clear();
      for (const handler of current) handler(time);
    }
  };
  class ResizeObserver { observe() {} unobserve() {} disconnect() {} }
  const values = { window, Window: window.Window, document: window.document, navigator: window.navigator, HTMLElement: window.HTMLElement, HTMLAnchorElement: window.HTMLAnchorElement, CustomEvent: window.CustomEvent, ResizeObserver, getComputedStyle: window.getComputedStyle.bind(window), requestAnimationFrame: window.requestAnimationFrame, cancelAnimationFrame: window.cancelAnimationFrame, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(values).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  let session;
  t.after(() => {
    session?.destroy();
    advance(2);
    window.close();
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  });
  if (mountSession) session = createSmoothScrollSession(window);
  const wheel = (target = window.document.getElementById('content'), options = {}) => {
    const event = new window.WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true, composed: true, ...options });
    target.dispatchEvent(event); return event;
  };
  return { window, session, wheel, advance, frames, changeMedia, media };
}

test('scroll policy honours reduced motion, fine pointers and native modified gestures', () => {
  assert.equal(shouldSmoothScroll({ reducedMotion: false, finePointer: true }), true);
  for (const values of [{ reducedMotion: true, finePointer: true }, { reducedMotion: false, finePointer: false }]) assert.equal(shouldSmoothScroll(values), false);
  assert.equal(shouldSmoothGesture({}), true);
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey']) assert.equal(shouldSmoothGesture({ [modifier]: true }), false);
});

test('real Lenis eases desktop wheel input through native window scroll, without a transformed wrapper', (t) => {
  const { window, session, wheel, advance } = fixture(t);
  assert.equal(session.active, true);
  assert.equal(wheel().defaultPrevented, true);
  assert.equal(window.scrollY, 0, 'Scroll should not jump straight to its target');
  advance(6);
  assert.ok(window.scrollY > 0 && window.scrollY < 120, window.scrollY);
  advance(100);
  assert.equal(window.scrollY, 120);
  assert.equal(window.document.getElementById('content').style.transform, '');
  assert.ok(window.document.documentElement.classList.contains('lenis'));
});

test('nested scroll areas, touch and modified wheels stay native', (t) => {
  const { window, wheel, advance } = fixture(t);
  assert.equal(wheel(window.document.getElementById('nested')).defaultPrevented, false);
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey']) assert.equal(wheel(undefined, { [modifier]: true }).defaultPrevented, false);
  const touch = new window.Event('touchmove', { bubbles: true, cancelable: true, composed: true });
  Object.defineProperty(touch, 'targetTouches', { value: [{ clientX: 0, clientY: 50 }] });
  window.document.getElementById('content').dispatchEvent(touch);
  assert.equal(touch.defaultPrevented, false);
  advance(10);
  assert.equal(window.scrollY, 0);
});

test('native route restoration, delayed hashes and keyboard input cancel the previous wheel target', (t) => {
  const { window, session, wheel, advance } = fixture(t);
  wheel(); advance(5);
  window.scrollTo({ top: 700, behavior: 'instant' });
  session.resetNativePosition();
  advance(80);
  assert.equal(window.scrollY, 700, 'Previous-page inertia overrode restored history position');
  wheel(); advance(3);
  prepareNativeScroll(window);
  window.scrollTo({ top: 1000, behavior: 'instant' });
  advance(80);
  assert.equal(window.scrollY, 1000, 'Wheel inertia overrode the delayed hash destination');
  wheel(); advance(4);
  const settled = window.scrollY;
  const event = new window.KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true });
  window.document.getElementById('content').dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  advance(60);
  assert.equal(window.scrollY, settled, 'Native keyboard input did not stop wheel inertia');
});

test('the persistent React router hook preserves native PUSH/POP positions with one live driver', async (t) => {
  const { window, wheel, advance, frames } = fixture(t, { mountSession: false });
  function Shell() {
    const location = useLocation();
    useSmoothScroll(location.key);
    return createElement('div', { id: 'persistent-scroll-shell' }, createElement(Outlet), createElement(ScrollRestoration));
  }
  const router = createMemoryRouter([{ element: createElement(Shell), children: [
    { path: '/', element: createElement('h1', null, 'Home') },
    { path: '/next', element: createElement('h1', null, 'Next page') },
  ] }]);
  const container = window.document.createElement('div'); window.document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(StrictMode, null, createElement(RouterProvider, { router }))));
    const shell = window.document.getElementById('persistent-scroll-shell');
    assert.equal(frames.size, 1);
    assert.equal(wheel().defaultPrevented, true);
    advance(6);
    const previousPosition = window.scrollY;
    assert.ok(previousPosition > 0 && previousPosition < 120);
    await act(async () => router.navigate('/next'));
    advance(60);
    assert.equal(window.scrollY, 0, 'Old wheel inertia continued after a route PUSH');
    assert.equal(window.document.getElementById('persistent-scroll-shell'), shell);
    assert.equal(frames.size, 1, 'Navigation created another animation loop');
    await act(async () => router.navigate(-1));
    advance(60);
    assert.equal(window.scrollY, previousPosition, 'POP lost the stored native scroll position');
    assert.equal(frames.size, 1);
  } finally {
    await act(async () => root.unmount());
    router.dispose();
  }
  assert.equal(frames.size, 0, 'Unmount left the smooth-scroll frame loop running');
  assert.ok(!window.document.documentElement.classList.contains('lenis'));
});

test('motion/pointer changes and menu locking cleanly stop and dispose scrolling', async (t) => {
  const { window, session, wheel, advance, frames, changeMedia, media } = fixture(t, { reducedMotion: true });
  assert.equal(session.active, false);
  assert.equal(wheel().defaultPrevented, false);
  assert.equal(frames.size, 0);
  changeMedia(REDUCED_MOTION_QUERY, false);
  assert.equal(session.active, true);
  wheel(); advance(4);
  const lockedPosition = window.scrollY;
  window.document.body.classList.add('menu-open');
  await Promise.resolve();
  assert.ok(window.document.documentElement.classList.contains('lenis-stopped'));
  advance(40);
  assert.equal(window.scrollY, lockedPosition, 'Scrolling continued behind the open menu');
  window.document.body.classList.remove('menu-open');
  await Promise.resolve();
  assert.ok(!window.document.documentElement.classList.contains('lenis-stopped'));
  wheel(); advance(4);
  const nativePosition = window.scrollY;
  changeMedia(FINE_POINTER_QUERY, false);
  assert.equal(session.active, false);
  assert.equal(frames.size, 0);
  assert.ok(!window.document.documentElement.classList.contains('lenis'));
  advance(40);
  assert.equal(window.scrollY, nativePosition);
  changeMedia(FINE_POINTER_QUERY, true);
  assert.equal(session.active, true);
  changeMedia(REDUCED_MOTION_QUERY, true);
  assert.equal(session.active, false);
  session.destroy(); session.destroy();
  assert.equal(frames.size, 0);
  assert.ok([...media.values()].every((value) => value.listeners.size === 0));
  changeMedia(REDUCED_MOTION_QUERY, false);
  assert.equal(session.active, false, 'Disposed media listeners recreated the scroll engine');
});
