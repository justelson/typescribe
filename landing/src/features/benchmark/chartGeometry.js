const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const overlapsRect = (a, b, gap = 0) => a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
const nearest = (point, box) => ({ x: clamp(point.x, box.x, box.x + box.width), y: clamp(point.y, box.y, box.y + box.height) });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function labelCandidates(item, bounds, padding) {
  const candidates = new Map();
  const maxX = bounds.width - padding - item.width;
  const maxY = bounds.height - padding - item.height;
  if (maxX < padding || maxY < padding) return [];
  const add = (x, y) => {
    const box = { x: clamp(x, padding, maxX), y: clamp(y, padding, maxY), width: item.width, height: item.height };
    const edge = nearest(item, box);
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const cost = distance(item, edge) + distance(item, center) * .12;
    candidates.set(`${box.x.toFixed(2)}:${box.y.toFixed(2)}`, { ...box, cost });
  };
  for (let lane = 0; lane < 10; lane += 1) {
    const offset = lane * (item.height + 8);
    for (const x of [item.x - item.width / 2, item.x - 12, item.x - item.width + 12]) {
      add(x, item.y - item.height - 16 - offset);
      add(x, item.y + 16 + offset);
    }
    for (const y of [item.y - item.height / 2 - offset, item.y - item.height / 2 + offset]) {
      add(item.x + 16, y);
      add(item.x - item.width - 16, y);
    }
  }
  // Bounded fallback for tightly clustered scores/gates. It still uses full
  // measured text and leaves every data point at its original coordinates.
  for (let y = padding; y <= maxY; y += 20) for (let x = padding; x <= maxX; x += 28) add(x, y);
  return [...candidates.values()].sort((a, b) => a.cost - b.cost || a.y - b.y || a.x - b.x);
}

export function layoutChartLabels(items, bounds, { padding = 8, gap = 6 } = {}) {
  if (bounds.width <= 0 || bounds.height <= 0) return [];
  const markers = items.map((item) => ({ x: item.x - 11, y: item.y - 11, width: 22, height: 22 }));
  const candidates = new Map(items.map((item) => [item.id, labelCandidates(item, bounds, padding).filter((box) => !markers.some((marker) => overlapsRect(box, marker, 2)))]));
  const stable = (a, b) => a.id.localeCompare(b.id);
  const density = (item) => items.filter((other) => distance(item, other) < Math.max(item.width, other.width)).length;
  const orders = [
    [...items].sort((a, b) => density(b) - density(a) || b.width - a.width || stable(a, b)),
    [...items].sort((a, b) => candidates.get(a.id).length - candidates.get(b.id).length || b.width - a.width || stable(a, b)),
    [...items].sort((a, b) => a.x - b.x || a.y - b.y || stable(a, b)),
  ];
  const layouts = orders.map((order) => {
    const placed = [];
    let cost = 0;
    const result = new Map();
    for (const item of order) {
      const box = candidates.get(item.id).find((candidate) => !placed.some((other) => overlapsRect(candidate, other, gap)));
      if (!box) { result.set(item.id, { id: item.id, visible: false }); continue; }
      const target = nearest(item, box);
      const label = { id: item.id, ...box, visible: true, anchor: { x: item.x, y: item.y }, target };
      result.set(item.id, label);
      placed.push(box);
      cost += box.cost;
    }
    return { result, count: placed.length, cost };
  }).sort((a, b) => b.count - a.count || a.cost - b.cost);
  return items.map((item) => layouts[0].result.get(item.id));
}

export function intersectRects(a, b) {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return { x, y, width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x), height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y) };
}

export function placeChartCard({ anchor, boundary, viewport, size, obstacles = [], gap = 16, padding = 10 }) {
  const safeViewport = { x: viewport.x + padding, y: viewport.y + padding, width: Math.max(0, viewport.width - padding * 2), height: Math.max(0, viewport.height - padding * 2) };
  const visibleChart = intersectRects(boundary, safeViewport);
  const bounds = {
    x: visibleChart.width >= size.width ? visibleChart.x : safeViewport.x,
    y: visibleChart.height >= size.height ? visibleChart.y : safeViewport.y,
    width: visibleChart.width >= size.width ? visibleChart.width : safeViewport.width,
    height: visibleChart.height >= size.height ? visibleChart.height : safeViewport.height,
  };
  const candidatesWithin = (region) => {
    const width = Math.min(size.width, region.width);
    const height = Math.min(size.height, region.height);
    const center = { x: anchor.x + anchor.width / 2, y: anchor.y + anchor.height / 2 };
    return [
      { placement: 'right', x: anchor.x + anchor.width + gap, y: center.y - height / 2 },
      { placement: 'left', x: anchor.x - width - gap, y: center.y - height / 2 },
      { placement: 'top', x: center.x - width / 2, y: anchor.y - height - gap },
      { placement: 'bottom', x: center.x - width / 2, y: anchor.y + anchor.height + gap },
    ].map((candidate, index) => {
      const box = { x: clamp(candidate.x, region.x, region.x + region.width - width), y: clamp(candidate.y, region.y, region.y + region.height - height), width, height };
      const collision = obstacles.reduce((sum, obstacle) => {
        const intersection = intersectRects(box, obstacle);
        return sum + intersection.width * intersection.height * (obstacle.weight || 1);
      }, 0);
      const coversAnchor = overlapsRect(box, anchor);
      const proximity = overlapsRect(box, anchor, 6) ? 10000 : 0;
      return { ...box, placement: candidate.placement, coversAnchor, cost: (coversAnchor ? 1e9 : proximity) + collision * 3 + distance(candidate, box) + index * .1, maxWidth: region.width, maxHeight: region.height };
    });
  };
  let candidates = candidatesWithin(bounds);
  // A partially visible chart can be too short to fit on either side of its
  // mark. Viewport containment takes priority over covering that active mark.
  if (candidates.every((candidate) => candidate.coversAnchor)) candidates = [...candidates, ...candidatesWithin(safeViewport)];
  candidates.sort((a, b) => a.cost - b.cost);
  return candidates[0];
}
