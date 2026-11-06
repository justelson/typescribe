function hasBackground(color) {
  return Boolean(color) && color !== 'transparent'
    && !/^(?:rgba|hsla)\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(color)
    && !/\/\s*0(?:\.0+)?%?\s*\)$/.test(color);
}

// Follow the last section's actual painted surface, not a route-specific palette.
// Transparent page/section wrappers fall through to their nearest painted parent.
export function footerJoinBackground(footer, computedStyle = (element) => window.getComputedStyle(element)) {
  const preceding = footer?.previousElementSibling;
  const edge = preceding?.matches('main') ? preceding.lastElementChild || preceding : preceding;
  for (let element = edge; element; element = element.parentElement) {
    const color = computedStyle(element).backgroundColor;
    if (hasBackground(color)) return color;
  }
  return 'transparent';
}
