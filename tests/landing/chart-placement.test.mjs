import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import { benchmarkView } from '../../landing/src/features/benchmark/benchmarkScope.js';
import { layoutChartLabels, overlapsRect, placeChartCard } from '../../landing/src/features/benchmark/chartGeometry.js';
import { modelsInDisplayOrder, pointData } from '../../landing/src/features/benchmark/chartModel.js';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const raw = JSON.parse(await readFile(path.join(project, 'landing/benchmark/benchmark-data.json'), 'utf8'));
const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const rect = (left, top, width, height) => ({ x: left, y: top, left, top, width, height, right: left + width, bottom: top + height, toJSON() { return {}; } });

test('label packing preserves points across all metrics/scopes and avoids other markers', () => {
  for (const scope of ['all', 'english', 'sw-en']) for (const metric of ['typescribe', 'wer', 'gates', 'quality']) {
    const points = pointData(modelsInDisplayOrder(benchmarkView(raw, scope).models), metric);
    for (const width of [520, 600, 800, 1100]) {
      const items = points.map((point) => ({ id: point.model.id, x: point.x / 100 * width, y: point.y / 100 * 350, width: Math.min(235, point.model.label.length * 6.8), height: 28 }));
      const before = JSON.stringify(items);
      const labels = layoutChartLabels(items, { width, height: 350 });
      assert.equal(labels.filter((label) => label.visible).length, items.length, `${scope}/${metric}/${width}`);
      assert.equal(JSON.stringify(items), before, 'Placement must not move score coordinates');
      for (let i = 0; i < labels.length; i += 1) {
        assert.ok(labels[i].x >= 8 && labels[i].y >= 8 && labels[i].x + labels[i].width <= width - 8);
        for (let j = i + 1; j < labels.length; j += 1) assert.equal(overlapsRect(labels[i], labels[j], 6), false);
        for (const point of items) assert.equal(overlapsRect(labels[i], { x: point.x - 11, y: point.y - 11, width: 22, height: 22 }, 2), false);
      }
    }
  }
});

test('card geometry gives active-mark safety priority over label crowding and tiny gaps', () => {
  const input = { anchor: { x: 141, y: 413, width: 18, height: 18 }, boundary: { x: 12, y: 286, width: 296, height: 482 }, viewport: { x: 0, y: 0, width: 320, height: 600 }, size: { width: 276, height: 156 }, obstacles: [{ x: 12, y: 447, width: 276, height: 140 }] };
  const result = placeChartCard(input);
  assert.equal(overlapsRect(result, input.anchor), false);
  const crowded = placeChartCard({ ...input, boundary: { x: 12, y: 320, width: 296, height: 250 } });
  assert.equal(overlapsRect(crowded, input.anchor), false, 'Use viewport space if visible chart cannot fit above or below');
  for (const point of [{ x: 12, y: 12 }, { x: 290, y: 12 }, { x: 12, y: 560 }, { x: 290, y: 560 }]) {
    const card = placeChartCard({ ...input, boundary: input.viewport, anchor: { ...point, width: 18, height: 18 } });
    assert.ok(card.x >= 10 && card.x + card.width <= 310 && card.y >= 10 && card.y + card.height <= 590);
    assert.equal(overlapsRect(card, { ...point, width: 18, height: 18 }), false);
  }
});

