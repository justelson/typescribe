import { FAMILY_ORDER, FAMILY_PALETTES, getMetric } from "./config.js";

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function modelsInDisplayOrder(models) {
  return [...models].sort((a, b) => (
    a.provider.localeCompare(b.provider)
    || familyOrder(a) - familyOrder(b)
    || a.label.localeCompare(b.label)
  ));
}

export function chartScaleMax(models) {
  const maximum = Math.max(...models.map((model) => model.cost30MinutesUsd), 0.001);
  const magnitude = 10 ** Math.floor(Math.log10(maximum));
  const normalized = maximum / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

export function niceMetricMax(values, fallback = 30) {
  const maximum = Math.max(...values, fallback);
  return Math.ceil((maximum * 1.08) / 10) * 10;
}

function metricTickStep(range) {
  if (range <= 20) return 5;
  if (range <= 60) return 10;
  return 20;
}

export function metricAxisScale(values, { higherIsBetter, scaleMax }) {
  const maximum = scaleMax ?? niceMetricMax(values);
  const minimum = Math.min(...values);
  const proposedBreak = Math.floor((minimum - Number.EPSILON) / 10) * 10;
  const breakValue = proposedBreak >= maximum * 0.3 && proposedBreak < maximum ? proposedBreak : null;
  const mainStart = higherIsBetter ? 0 : breakValue === null ? 0 : 10;
  const mainEnd = higherIsBetter && breakValue !== null ? 90 : 100;
  const mainMinimum = breakValue ?? 0;
  const mainRange = Math.max(maximum - mainMinimum, 1);

  const position = (value) => {
    if (breakValue === null) return higherIsBetter
      ? clamp(100 - (value / maximum) * 100, 0, 100)
      : clamp((value / maximum) * 100, 0, 100);
    if (value >= breakValue) {
      const ratio = (value - breakValue) / mainRange;
      return higherIsBetter
        ? clamp(mainEnd - ratio * mainEnd, 0, mainEnd)
        : clamp(mainStart + ratio * (100 - mainStart), mainStart, 100);
    }
    return higherIsBetter
      ? clamp(96 + ((breakValue - value) / breakValue) * 4, 96, 100)
      : clamp((value / breakValue) * 4, 0, 4);
  };

  const step = metricTickStep(maximum - mainMinimum);
  const tickValues = [];
  for (let value = mainMinimum; value <= maximum; value += step) tickValues.push(value);
  if (tickValues.at(-1) !== maximum) tickValues.push(maximum);
  if (breakValue !== null) tickValues.push(0);
  const ticks = [...new Set(tickValues)]
    .sort((a, b) => higherIsBetter ? b - a : a - b)
    .map((value) => ({ value, label: Number.isInteger(value) ? String(value) : value.toFixed(1), position: position(value) }));

  return {
    maximum,
    breakValue,
    breakPosition: breakValue === null ? null : higherIsBetter ? 93 : 7,
    position,
    ticks,
  };
}

function numericPrimaryScore(model) {
  if (typeof model.score === "number" && Number.isFinite(model.score)) return model.score;
  if (model.score && typeof model.score.value === "number" && Number.isFinite(model.score.value)) return model.score.value;
  return null;
}

export function metricValue(model, key) {
  const direct = model.metrics?.[key];
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  if (key === "typeScribeScore") return numericPrimaryScore(model);
  if (key === "wer") {
    const accuracy = metricValue(model, "wordAccuracy");
    return accuracy === null ? null : Math.max(0, 100 - accuracy);
  }
  if (key === "englishWer") {
    const accuracy = metricValue(model, "englishAccuracy");
    return accuracy === null ? null : Math.max(0, 100 - accuracy);
  }
  if (key === "swahiliWer") {
    const accuracy = metricValue(model, "swahiliAccuracy");
    return accuracy === null ? null : Math.max(0, 100 - accuracy);
  }
  return null;
}

export function familyName(model) {
  return typeof model.family === "string" && model.family.trim() ? model.family.trim() : model.provider;
}

export function familyOrder(model) {
  if (typeof model.familyOrder === "number" && Number.isFinite(model.familyOrder)) return model.familyOrder;
  return FAMILY_ORDER[model.id] ?? 1;
}

export function familyVisual(model, models) {
  const family = familyName(model);
  const key = family.toLocaleLowerCase().replaceAll(/[^a-z0-9]/g, "");
  const palette = FAMILY_PALETTES[key] ?? ["#4c5d52", "#82978b", "#b6c5bc"];
  const siblings = models
    .filter((candidate) => familyName(candidate) === family)
    .sort((a, b) => familyOrder(a) - familyOrder(b) || a.label.localeCompare(b.label));
  const index = Math.max(0, siblings.findIndex((candidate) => candidate.id === model.id));
  return { family, color: palette[Math.min(index, palette.length - 1)] };
}

export function languagePairData(models) {
  return models
    .flatMap((model) => {
      const english = metricValue(model, "englishAccuracy");
      const swahili = metricValue(model, "swahiliAccuracy");
      if (english === null || swahili === null) return [];
      return [{ model, english, swahili, average: (english + swahili) / 2 }];
    })
    .sort((a, b) => b.average - a.average || b.swahili - a.swahili || a.model.label.localeCompare(b.model.label));
}

export function languageTrackData(models) {
  const pairs = languagePairData(models);
  const partial = models.flatMap((model) => {
    const english = metricValue(model, 'englishAccuracy');
    const swahili = metricValue(model, 'swahiliAccuracy');
    if ((english === null && swahili === null) || (english !== null && swahili !== null)) return [];
    return [{ model, english, swahili, average: null }];
  }).sort((a, b) => (b.english ?? b.swahili) - (a.english ?? a.swahili) || a.model.label.localeCompare(b.model.label));
  return [...pairs, ...partial];
}

export function pointData(models, metricName) {
  if (metricName === "languages") {
    return languagePairData(models).map((pair) => ({
      ...pair,
      x: pair.english,
      y: 100 - pair.swahili,
    }));
  }

  const metric = getMetric(metricName);
  const ready = models.map((model) => metricValue(model, metric.key)).filter((value) => value !== null);
  const scale = metricAxisScale(ready, metric);
  const priceMax = chartScaleMax(models);
  return models.flatMap((model) => {
    const value = metricValue(model, metric.key);
    if (value === null) return [];
    const y = clamp(scale.position(value), 3, 97);
    return [{
      model,
      value,
      x: clamp(100 - (model.cost30MinutesUsd / priceMax) * 100, 4, 96),
      y,
    }];
  });
}
