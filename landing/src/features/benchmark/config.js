import { benchmarkScope } from './benchmarkScope.js';

export const FAMILY_PALETTES = {
  assemblyai: ["#4f4b9f", "#928bd0", "#c0baf0"],
  deepgram: ["#bf3c2d", "#e77b64"],
  elevenlabs: ["#bd651f", "#ed9c55"],
  groq: ["#176d8e", "#65b9d0", "#a1dce8"],
  speechmatics: ["#246b55", "#67aa8f", "#a7d3bd"],
  fishaudio: ["#8c365b", "#c87796"],
};

export const FAMILY_ORDER = {
  "assemblyai-universal-2": 2,
  "assemblyai-universal-3-5-pro": 3.5,
  "groq-whisper-large-v3": 3,
  "groq-whisper-large-v3-turbo": 3.1,
  "speechmatics-standard-sw": 1,
  "speechmatics-enhanced-sw": 2,
};

export const METRICS = {
  typescribe: {
    key: "typeScribeScore",
    title: "TypeScribe score vs price",
    description: "Composite transcript quality after the approved pass-gate adjustment.",
    axis: "TYPESCRIBE SCORE ↑",
    higherIsBetter: true,
    format: (value) => value.toFixed(1),
  },
  wer: {
    key: "wer",
    title: "Word error rate vs price",
    description: "Substitutions, deletions, and insertions per reference word. Lower is better.",
    axis: "WER · LOWER IS BETTER ↑",
    higherIsBetter: false,
    format: (value) => `${value.toFixed(1)}%`,
  },
  gates: {
    key: "gateScore",
    title: "Pass gates vs price",
    description: "Share of the five approved quality gates passed by each model.",
    axis: "PASS-GATE SCORE ↑",
    higherIsBetter: true,
    format: (value) => `${value.toFixed(0)}%`,
  },
  quality: {
    key: "qualityScore",
    title: "Composite quality vs price",
    description: "Word accuracy, challenge performance, terms, numbers, and reliable blocks.",
    axis: "QUALITY SCORE ↑",
    higherIsBetter: true,
    format: (value) => value.toFixed(1),
  },
  languages: {
    title: "English vs Swahili-English accuracy",
    description: "Full-track accuracy for each available language. Connected points have both tracks; a single point does not create a combined rank.",
    axis: "SWAHILI-ENGLISH ACCURACY ↑",
    higherIsBetter: true,
    scaleMax: 100,
    format: (value) => value.toFixed(1),
  },
};

export function getMetric(metricName, scope = 'all') {
  const metric = METRICS[metricName] ?? METRICS.typescribe;
  if (scope === 'all') return metric;
  const { label } = benchmarkScope(scope);
  return {
    ...metric,
    title: metricName === 'languages' ? `${label} word accuracy` : `${label} · ${metric.title}`,
    description: metricName === 'languages'
      ? `Word accuracy on the complete 30-minute ${label} track. Eligibility probes are excluded.`
      : `${metric.description} ${label} track only.`,
  };
}
