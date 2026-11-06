import { formatTime, getSpeaker, makeInqText, makeKaraText, makeSrt } from '../../../../src/utils/transcript.js';
import { demoExcerpt } from './demoExcerpt.js';

export { formatTime, getSpeaker };

export const sampleRanges = [
  { id: 'all', label: 'Whole excerpt', startMs: 11040, endMs: 32580 },
  { id: 'marked', label: 'Marked answer', startMs: 15400, endMs: 32580 },
];
export const sampleFormats = [
  { id: 'cara', label: 'Cara Markdown', extension: 'cara.md', render: makeKaraText },
  { id: 'txt', label: 'Timed text', extension: 'txt', render: makeInqText },
  { id: 'srt', label: 'SRT subtitles', extension: 'srt', render: makeSrt },
];

export function sampleProject(rangeId = 'all') {
  const range = sampleRanges.find((item) => item.id === rangeId);
  if (!range) throw new RangeError(`Unknown sample range: ${rangeId}`);
  return { ...demoExcerpt, segments: demoExcerpt.segments.filter((segment) => segment.startMs >= range.startMs && segment.endMs <= range.endMs) };
}

export function sampleExport(formatId = 'cara', rangeId = 'all') {
  const format = sampleFormats.find((item) => item.id === formatId);
  if (!format) throw new RangeError(`Unknown sample format: ${formatId}`);
  return {
    content: format.render(sampleProject(rangeId)),
    filename: `typescribe-public-demo-${rangeId}.${format.extension}`,
  };
}