async function chartFixture(t) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://127.0.0.1:8780/benchmark/', pretendToBeVisual: true });
  const { window } = dom;
  const geometry = { viewportWidth: 1000, viewportHeight: 700, left: 90, top: 130, width: 800, height: 350, scrollLeft: 0 };
  Object.defineProperties(window, { innerWidth: { get: () => geometry.viewportWidth }, innerHeight: { get: () => geometry.viewportHeight } });
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  const observers = new Set();
  class ResizeObserverFixture {
    constructor(callback) { this.callback = callback; observers.add(this); }
    observe() {}
    disconnect() { observers.delete(this); }
  }
  window.ResizeObserver = ResizeObserverFixture;
  const globals = { window, document: window.document, navigator: window.navigator, HTMLElement: window.HTMLElement, Element: window.Element, ResizeObserver: ResizeObserverFixture, requestAnimationFrame: window.requestAnimationFrame.bind(window), cancelAnimationFrame: window.cancelAnimationFrame.bind(window), IS_REACT_ACT_ENVIRONMENT: true };
  const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const labelSize = (element) => {
    // Measured-size fixtures reflect the screenshot's long model names. JSDOM
    // cannot paint fonts; these exercise real layout hooks/DOM bindings, not QA.
    const text = element.querySelector('strong')?.textContent || '';
    return { width: Math.min(235, Math.max(90, text.length * 6.8)), height: 28 };
  };
  const pointRect = (element) => {
    const x = parseFloat(element.style.left) / 100 * geometry.width;
    const y = parseFloat(element.style.top) / 100 * geometry.height;
    return rect(geometry.left - geometry.scrollLeft + x - 9, geometry.top + y - 9, 18, 18);
  };
  const originalRect = window.HTMLElement.prototype.getBoundingClientRect;
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.matches('.score-points')) return rect(geometry.left - geometry.scrollLeft, geometry.top, geometry.width, geometry.height);
    if (this.matches('.score-plot')) return rect(geometry.left - geometry.scrollLeft - 46, geometry.top - 34, geometry.width + 104, geometry.height + 66);
    if (this.matches('.score-map-view, .language-pair-view, .score-chart')) return rect(12, geometry.top - 54, geometry.viewportWidth - 24, geometry.height + 132);
    if (this.matches('.score-point')) return pointRect(this);
    if (this.matches('.language-pair-track')) {
      const row = this.closest('.language-pair-row');
      const index = [...window.document.querySelectorAll('.language-pair-row')].indexOf(row);
      return rect(geometry.left - geometry.scrollLeft + 260, geometry.top + index * 60, geometry.width - 260, 60);
    }
    if (this.matches('.language-pair-point')) {
      const track = this.closest('.language-pair-track').getBoundingClientRect();
      return rect(track.left + parseFloat(this.style.left) / 100 * track.width - 9, track.top + 30 - 9, 18, 18);
    }
    if (this.matches('.language-pair-point > span')) {
      const anchor = this.parentElement.getBoundingClientRect();
      const left = this.style.left.endsWith('px') ? anchor.left + parseFloat(this.style.left) : anchor.left + 9 - 30;
      return rect(left, this.parentElement.classList.contains('is-swahili') ? anchor.top - 7 - 11 : anchor.bottom + 7, 60, 11);
    }
    if (this.matches('.score-point-label')) {
      const anchor = pointRect(this.parentElement);
      const size = labelSize(this);
      if (this.style.left.endsWith('px')) return rect(anchor.left + parseFloat(this.style.left), anchor.top + parseFloat(this.style.top), size.width, size.height);
      const above = this.parentElement.classList.contains('label-above');
      const edgeRight = this.parentElement.classList.contains('label-right');
      const tail = this.parentElement.classList.contains('label-tail');
      return rect(edgeRight ? anchor.left : anchor.left + 9 - size.width * (tail ? .2 : .5), above ? anchor.top - 8 - size.height : anchor.bottom + 8, size.width, size.height);
    }
    if (this.matches('.chart-floating-card')) {
      const width = Math.min(parseFloat(this.style.width) || 290, parseFloat(this.style.maxWidth) || 290);
      const height = this.textContent.includes('95% CI') ? 156 : 112;
      if (this.style.position === 'fixed' || this.style.left.endsWith('px')) return rect(parseFloat(this.style.left) || 0, parseFloat(this.style.top) || 0, width, height);
      const left = geometry.left - geometry.scrollLeft + parseFloat(this.style.left) / 100 * geometry.width;
      const top = geometry.top + parseFloat(this.style.top) / 100 * geometry.height;
      return rect(left + (this.classList.contains('card-point-left') ? -width - 24 : 24), top - height / 2, width, height);
    }
    return originalRect.call(this);
  };
  Object.defineProperties(window.HTMLElement.prototype, {
    offsetWidth: { configurable: true, get() { return this.matches('.score-point-label') ? labelSize(this).width : this.getBoundingClientRect().width; } },
    offsetHeight: { configurable: true, get() { return this.matches('.score-point-label') ? labelSize(this).height : this.getBoundingClientRect().height; } },
    clientWidth: { configurable: true, get() { return this.getBoundingClientRect().width; } },
    clientHeight: { configurable: true, get() { return this.getBoundingClientRect().height; } },
  });
  let server;
  let root;
  t.after(async () => {
    if (root) await act(async () => root.unmount());
    await server?.close();
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    window.close();
    assert.equal(observers.size, 0, 'Geometry observers must be disconnected');
  });
  server = await createServer({ configFile: path.join(project, 'vite.landing.config.js'), server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] } });
  const { BenchmarkChart } = await server.ssrLoadModule('/src/features/benchmark/BenchmarkChart.jsx');
  root = createRoot(window.document.getElementById('root'));
  const render = async (metricName = 'typescribe', expanded = false, scope = 'english', override) => {
    await act(async () => root.render(createElement(BenchmarkChart, { data: override || benchmarkView(raw, scope), scope, metricName, expanded, onExpandedChange() {} })));
  };
  const resize = async (patch) => {
    Object.assign(geometry, patch);
    await act(async () => {
      observers.forEach((observer) => observer.callback([]));
      window.dispatchEvent(new window.Event('resize'));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
  };
  return { window, geometry, render, resize };
}

test('real English charts place full model labels without collisions or clipping', async (t) => {
  const { window, geometry, render, resize } = await chartFixture(t);
  for (const metric of ['typescribe', 'wer', 'gates', 'quality']) {
    await render(metric);
    for (const width of [800, 600, 1100]) {
      await resize({ width });
      const labels = [...window.document.querySelectorAll('.score-point-label')];
      assert.equal(labels.length, 10);
      for (let i = 0; i < labels.length; i += 1) for (let j = i + 1; j < labels.length; j += 1) {
        assert.equal(overlaps(labels[i].getBoundingClientRect(), labels[j].getBoundingClientRect()), false, `Overlapping model labels: ${labels[i].textContent} / ${labels[j].textContent}`);
      }
      for (const label of labels) {
        assert.notEqual(label.style.visibility, 'hidden', 'All labels must fit these real chart sizes');
        const box = label.getBoundingClientRect();
        assert.ok(box.left >= geometry.left && box.right <= geometry.left + geometry.width, `Clipped model label: ${label.textContent}`);
        assert.ok(box.top >= geometry.top && box.bottom <= geometry.top + geometry.height, `Clipped model label: ${label.textContent}`);
      }
    }
  }
});

test('hover cards flip and shift around actual marks within viewport through resize and scroll', async (t) => {
  const { window, geometry, render, resize } = await chartFixture(t);
  await render();
  await resize({ viewportWidth: 320, viewportHeight: 500, width: 600 });
  const point = [...window.document.querySelectorAll('.score-point')].find((node) => node.getAttribute('aria-label').startsWith('Fish Audio Transcribe-1 Pro:'));
  await act(async () => point.focus());
  const assertCardVisible = () => {
    const card = window.document.querySelector('.chart-floating-card');
    assert.ok(card);
    const box = card.getBoundingClientRect();
    assert.ok(box.left >= 8 && box.right <= geometry.viewportWidth - 8, `Hover card outside viewport horizontally: ${JSON.stringify(box)}`);
    assert.ok(box.top >= 8 && box.bottom <= geometry.viewportHeight - 8, `Hover card outside viewport vertically: ${JSON.stringify(box)}`);
    assert.equal(overlaps(box, point.getBoundingClientRect()), false, 'Card must not cover its hovered mark');
  };
  assertCardVisible();
  await resize({ top: -50 });
  assertCardVisible();
  await resize({ top: 340, viewportHeight: 600 });
  assertCardVisible();
  await resize({ viewportWidth: 980, viewportHeight: 760, top: 150, scrollLeft: 30 });
  await act(async () => window.dispatchEvent(new window.Event('scroll')));
  assertCardVisible();
  const beforeShift = window.document.querySelector('.chart-floating-card').style.left;
  await act(async () => {
    point.style.left = '45%';
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
  assert.notEqual(window.document.querySelector('.chart-floating-card').style.left, beforeShift, 'Anchor style movement must be observed without a resize');
  assertCardVisible();
  await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  assert.equal(window.document.querySelector('.chart-floating-card'), null, 'Escape should dismiss model details');
});

test('language cards anchor to the actual EN or SW mark, including the same model', async (t) => {
  const { window, render, resize } = await chartFixture(t);
  await resize({ viewportWidth: 1400, viewportHeight: 1000, width: 800, height: 620 });
  await render('languages', false, 'all');
  const row = [...window.document.querySelectorAll('.language-pair-row')].find((node) => node.textContent.includes('ElevenLabs Scribe v2'));
  const english = row.querySelector('.is-english');
  const swahili = row.querySelector('.is-swahili');
  await act(async () => english.focus());
  const first = window.document.querySelector('.chart-floating-card').getBoundingClientRect();
  assert.equal(english.getAttribute('aria-describedby'), window.document.querySelector('.chart-floating-card').id);
  await act(async () => swahili.focus());
  const second = window.document.querySelector('.chart-floating-card').getBoundingClientRect();
  assert.notEqual(first.left, second.left, 'Same-model language marks must not reuse a hardcoded anchor');
  assert.equal(overlaps(second, swahili.getBoundingClientRect()), false);
  await resize({ scrollLeft: 60, viewportWidth: 500 });
  const card = window.document.querySelector('.chart-floating-card').getBoundingClientRect();
  assert.ok(card.left >= 8 && card.right <= 492);
});

test('hovered labels and hoverable cards retain details across the gap, then dismiss cleanly', async (t) => {
  const { window, render } = await chartFixture(t);
  await render();
  const point = [...window.document.querySelectorAll('.score-point')].find((node) => node.getAttribute('aria-label').startsWith('Fish Audio Transcribe-1 Pro:'));
  const label = point.querySelector('.score-point-label');
  await act(async () => label.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true, relatedTarget: window.document.body })));
  const popup = window.document.querySelector('.chart-floating-card');
  assert.ok(popup);
  assert.equal(overlaps(popup.getBoundingClientRect(), label.getBoundingClientRect()), false, 'Name hover should anchor outside that name');
  await act(async () => {
    label.dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true, relatedTarget: window.document.body }));
    popup.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true, relatedTarget: window.document.body }));
    await new Promise((resolve) => setTimeout(resolve, 210));
  });
  assert.equal(window.document.querySelector('.chart-floating-card'), popup, 'Pointer movement into card must not close it');
  await act(async () => {
    popup.dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true, relatedTarget: window.document.body }));
    await new Promise((resolve) => setTimeout(resolve, 210));
  });
  assert.equal(window.document.querySelector('.chart-floating-card'), null);
});

test('language values stay inside their own tracks at real zero and perfect accuracy', async (t) => {
  const { window, render } = await chartFixture(t);
  const edge = structuredClone(benchmarkView(raw, 'english'));
  edge.models[0].metrics.englishAccuracy = 0;
  edge.models[1].metrics.englishAccuracy = 100;
  await render('languages', false, 'english', edge);
  for (const point of window.document.querySelectorAll('.language-pair-point')) {
    const label = point.querySelector('span');
    const track = point.closest('.language-pair-track').getBoundingClientRect();
    const box = label.getBoundingClientRect();
    assert.notEqual(label.style.visibility, 'hidden');
    assert.ok(box.left >= track.left && box.right <= track.right);
    assert.ok(box.top >= track.top && box.bottom <= track.bottom, 'Value must not enter a neighbouring row');
  }
});
