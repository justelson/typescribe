export function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

export function formatSrtTime(ms) {
  const total = Math.max(0, Math.floor(ms));
  const hours = Math.floor(total / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

export function getSpeaker(project, speakerId) {
  return project.speakers.find((speaker) => speaker.id === speakerId)?.name || 'Speaker';
}

export function makeInqText(project) {
  return project.segments.map((segment) => `[${formatTime(segment.startMs)}] ${getSpeaker(project, segment.speakerId)}: ${segment.text}`).join('\n');
}

export function makeSrt(project) {
  return project.segments.map((segment, index) => [
    index + 1,
    `${formatSrtTime(segment.startMs)} --> ${formatSrtTime(segment.endMs)}`,
    `${getSpeaker(project, segment.speakerId)}: ${segment.text}`,
  ].join('\n')).join('\n\n');
}

export function getKaraLabel(project, speakerId) {
  const speaker = project.speakers.find((item) => item.id === speakerId);
  const name = speaker?.name?.trim();
  if (/^I$/i.test(name || '')) return 'I';
  if (/^P\d+$/i.test(name || '')) return name.toUpperCase();
  const index = Math.max(0, project.speakers.findIndex((item) => item.id === speakerId));
  return index === 0 ? 'I' : `P${index}`;
}

export function makeKaraText(project) {
  const groups = [];
  for (const segment of project.segments) {
    const label = getKaraLabel(project, segment.speakerId);
    const last = groups[groups.length - 1];
    if (last?.label === label && !segment.isDraftBlock) {
      last.segments.push(segment);
    } else {
      groups.push({ label, segments: [segment] });
    }
  }

  const merged = [];
  for (const group of groups) {
    const text = caraGroupText(group.segments);
    if (!text) continue;
    const last = merged[merged.length - 1];
    if (last?.label === group.label) last.text += ` ${text}`;
    else merged.push({ label: group.label, text });
  }
  return `${merged.map((entry) => `${entry.label}: ${entry.text}`).join('\n\n')}\n`;
}

function caraGroupText(segments) {
  const parts = [];
  const consumed = new Set();
  for (const segment of segments) {
    if (consumed.has(segment.id)) continue;
    if (Object.prototype.hasOwnProperty.call(segment, 'caraText')) {
      const coveredIds = Array.isArray(segment.caraTextSegmentIds) && segment.caraTextSegmentIds.length
        ? segment.caraTextSegmentIds
        : legacyCoveredCaraSegmentIds(segment, segments);
      parts.push(String(segment.caraText || '').trim());
      for (const id of coveredIds) consumed.add(id);
      continue;
    }
    parts.push(String(segment.text || '').trim());
    consumed.add(segment.id);
  }
  return parts.filter(Boolean).join(' ').trim();
}

function legacyCoveredCaraSegmentIds(owner, segments) {
  const override = normalizeText(owner.caraText);
  const ownerIndex = segments.findIndex((segment) => segment.id === owner.id);
  if (ownerIndex < 0) return [owner.id];
  const ids = [owner.id];
  for (const segment of segments.slice(ownerIndex + 1)) {
    const text = normalizeText(segment.text);
    if (!text) continue;
    const sample = text.slice(0, Math.min(48, text.length));
    if (sample.length >= 12 && override.includes(sample)) ids.push(segment.id);
    else break;
  }
  return ids;
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
