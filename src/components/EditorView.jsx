import { ArrowLeft, Clipboard, Download, Redo2, Search, Settings, Undo2, Waves, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { downloadText, formatSrtTime, formatTime, getKaraLabel, getSpeaker, makeInqText, makeKaraText, makeSrt } from '../utils/transcript.js';
import { InspectorPane } from './InspectorPane.jsx';
import { PlayerPane } from './PlayerPane.jsx';
import { TextModal } from './TextModal.jsx';
import { TranscriptTable } from './TranscriptTable.jsx';

const PANEL_LIMITS = {
  player: { min: 190, max: 420 },
  inspector: { min: 220, max: 520 },
};

const EDITOR_STORAGE_KEY = 'deepgram-scribe:editor-ui:v1';
const MARKER_COLORS = ['#9cff00', '#ffd166', '#5ad7ff', '#ff7ab6', '#c59cff', '#ff8f4d'];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function findLastIndex(items, predicate) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index], index)) return index;
  }
  return -1;
}

function isEditorTyping() {
  const target = document.activeElement;
  return target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function readEditorMemory(projectId) {
  try {
    const memory = JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY) || '{}');
    return memory?.[projectId] || {};
  } catch {
    return {};
  }
}

function writeEditorMemory(projectId, patch) {
  try {
    const memory = JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY) || '{}');
    localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify({
      ...memory,
      [projectId]: { ...(memory?.[projectId] || {}), ...patch },
    }));
  } catch {
    // Local persistence is best-effort.
  }
}

export function EditorView({ project, updateProject, settings, setSettings, canUndo, canRedo, onUndo, onRedo, onBack }) {
  const audioRef = useRef(null);
  const cursorMarkerRef = useRef(null);
  const initialUi = useMemo(() => readEditorMemory(project.id), [project.id]);
  const [activeSegmentId, setActiveSegmentId] = useState(initialUi.activeSegmentId || project.segments[0]?.id || null);
  const [currentTime, setCurrentTime] = useState(Number(initialUi.currentTime || 0));
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [viewMode, setViewMode] = useState(initialUi.viewMode || 'rows');
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState('');
  const [playerCollapsed, setPlayerCollapsed] = useState(Boolean(initialUi.playerCollapsed));
  const [inspectorCollapsed, setInspectorCollapsed] = useState(Boolean(initialUi.inspectorCollapsed));
  const [playerWidth, setPlayerWidth] = useState(initialUi.playerWidth || 256);
  const [inspectorWidth, setInspectorWidth] = useState(initialUi.inspectorWidth || 280);
  const [speakerModal, setSpeakerModal] = useState(null);
  const [speakerMergeModal, setSpeakerMergeModal] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [positionLocked, setPositionLocked] = useState(initialUi.positionLocked ?? true);
  const [shortcutHud, setShortcutHud] = useState(null);
  const activeSegment = project.segments.find((segment) => segment.id === activeSegmentId) || project.segments[0];
  const inqText = useMemo(() => makeInqText(project), [project]);
  const karaText = useMemo(() => makeKaraText(project), [project]);
  const srtText = useMemo(() => makeSrt(project), [project]);

  function flashShortcut(label, detail = '') {
    const id = Date.now();
    setShortcutHud({ id, label, detail });
    window.clearTimeout(flashShortcut.timeoutId);
    flashShortcut.timeoutId = window.setTimeout(() => {
      setShortcutHud((value) => value?.id === id ? null : value);
    }, 900);
  }

  useEffect(() => {
    const memory = readEditorMemory(project.id);
    setActiveSegmentId(memory.activeSegmentId || project.segments[0]?.id || null);
    setCurrentTime(Number(memory.currentTime || 0));
    setDurationSeconds(0);
    setIsPlaying(false);
    setAutoSync(true);
    setViewMode(memory.viewMode || 'rows');
    setPlayerCollapsed(Boolean(memory.playerCollapsed));
    setInspectorCollapsed(Boolean(memory.inspectorCollapsed));
    setPlayerWidth(memory.playerWidth || 256);
    setInspectorWidth(memory.inspectorWidth || 280);
    setPositionLocked(memory.positionLocked ?? true);
  }, [project.id]);

  useEffect(() => {
    writeEditorMemory(project.id, {
      activeSegmentId,
      currentTime,
      viewMode,
      playerCollapsed,
      inspectorCollapsed,
      playerWidth,
      inspectorWidth,
      positionLocked,
    });
  }, [project.id, activeSegmentId, currentTime, viewMode, playerCollapsed, inspectorCollapsed, playerWidth, inspectorWidth, positionLocked]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    let frame = 0;
    function tick() {
      const audio = audioRef.current;
      if (audio) syncPlaybackTime(audio.currentTime);
      frame = window.requestAnimationFrame(tick);
    }
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [isPlaying, project.segments]);

  useEffect(() => {
    function handleShortcut(event) {
      const target = event.target;
      const isTyping = target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      const mod = event.ctrlKey || event.metaKey;

      if (mod && !event.shiftKey && event.key.toLowerCase() === 'z' && !isTyping) {
        event.preventDefault();
        flashShortcut('Ctrl Z', 'Undo');
        onUndo?.();
        return;
      }
      if ((mod && event.key.toLowerCase() === 'y' && !isTyping) || (mod && event.shiftKey && event.key.toLowerCase() === 'z' && !isTyping)) {
        event.preventDefault();
        flashShortcut('Redo', 'Project change');
        onRedo?.();
        return;
      }
      if (mod && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        flashShortcut('Ctrl M', 'Marker');
        addMarker();
        return;
      }
      if (mod && event.key === '1') {
        event.preventDefault();
        flashShortcut('Ctrl 1', 'Rows');
        setTranscriptView('rows');
        return;
      }
      if (mod && event.key === '2') {
        event.preventDefault();
        flashShortcut('Ctrl 2', 'Cara');
        setTranscriptView('kara');
        return;
      }
      if (mod && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        flashShortcut('Ctrl F', 'Find');
        setFindOpen(true);
        return;
      }
      if (mod && event.key === ',') {
        event.preventDefault();
        flashShortcut('Ctrl ,', 'Settings');
        setSettingsOpen(true);
        return;
      }
      if (mod && event.shiftKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        flashShortcut('Ctrl ⇧ ←', 'Previous row');
        previousSegment();
        return;
      }
      if (mod && event.shiftKey && event.key === 'ArrowRight') {
        event.preventDefault();
        flashShortcut('Ctrl ⇧ →', 'Next row');
        nextSegment();
        return;
      }
      if (mod && event.key === 'ArrowLeft') {
        event.preventDefault();
        flashShortcut('Ctrl ←', 'Back 1s');
        seekBy(-1);
        return;
      }
      if (mod && event.key === 'ArrowRight') {
        event.preventDefault();
        flashShortcut('Ctrl →', 'Forward 1s');
        seekBy(1);
        return;
      }
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        flashShortcut('Alt ←', 'Back 2s');
        seekBy(-2);
        return;
      }
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        flashShortcut('Alt →', 'Forward 2s');
        seekBy(2);
        return;
      }
      if (event.code === 'Space' && mod) {
        event.preventDefault();
        flashShortcut('Ctrl Space', 'Play / pause');
        togglePlay();
        return;
      }
      if (event.code === 'Space' && !isTyping) {
        event.preventDefault();
        flashShortcut('Space', 'Play / pause');
        togglePlay();
      }
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  });

  useEffect(() => {
    const desktopApi = typeof window !== 'undefined' ? window.deepgramScribeDesktop : null;
    const unsubscribe = desktopApi?.onCommand?.((command) => {
      if (command === 'find') setFindOpen(true);
      if (command === 'export') setExportOpen(true);
      if (command === 'add-marker') addMarker();
      if (command === 'toggle-play' && !isEditorTyping()) void togglePlay();
      if (command === 'rows-view') setTranscriptView('rows');
      if (command === 'cara-view') setTranscriptView('kara');
    });
    return () => unsubscribe?.();
  });

  function findSegmentAtTime(timeSeconds) {
    const timeMs = timeSeconds * 1000;
    return project.segments.find((segment) => timeMs >= segment.startMs && timeMs <= segment.endMs) || null;
  }

  function syncPlaybackTime(timeSeconds) {
    setCurrentTime(timeSeconds);
    const current = findSegmentAtTime(timeSeconds);
    if (current) setActiveSegmentId((previousId) => previousId === current.id ? previousId : current.id);
  }

  function updateSegment(segmentId, patch) {
    updateProject({
      ...project,
      segments: project.segments.map((segment) => segment.id === segmentId ? { ...segment, ...patch } : segment),
      updatedAt: 'Just now',
    });
  }

  function updateSegments(patches) {
    const patchMap = new Map(patches.map((item) => [item.id, item.patch]));
    updateProject({
      ...project,
      segments: project.segments.map((segment) => patchMap.has(segment.id) ? { ...segment, ...patchMap.get(segment.id) } : segment),
      updatedAt: 'Just now',
    });
  }

  function deleteSegment(segmentId) {
    deleteSegments([segmentId]);
  }

  function deleteSegments(segmentIds) {
    const ids = new Set(segmentIds);
    if (project.segments.length <= ids.size) {
      const firstId = project.segments[0]?.id;
      if (firstId) updateSegment(firstId, { text: '' });
      return;
    }
    const firstDeletedIndex = project.segments.findIndex((segment) => ids.has(segment.id));
    const nextSegments = project.segments.filter((segment) => !ids.has(segment.id));
    const nextActive = nextSegments[Math.min(Math.max(0, firstDeletedIndex), nextSegments.length - 1)] || nextSegments[0];
    updateProject({
      ...project,
      segments: nextSegments,
      updatedAt: 'Just now',
    });
    if (ids.has(activeSegmentId) && nextActive) setActiveSegmentId(nextActive.id);
  }

  async function exportAudioBlock({ startMs, endMs, label }) {
    try {
      const response = await fetch('/api/export-audio-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaName: project.mediaName,
          startMs,
          endMs,
          title: `${project.title}-${label || 'block'}`,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Audio export failed.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.title}-${label || 'block'}.mp3`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setTranscribeError(error instanceof Error ? error.message : 'Audio export failed.');
    }
  }

  function deleteSpeakerSegments(speakerId) {
    const nextSegments = project.segments.filter((segment) => segment.speakerId !== speakerId);
    if (!nextSegments.length) return;
    updateProject({
      ...project,
      segments: nextSegments,
      updatedAt: 'Just now',
    });
    if (!nextSegments.some((segment) => segment.id === activeSegmentId)) setActiveSegmentId(nextSegments[0]?.id || null);
  }

  function openRenameSpeaker(speakerId) {
    const speaker = project.speakers.find((item) => item.id === speakerId);
    if (!speaker) return;
    setSpeakerModal({ mode: 'rename', speakerId, segmentId: null, initialValue: speaker.name });
  }

  function openAddSpeaker(segmentId) {
    setSpeakerModal({ mode: 'add', speakerId: null, segmentId, initialValue: '' });
  }

  function saveSpeakerModal(name) {
    if (!speakerModal) return;
    if (speakerModal.mode === 'rename') {
      updateProject({
        ...project,
        speakers: project.speakers.map((speaker) => speaker.id === speakerModal.speakerId ? { ...speaker, name } : speaker),
        updatedAt: 'Just now',
      });
    }
    if (speakerModal.mode === 'add') {
      const speaker = { id: `speaker_${Date.now()}`, name };
      updateProject({
        ...project,
        speakers: [...project.speakers, speaker],
        segments: project.segments.map((segment) => segment.id === speakerModal.segmentId ? { ...segment, speakerId: speaker.id } : segment),
        updatedAt: 'Just now',
      });
    }
    setSpeakerModal(null);
  }

  function openMergeSpeaker(sourceSpeakerId) {
    const source = project.speakers.find((speaker) => speaker.id === sourceSpeakerId);
    if (!source) return;
    const firstTarget = project.speakers.find((speaker) => speaker.id !== sourceSpeakerId);
    setSpeakerMergeModal({ sourceSpeakerId, targetSpeakerId: firstTarget?.id || '' });
  }

  function confirmMergeSpeaker() {
    if (!speakerMergeModal?.sourceSpeakerId || !speakerMergeModal?.targetSpeakerId) return;
    if (speakerMergeModal.sourceSpeakerId === speakerMergeModal.targetSpeakerId) return;
    updateProject({
      ...project,
      speakers: project.speakers.filter((speaker) => speaker.id !== speakerMergeModal.sourceSpeakerId),
      segments: project.segments.map((segment) => segment.speakerId === speakerMergeModal.sourceSpeakerId
        ? { ...segment, speakerId: speakerMergeModal.targetSpeakerId }
        : segment),
      updatedAt: 'Just now',
    });
    setSpeakerMergeModal(null);
  }

  function handleLoadedMetadata(event) {
    const audio = event.currentTarget;
    setDurationSeconds(Number.isFinite(audio.duration) ? audio.duration : 0);
    if (currentTime > 0 && Number.isFinite(audio.duration)) {
      audio.currentTime = clamp(currentTime, 0, audio.duration);
    }
    syncPlaybackTime(audio.currentTime);
  }

  function handleTimeChange(timeSeconds) {
    if (!isPlaying) syncPlaybackTime(timeSeconds);
  }

  function seekToTime(timeSeconds, options = {}) {
    const audio = audioRef.current;
    const max = durationSeconds || audio?.duration || timeSeconds;
    const nextTime = clamp(timeSeconds, 0, Number.isFinite(max) && max > 0 ? max : Math.max(0, timeSeconds));
    if (audio) audio.currentTime = nextTime;
    syncPlaybackTime(nextTime);
    if (options.resumeSync) setAutoSync(true);
  }

  function seekBy(deltaSeconds) {
    seekToTime((audioRef.current?.currentTime ?? currentTime) + deltaSeconds, { resumeSync: true });
  }

  function focusSegment(segmentId) {
    setActiveSegmentId(segmentId);
  }

  function seekToSegment(segmentId) {
    const segment = project.segments.find((item) => item.id === segmentId);
    setActiveSegmentId(segmentId);
    setAutoSync(true);
    if (segment) seekToTime(segment.startMs / 1000, { resumeSync: true });
  }

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      setAutoSync(true);
      await audio.play();
    } else {
      audio.pause();
    }
  }

  function stopPlayback() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
    setAutoSync(true);
    syncPlaybackTime(0);
  }

  function previousSegment() {
    const index = project.segments.findIndex((segment) => segment.id === activeSegmentId);
    const nextIndex = Math.max(0, index - 1);
    const segment = project.segments[nextIndex];
    if (segment) seekToSegment(segment.id);
  }

  function nextSegment() {
    const index = project.segments.findIndex((segment) => segment.id === activeSegmentId);
    const nextIndex = Math.min(project.segments.length - 1, index + 1);
    const segment = project.segments[nextIndex];
    if (segment) seekToSegment(segment.id);
  }

  function splitSegment(segmentId, caretIndex) {
    const index = project.segments.findIndex((segment) => segment.id === segmentId);
    const segment = project.segments[index];
    if (!segment) return;

    const text = String(segment.text || '');
    const splitAt = clamp(caretIndex, 0, text.length);
    const before = text.slice(0, splitAt).trimEnd();
    const after = text.slice(splitAt).trimStart();
    const duration = Math.max(700, segment.endMs - segment.startMs);
    const ratio = text.length ? clamp(splitAt / text.length, 0.12, 0.88) : 0.5;
    const splitMs = Math.round(segment.startMs + duration * ratio);
    const nextId = `seg_${Date.now()}`;

    const firstSegment = {
      ...segment,
      text: before || segment.text,
      endMs: after ? splitMs : segment.endMs,
    };
    const secondSegment = {
      ...segment,
      id: nextId,
      startMs: after ? splitMs : segment.endMs,
      endMs: Math.max(segment.endMs, (after ? splitMs : segment.endMs) + 700),
      text: after,
      words: [],
    };

    updateProject({
      ...project,
      segments: [
        ...project.segments.slice(0, index),
        firstSegment,
        secondSegment,
        ...project.segments.slice(index + 1),
      ],
      updatedAt: 'Just now',
    });
    setActiveSegmentId(nextId);
  }

  function chooseSplitSpeakerId(currentSpeakerId, followingSegmentIds = []) {
    const following = new Set(followingSegmentIds);
    const nextSpeakerId = project.segments.find((segment) => following.has(segment.id))?.speakerId || null;
    const preferred = project.speakers.find((speaker) => (
      speaker.id !== currentSpeakerId
      && speaker.id !== nextSpeakerId
      && /^P\d+/i.test(speaker.name || '')
    ));
    if (preferred) return preferred.id;

    const anyDifferent = project.speakers.find((speaker) => speaker.id !== currentSpeakerId && speaker.id !== nextSpeakerId);
    if (anyDifferent) return anyDifferent.id;

    const fallbackDifferent = project.speakers.find((speaker) => speaker.id !== currentSpeakerId);
    return fallbackDifferent?.id || currentSpeakerId;
  }

  function splitSegmentToDefaultBlock({ groupText, caretIndex, segmentIds = [], segmentId, followingSegmentIds = [] }) {
    if (segmentIds.length) {
      splitCaraVisibleBlock({ groupText, caretIndex, segmentIds });
      return;
    }

    const index = project.segments.findIndex((segment) => segment.id === segmentId);
    const segment = project.segments[index];
    if (!segment) return;

    const splitSpeakerId = chooseSplitSpeakerId(segment.speakerId, followingSegmentIds);
    const text = String(segment.text || '');
    const splitAt = clamp(caretIndex, 0, text.length);
    const before = text.slice(0, splitAt).trimEnd();
    const after = text.slice(splitAt).trimStart();
    const duration = Math.max(700, segment.endMs - segment.startMs);
    const ratio = text.length ? clamp(splitAt / text.length, 0.04, 0.96) : 1;
    const splitMs = Math.round(segment.startMs + duration * ratio);
    const nextId = `seg_${Date.now()}`;
    const followingIds = new Set(followingSegmentIds);

    const firstSegment = {
      ...segment,
      text: before,
      endMs: after ? splitMs : segment.endMs,
      isDraftBlock: !before,
    };
    const secondSegment = {
      ...segment,
      id: nextId,
      startMs: after ? splitMs : segment.endMs,
      endMs: after ? segment.endMs : segment.endMs + 700,
      speakerId: splitSpeakerId,
      text: after,
      caraText: after,
      caraTextSegmentIds: [nextId, ...followingSegmentIds],
      words: [],
      isDraftBlock: !after,
    };

    updateProject({
      ...project,
      segments: [
        ...project.segments.slice(0, index),
        firstSegment,
        secondSegment,
        ...project.segments.slice(index + 1).map((item) => followingIds.has(item.id) ? { ...item, speakerId: splitSpeakerId } : item),
      ],
      updatedAt: 'Just now',
    });
    setActiveSegmentId(nextId);
  }

  function splitCaraVisibleBlock({ groupText, caretIndex, segmentIds }) {
    const ids = new Set(segmentIds);
    const groupSegments = project.segments.filter((segment) => ids.has(segment.id));
    const owner = groupSegments[0];
    if (!owner) return;

    const text = String(groupText || '');
    const splitAt = clamp(caretIndex, 0, text.length);
    const before = text.slice(0, splitAt).trimEnd();
    const after = text.slice(splitAt).trimStart();
    const startMs = Number(groupSegments[0]?.startMs || 0);
    const endMs = Number(groupSegments[groupSegments.length - 1]?.endMs || startMs + 700);
    const ratio = text.length ? clamp(splitAt / text.length, 0.04, 0.96) : 0.5;
    const splitMs = Math.round(startMs + Math.max(700, endMs - startMs) * ratio);
    const target = groupSegments.find((segment) => splitMs >= segment.startMs && splitMs <= segment.endMs) || groupSegments[groupSegments.length - 1];
    const targetIndex = project.segments.findIndex((segment) => segment.id === target.id);
    const groupTargetIndex = groupSegments.findIndex((segment) => segment.id === target.id);
    const beforeIds = groupSegments.slice(0, groupTargetIndex + 1).map((segment) => segment.id);
    const followingIds = groupSegments.slice(groupTargetIndex + 1).map((segment) => segment.id);
    const splitSpeakerId = chooseSplitSpeakerId(owner.speakerId, followingIds);
    const nextId = `seg_${Date.now()}`;
    const oldTargetEnd = Math.max(splitMs + 250, Number(target.endMs || splitMs + 700));
    const firstTarget = {
      ...target,
      endMs: splitMs,
    };
    const secondSegment = {
      ...target,
      id: nextId,
      startMs: splitMs,
      endMs: oldTargetEnd,
      speakerId: splitSpeakerId,
      text: after,
      caraText: after,
      caraTextSegmentIds: [nextId, ...followingIds],
      words: [],
      isDraftBlock: !after,
    };

    const followingSet = new Set(followingIds);
    const nextSegments = project.segments.flatMap((segment) => {
      if (segment.id === target.id) {
        const first = segment.id === owner.id
          ? {
            ...firstTarget,
            caraText: before,
            caraTextSegmentIds: beforeIds,
            isDraftBlock: !before,
          }
          : firstTarget;
        return [first, secondSegment];
      }
      if (segment.id === owner.id) {
        return [{
          ...segment,
          caraText: before,
          caraTextSegmentIds: beforeIds,
          isDraftBlock: !before,
        }];
      }
      if (followingSet.has(segment.id)) return [{ ...segment, speakerId: splitSpeakerId }];
      return [segment];
    });

    updateProject({
      ...project,
      segments: nextSegments,
      updatedAt: 'Just now',
    });
    setActiveSegmentId(nextId);
  }

  function setTranscriptView(nextView) {
    if (nextView === viewMode || viewLoading) return;
    setViewLoading(true);
    window.requestAnimationFrame(() => {
      setViewMode(nextView);
      window.requestAnimationFrame(() => setViewLoading(false));
    });
  }

  function updateCursorMarker(marker) {
    cursorMarkerRef.current = marker;
    if (!marker?.sync || !positionLocked || isPlaying || !marker?.segmentId) return;
    if (marker.segmentId === activeSegmentId) return;
    setActiveSegmentId(marker.segmentId);
    seekToTime(Number(marker.timeMs || 0) / 1000);
  }

  function addMarker() {
    const fromPlayback = isPlaying;
    const cursorMarker = cursorMarkerRef.current;
    const timeMs = fromPlayback
      ? Math.round((audioRef.current?.currentTime ?? currentTime) * 1000)
      : Math.round(cursorMarker?.timeMs ?? activeSegment?.startMs ?? 0);
    const active = project.segments.find((segment) => timeMs >= segment.startMs && timeMs <= segment.endMs) || activeSegment;
    const speaker = active ? project.speakers.find((item) => item.id === active.speakerId)?.name : null;
    const segmentDuration = Math.max(1, Number(active?.endMs || 0) - Number(active?.startMs || 0));
    const ratio = cursorMarker?.segmentId === active?.id
      ? cursorMarker.ratio
      : clamp((timeMs - Number(active?.startMs || 0)) / segmentDuration, 0, 1);
    const marker = {
      id: `marker_${Date.now()}`,
      segmentId: active?.id || null,
      ratio,
      caretIndex: cursorMarker?.segmentId === active?.id ? cursorMarker.caretIndex : null,
      color: MARKER_COLORS[(project.markers || []).length % MARKER_COLORS.length],
      label: `${speaker ? `${speaker}: ` : ''}${cursorMarker?.snippet || makeMarkerSnippet(active?.text) || formatMarkerTime(timeMs)}`,
    };
    updateProject({
      ...project,
      markers: [...(project.markers || []), marker],
      updatedAt: 'Just now',
    });
  }

  function markerToTime(marker) {
    const segment = project.segments.find((item) => item.id === marker.segmentId);
    if (!segment) return Number(marker.timeMs || 0);
    const ratio = clamp(Number(marker.ratio || 0), 0, 1);
    return Math.round(segment.startMs + Math.max(0, segment.endMs - segment.startMs) * ratio);
  }

  async function playMarker(marker) {
    const timeMs = markerToTime(marker);
    const segment = project.segments.find((item) => item.id === marker.segmentId);
    if (segment) setActiveSegmentId(segment.id);
    seekToTime(timeMs / 1000, { resumeSync: true });
    await audioRef.current?.play();
  }

  function deleteMarker(markerId) {
    updateProject({
      ...project,
      markers: (project.markers || []).filter((marker) => marker.id !== markerId),
      updatedAt: 'Just now',
    });
  }

  function sortedMarkers() {
    return [...(project.markers || [])].sort((a, b) => markerToTime(a) - markerToTime(b));
  }

  function playAdjacentMarker(direction) {
    const markers = sortedMarkers();
    if (!markers.length) return;
    const nowMs = Math.round((audioRef.current?.currentTime ?? currentTime) * 1000);
    const index = direction > 0
      ? markers.findIndex((marker) => markerToTime(marker) > nowMs + 250)
      : findLastIndex(markers, (marker) => markerToTime(marker) < nowMs - 250);
    const marker = direction > 0
      ? markers[index === -1 ? 0 : index]
      : markers[index === -1 ? markers.length - 1 : index];
    playMarker(marker);
  }

  async function runDeepgram() {
    if (!project.mediaFile) {
      setTranscribeError('This project does not have an imported audio file attached. Import audio as a new project before transcribing.');
      return;
    }
    setTranscribing(true);
    setTranscribeError('');
    try {
      const form = new FormData();
      form.append('media', project.mediaFile, project.mediaName || 'media.mp3');
      const response = await fetch('/api/transcribe', { method: 'POST', body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) throw new Error(payload.error || 'Transcription failed.');
      updateProject({
        ...project,
        speakers: payload.speakers,
        segments: payload.segments,
        status: 'Transcribed',
        duration: payload.durationSeconds ? `${Math.floor(payload.durationSeconds / 60)}:${String(Math.round(payload.durationSeconds % 60)).padStart(2, '0')}` : project.duration,
        updatedAt: 'Just now',
      });
      setActiveSegmentId(payload.segments[0]?.id || null);
      setViewMode('rows');
    } catch (error) {
      setTranscribeError(error instanceof Error ? error.message : 'Transcription failed.');
    } finally {
      setTranscribing(false);
    }
  }

  function startResize(panel, event) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = panel === 'player' ? playerWidth : inspectorWidth;
    const limits = PANEL_LIMITS[panel];
    document.body.classList.add('is-resizing');

    function move(moveEvent) {
      const delta = moveEvent.clientX - startX;
      const nextWidth = panel === 'player'
        ? clamp(startWidth + delta, limits.min, limits.max)
        : clamp(startWidth - delta, limits.min, limits.max);
      if (panel === 'player') setPlayerWidth(nextWidth);
      else setInspectorWidth(nextWidth);
    }

    function stop() {
      document.body.classList.remove('is-resizing');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  }

  const gridClass = [
    'editor-grid',
    playerCollapsed ? 'player-collapsed' : '',
    inspectorCollapsed ? 'inspector-collapsed' : '',
  ].filter(Boolean).join(' ');
  const gridStyle = {
    gridTemplateColumns: `${playerCollapsed ? 42 : playerWidth}px 5px minmax(440px, 1fr) 5px ${inspectorCollapsed ? 42 : inspectorWidth}px`,
  };

  return (
    <section className="editor-page">
      <header className="editor-bar">
        <button type="button" onClick={onBack}><ArrowLeft size={15} /> Projects</button>
        <input className="title-input" aria-label="Project title" value={project.title} onChange={(event) => updateProject({ ...project, title: event.target.value, updatedAt: 'Just now' })} />
        <div className="bar-actions">
          <button type="button" disabled={!canUndo} onClick={() => { flashShortcut('Undo', 'Project change'); onUndo?.(); }}><Undo2 size={15} /> Undo</button>
          <button type="button" disabled={!canRedo} onClick={() => { flashShortcut('Redo', 'Project change'); onRedo?.(); }}><Redo2 size={15} /> Redo</button>
          <button type="button" onClick={() => setFindOpen(true)}><Search size={15} /> Find</button>
          <button type="button" onClick={() => setSettingsOpen(true)}><Settings size={15} /> Settings</button>
          <button type="button" disabled={transcribing} onClick={runDeepgram}><Waves size={15} /> {transcribing ? 'Transcribing...' : 'Run Deepgram'}</button>
          <button className="primary" type="button" onClick={() => setExportOpen(true)}><Download size={15} /> Export</button>
        </div>
      </header>

      {transcribeError && <div className="editor-error">{transcribeError}</div>}
      <div className={gridClass} style={gridStyle}>
        <PlayerPane
          project={project}
          settings={settings}
          activeSegment={activeSegment}
          currentTime={currentTime}
          durationSeconds={durationSeconds}
          isPlaying={isPlaying}
          audioRef={audioRef}
          collapsed={playerCollapsed}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeChange={handleTimeChange}
          onPlayStateChange={setIsPlaying}
          shortcutHud={shortcutHud}
          onTogglePlay={() => { flashShortcut('Space', isPlaying ? 'Pause' : 'Play'); togglePlay(); }}
          onStop={() => { flashShortcut('Stop', 'Reset'); stopPlayback(); }}
          onSeekBy={(delta) => { flashShortcut(delta > 0 ? `+${delta}s` : `${delta}s`, delta > 0 ? 'Forward' : 'Back'); seekBy(delta); }}
          onSeekTo={(time) => { flashShortcut('Seek', formatMarkerTime(time * 1000)); seekToTime(time, { resumeSync: true }); }}
          onPreviousSegment={() => { flashShortcut('Row −', 'Previous'); previousSegment(); }}
          onNextSegment={() => { flashShortcut('Row +', 'Next'); nextSegment(); }}
          onToggle={() => setPlayerCollapsed((value) => !value)}
        />
        <div
          className={`pane-resizer ${playerCollapsed ? 'disabled' : ''}`}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize player panel"
          onPointerDown={(event) => !playerCollapsed && startResize('player', event)}
        />
        <TranscriptTable
          project={project}
          viewMode={viewMode}
          karaText={karaText}
          loading={viewLoading}
          onSeekMarker={playMarker}
          activeSegmentId={activeSegmentId}
          currentTime={currentTime}
          isPlaying={isPlaying}
          autoSync={autoSync}
          showWordFollow={Boolean(settings.wordFollow)}
          onPauseSync={() => setAutoSync(false)}
          onResumeSync={() => setAutoSync(true)}
          onFocusSegment={focusSegment}
          onSeekSegment={seekToSegment}
          onChangeSegment={updateSegment}
          onChangeSegments={updateSegments}
          onSplitSegment={splitSegment}
          onSplitDefaultBlock={splitSegmentToDefaultBlock}
          onDeleteSegment={deleteSegment}
          onDeleteSegments={deleteSegments}
          onExportAudioBlock={exportAudioBlock}
          onCursorMarker={updateCursorMarker}
          onSeekTime={(timeMs) => seekToTime(timeMs / 1000, { resumeSync: true })}
          onTogglePlay={togglePlay}
          onNextSegment={nextSegment}
          onEditSpeaker={openRenameSpeaker}
          onAddSpeaker={openAddSpeaker}
        />
        <div
          className={`pane-resizer ${inspectorCollapsed ? 'disabled' : ''}`}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize inspector panel"
          onPointerDown={(event) => !inspectorCollapsed && startResize('inspector', event)}
        />
        <InspectorPane
          project={project}
          viewMode={viewMode}
          onSetViewMode={setTranscriptView}
          positionLocked={positionLocked}
          onTogglePositionLock={() => setPositionLocked((value) => !value)}
          collapsed={inspectorCollapsed}
          onToggle={() => setInspectorCollapsed((value) => !value)}
          onEditSpeaker={openRenameSpeaker}
          onMergeSpeaker={openMergeSpeaker}
          onDeleteSpeakerSegments={deleteSpeakerSegments}
          onAddMarker={addMarker}
          onSeekMarker={playMarker}
          onPreviousMarker={() => playAdjacentMarker(-1)}
          onNextMarker={() => playAdjacentMarker(1)}
          onDeleteMarker={deleteMarker}
          onDownloadTxt={() => downloadText(`${project.title}.txt`, inqText)}
          onDownloadKara={() => downloadText(`${project.title}.cara.md`, karaText)}
          onDownloadSrt={() => downloadText(`${project.title}.srt`, srtText)}
        />
      </div>

      <TextModal
        open={Boolean(speakerModal)}
        title={speakerModal?.mode === 'add' ? 'Add speaker' : 'Rename speaker'}
        label={speakerModal?.mode === 'add' ? 'Speaker name' : 'New name'}
        initialValue={speakerModal?.initialValue || ''}
        confirmLabel={speakerModal?.mode === 'add' ? 'Add speaker' : 'Rename'}
        onCancel={() => setSpeakerModal(null)}
        onConfirm={saveSpeakerModal}
      />

      {speakerMergeModal && (
        <SpeakerMergeModal
          project={project}
          sourceSpeakerId={speakerMergeModal.sourceSpeakerId}
          targetSpeakerId={speakerMergeModal.targetSpeakerId}
          onChangeTarget={(targetSpeakerId) => setSpeakerMergeModal((value) => value ? ({ ...value, targetSpeakerId }) : value)}
          onCancel={() => setSpeakerMergeModal(null)}
          onConfirm={confirmMergeSpeaker}
        />
      )}

      {findOpen && (
        <FindReplaceModal
          project={project}
          viewMode={viewMode}
          activeSegmentId={activeSegmentId}
          onClose={() => setFindOpen(false)}
          onJump={(segmentId) => {
            const segment = project.segments.find((item) => item.id === segmentId);
            if (!segment) return;
            setActiveSegmentId(segmentId);
            if (positionLocked) seekToTime(segment.startMs / 1000);
          }}
          onReplaceSegment={updateSegment}
          onReplaceProject={(segments) => updateProject({ ...project, segments, updatedAt: 'Just now' })}
        />
      )}

      {exportOpen && (
        <ExportConfigModal
          project={project}
          currentTime={currentTime}
          desktopApi={typeof window !== 'undefined' ? window.deepgramScribeDesktop : null}
          markerToTime={markerToTime}
          onClose={() => setExportOpen(false)}
        />
      )}

      {settingsOpen && (
        <EditorSettingsModal
          settings={settings}
          setSettings={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </section>
  );
}

function FindReplaceModal({ project, viewMode, activeSegmentId, onClose, onJump, onReplaceSegment, onReplaceProject }) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const searchItems = useMemo(() => makeSearchItems(project, viewMode), [project, viewMode]);
  const matches = useMemo(() => findMatches(searchItems, query, caseSensitive), [searchItems, query, caseSensitive]);
  const safeIndex = Math.min(currentIndex, Math.max(0, matches.length - 1));
  const current = matches.length ? matches[safeIndex] : null;

  useEffect(() => {
    if (currentIndex > Math.max(0, matches.length - 1)) setCurrentIndex(Math.max(0, matches.length - 1));
  }, [matches.length, currentIndex]);

  function jumpTo(match) {
    if (match?.segmentId) onJump(match.segmentId);
  }

  function move(delta) {
    if (!matches.length) return;
    const nextIndex = (safeIndex + delta + matches.length) % matches.length;
    setCurrentIndex(nextIndex);
    jumpTo(matches[nextIndex]);
  }

  function replaceCurrent() {
    if (!current) return;
    replaceSearchMatch(current, replacement, project, onReplaceSegment, onReplaceProject);
    jumpTo(current);
  }

  function replaceAll() {
    if (!query || !matches.length) return;
    replaceAllSearchMatches(searchItems, query, replacement, caseSensitive, project, onReplaceProject);
  }

  const scopeLabel = viewMode === 'kara' ? 'Cara visible text' : 'Rows timed text';

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="text-modal find-replace-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <strong>Find and replace</strong>
          <button type="button" aria-label="Close" onClick={onClose}><X size={15} /></button>
        </header>
        <div className="find-grid">
          <label>
            <span>Find</span>
            <input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setCurrentIndex(0); }} placeholder="Text to find" />
          </label>
          <label>
            <span>Replace</span>
            <input value={replacement} onChange={(event) => setReplacement(event.target.value)} placeholder="Replacement text" />
          </label>
          <label className="find-check">
            <input type="checkbox" checked={caseSensitive} onChange={(event) => setCaseSensitive(event.target.checked)} />
            <span>Case sensitive</span>
          </label>
          <div className="find-status">
            {query ? `${matches.length} match${matches.length === 1 ? '' : 'es'}${matches.length ? ` · ${safeIndex + 1} of ${matches.length}` : ''}` : 'Enter text to search'} · {scopeLabel}
          </div>
          <div className="find-hint">Typing here does not move playback. Use Previous/Next to jump.</div>
        </div>
        <footer>
          <button type="button" onClick={() => move(-1)} disabled={!matches.length}>Previous</button>
          <button type="button" onClick={() => move(1)} disabled={!matches.length}>Next</button>
          <button type="button" onClick={replaceCurrent} disabled={!current}>Replace</button>
          <button className="primary" type="button" onClick={replaceAll} disabled={!matches.length}>Replace all</button>
        </footer>
      </section>
    </div>
  );
}

function findMatches(items, query, caseSensitive) {
  if (!query) return [];
  const needle = caseSensitive ? query : query.toLowerCase();
  const matches = [];
  for (const item of items) {
    const text = String(item.text || '');
    const haystack = caseSensitive ? text : text.toLowerCase();
    let start = haystack.indexOf(needle);
    while (start !== -1) {
      matches.push({ ...item, start, end: start + query.length });
      start = haystack.indexOf(needle, start + Math.max(1, query.length));
    }
  }
  return matches;
}

function makeSearchItems(project, viewMode) {
  if (viewMode !== 'kara') {
    return project.segments.map((segment) => ({
      kind: 'row',
      id: segment.id,
      segmentId: segment.id,
      text: String(segment.text || ''),
    }));
  }

  return makeCaraSearchGroups(project).map((group) => ({
    kind: 'cara',
    id: group.id,
    segmentId: group.segments[0]?.id || null,
    segmentIds: group.segments.map((segment) => segment.id),
    text: group.text,
  }));
}

function replaceSearchMatch(match, replacement, project, onReplaceSegment, onReplaceProject) {
  const text = String(match.text || '');
  const nextText = `${text.slice(0, match.start)}${replacement}${text.slice(match.end)}`;
  if (match.kind === 'row') {
    onReplaceSegment(match.segmentId, { text: nextText });
    return;
  }

  const ownerId = match.segmentId;
  const coveredIds = match.segmentIds || [ownerId];
  onReplaceProject(project.segments.map((segment) => segment.id === ownerId
    ? {
      ...segment,
      text: coveredIds.length === 1 ? nextText : segment.text,
      caraText: nextText,
      caraTextSegmentIds: coveredIds,
      isDraftBlock: false,
    }
    : segment));
}

function replaceAllSearchMatches(searchItems, query, replacement, caseSensitive, project, onReplaceProject) {
  const regex = new RegExp(escapeRegExp(query), caseSensitive ? 'g' : 'gi');
  const replacements = new Map();
  for (const item of searchItems) {
    const nextText = String(item.text || '').replace(regex, replacement);
    if (nextText === item.text) continue;
    replacements.set(item.segmentId, { ...item, nextText });
  }

  onReplaceProject(project.segments.map((segment) => {
    const item = replacements.get(segment.id);
    if (!item) return segment;
    if (item.kind === 'row') return { ...segment, text: item.nextText };
    return {
      ...segment,
      text: (item.segmentIds || []).length === 1 ? item.nextText : segment.text,
      caraText: item.nextText,
      caraTextSegmentIds: item.segmentIds || [segment.id],
      isDraftBlock: false,
    };
  }));
}

function makeCaraSearchGroups(project) {
  const groups = [];
  for (const segment of project.segments.filter((item) => String(item.text || item.caraText || '').trim() || item.isDraftBlock)) {
    const last = groups[groups.length - 1];
    if (last?.speakerId === segment.speakerId && !segment.isDraftBlock && !last.hasDraftBlock) {
      last.segments.push(segment);
    } else {
      groups.push({
        id: `kara_${segment.id}`,
        speakerId: segment.speakerId,
        segments: [segment],
        hasDraftBlock: Boolean(segment.isDraftBlock),
      });
    }
  }
  return groups.map((group) => ({ ...group, text: caraSearchGroupText(group.segments) }));
}

function caraSearchGroupText(segments) {
  const parts = [];
  const consumed = new Set();
  for (const segment of segments) {
    if (consumed.has(segment.id)) continue;
    if (Object.prototype.hasOwnProperty.call(segment, 'caraText')) {
      const coveredIds = Array.isArray(segment.caraTextSegmentIds) && segment.caraTextSegmentIds.length
        ? segment.caraTextSegmentIds
        : legacyCoveredEditorCaraSegmentIds(segment, segments);
      parts.push(String(segment.caraText || '').trim());
      for (const id of coveredIds) consumed.add(id);
      continue;
    }
    parts.push(String(segment.text || '').trim());
    consumed.add(segment.id);
  }
  return parts.filter(Boolean).join(' ').trim();
}

function legacyCoveredEditorCaraSegmentIds(owner, segments) {
  const override = normalizeEditorText(owner.caraText);
  const ownerIndex = segments.findIndex((segment) => segment.id === owner.id);
  if (ownerIndex < 0) return [owner.id];
  const ids = [owner.id];
  for (const segment of segments.slice(ownerIndex + 1)) {
    const text = normalizeEditorText(segment.text);
    if (!text) continue;
    const sample = text.slice(0, Math.min(48, text.length));
    if (sample.length >= 12 && override.includes(sample)) ids.push(segment.id);
    else break;
  }
  return ids;
}

function normalizeEditorText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makeMarkerSnippet(text) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  return value.length > 42 ? `${value.slice(0, 42)}…` : value;
}

function formatMarkerTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function ExportConfigModal({ project, currentTime, desktopApi, markerToTime, onClose }) {
  const sorted = useMemo(() => [...(project.markers || [])].sort((a, b) => markerToTime(a) - markerToTime(b)), [project.markers, markerToTime]);
  const firstMarkerId = sorted[0]?.id || '';
  const lastMarkerId = sorted[sorted.length - 1]?.id || '';
  const [format, setFormat] = useState('cara-md');
  const [destination, setDestination] = useState(desktopApi?.saveTextFile ? 'save-as' : 'download');
  const [fromMode, setFromMode] = useState(firstMarkerId ? 'marker' : 'start');
  const [toMode, setToMode] = useState(sorted.length > 1 ? 'marker' : 'end');
  const [fromMarkerId, setFromMarkerId] = useState(firstMarkerId);
  const [toMarkerId, setToMarkerId] = useState(lastMarkerId);
  const [fromCustom, setFromCustom] = useState(formatMarkerTime(project.segments[0]?.startMs || 0));
  const [toCustom, setToCustom] = useState(formatMarkerTime(project.segments[project.segments.length - 1]?.endMs || 0));
  const [includeRangeStamp, setIncludeRangeStamp] = useState(true);
  const [status, setStatus] = useState('');

  const range = resolveExportRange({ project, currentTime, markerToTime, fromMode, toMode, fromMarkerId, toMarkerId, fromCustom, toCustom });
  const payload = buildExportPayload(project, range.startMs, range.endMs, format, includeRangeStamp);
  const canSaveAs = Boolean(desktopApi?.saveTextFile);

  async function runExport() {
    setStatus('');
    try {
      if (destination === 'copy') {
        await navigator.clipboard.writeText(payload.copyText);
        setStatus('Copied.');
        return;
      }
      if (destination === 'save-as' && canSaveAs) {
        const result = await desktopApi.saveTextFile({
          defaultPath: payload.filename,
          content: payload.content,
          filters: [{ name: payload.filterName, extensions: [payload.extension] }],
        });
        if (result?.canceled) return;
        if (result?.success === false) throw new Error(result.error || 'Save failed.');
        setStatus('Saved.');
        return;
      }
      downloadExport(payload.filename, payload.content, payload.mime);
      setStatus('Downloaded.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Export failed.');
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="text-modal export-config-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <strong>Export</strong>
          <button type="button" aria-label="Close" onClick={onClose}><X size={15} /></button>
        </header>
        <div className="export-config-grid">
          <label>
            <span>Format</span>
            <select value={format} onChange={(event) => setFormat(event.target.value)}>
              <option value="cara-md">Cara MD</option>
              <option value="timed-txt">Timed TXT</option>
              <option value="srt">SRT subtitles</option>
              <option value="word-doc">Word document (.doc)</option>
            </select>
          </label>
          <label>
            <span>Output</span>
            <select value={destination} onChange={(event) => setDestination(event.target.value)}>
              <option value="download">Download</option>
              <option value="copy">Copy to clipboard</option>
              <option value="save-as" disabled={!canSaveAs}>Choose file location</option>
            </select>
          </label>
          <fieldset>
            <legend>From</legend>
            <select value={fromMode} onChange={(event) => setFromMode(event.target.value)}>
              <option value="start">Beginning</option>
              <option value="current">Current playhead</option>
              <option value="marker" disabled={!sorted.length}>Marker</option>
              <option value="custom">Custom time</option>
            </select>
            {fromMode === 'marker' && <MarkerSelect markers={sorted} value={fromMarkerId} onChange={setFromMarkerId} markerToTime={markerToTime} />}
            {fromMode === 'custom' && <input value={fromCustom} onChange={(event) => setFromCustom(event.target.value)} placeholder="32:31" />}
          </fieldset>
          <fieldset>
            <legend>To</legend>
            <select value={toMode} onChange={(event) => setToMode(event.target.value)}>
              <option value="end">End</option>
              <option value="current">Current playhead</option>
              <option value="marker" disabled={!sorted.length}>Marker</option>
              <option value="custom">Custom time</option>
            </select>
            {toMode === 'marker' && <MarkerSelect markers={sorted} value={toMarkerId} onChange={setToMarkerId} markerToTime={markerToTime} />}
            {toMode === 'custom' && <input value={toCustom} onChange={(event) => setToCustom(event.target.value)} placeholder="53:22" />}
          </fieldset>
          <label className="find-check export-check">
            <input type="checkbox" checked={includeRangeStamp} onChange={(event) => setIncludeRangeStamp(event.target.checked)} />
            <span>Add range timestamp at the beginning</span>
          </label>
          <div className="export-summary">
            <strong>{formatMarkerTime(range.startMs)}–{formatMarkerTime(range.endMs)}</strong>
            <span>{payload.count} item{payload.count === 1 ? '' : 's'} · {payload.filename}</span>
          </div>
          {status && <div className="find-status">{status}</div>}
        </div>
        <footer>
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary" type="button" onClick={runExport}><Download size={13} /> Export</button>
        </footer>
      </section>
    </div>
  );
}

function MarkerSelect({ markers, value, onChange, markerToTime }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {markers.map((marker, index) => (
        <option key={marker.id} value={marker.id}>{formatMarkerTime(markerToTime(marker))} · {marker.label || `Marker ${index + 1}`}</option>
      ))}
    </select>
  );
}

function resolveExportRange({ project, currentTime, markerToTime, fromMode, toMode, fromMarkerId, toMarkerId, fromCustom, toCustom }) {
  const firstMs = Number(project.segments[0]?.startMs || 0);
  const lastMs = Number(project.segments[project.segments.length - 1]?.endMs || firstMs);
  const markerById = new Map((project.markers || []).map((marker) => [marker.id, marker]));
  function valueFor(mode, markerId, custom, fallback) {
    if (mode === 'start') return firstMs;
    if (mode === 'end') return lastMs;
    if (mode === 'current') return Math.round(Number(currentTime || 0) * 1000);
    if (mode === 'marker') return markerToTime(markerById.get(markerId) || markerById.values().next().value || {});
    if (mode === 'custom') return parseTimeInput(custom, fallback);
    return fallback;
  }
  const rawStart = valueFor(fromMode, fromMarkerId, fromCustom, firstMs);
  const rawEnd = valueFor(toMode, toMarkerId, toCustom, lastMs);
  return {
    startMs: clamp(Math.min(rawStart, rawEnd), firstMs, lastMs),
    endMs: clamp(Math.max(rawStart, rawEnd), firstMs, lastMs),
  };
}

function parseTimeInput(value, fallbackMs) {
  const clean = String(value || '').trim();
  if (!clean) return fallbackMs;
  const parts = clean.split(':').map((part) => part.trim());
  const numeric = parts.map(Number);
  if (numeric.some((value) => Number.isNaN(value))) return fallbackMs;
  if (numeric.length === 1) return Math.round(numeric[0] * 1000);
  if (numeric.length === 2) return Math.round(((numeric[0] * 60) + numeric[1]) * 1000);
  return Math.round(((numeric[0] * 3600) + (numeric[1] * 60) + numeric[2]) * 1000);
}

function buildExportPayload(project, startMs, endMs, format, includeRangeStamp) {
  const safeTitle = safeFilename(project.title || 'typescribe-export');
  const rangeSlug = `${formatMarkerTime(startMs).replace(':', '-')}-to-${formatMarkerTime(endMs).replace(':', '-')}`;
  const rangeLine = `${formatMarkerTime(startMs)}–${formatMarkerTime(endMs)}`;
  const segments = rangeSegments(project, startMs, endMs);
  const stamp = includeRangeStamp && format !== 'srt' ? `${rangeLine}\n\n` : '';

  if (format === 'timed-txt') {
    const text = `${stamp}${makeTimedText(project, segments)}`.trimEnd() + '\n';
    return { filename: `${safeTitle}-${rangeSlug}.txt`, content: text, copyText: text, mime: 'text/plain;charset=utf-8', extension: 'txt', filterName: 'Text', count: segments.length };
  }
  if (format === 'srt') {
    const text = makeSrtText(project, segments);
    return { filename: `${safeTitle}-${rangeSlug}.srt`, content: text, copyText: text, mime: 'text/plain;charset=utf-8', extension: 'srt', filterName: 'SRT', count: segments.length };
  }
  if (format === 'word-doc') {
    const entries = makeCaraExportEntries(project, startMs, endMs);
    const html = makeWordDocumentHtml(rangeLine, entries, includeRangeStamp);
    const plain = `${stamp}${entries.map((entry) => `${entry.label}: ${entry.text}`).join('\n\n')}`.trimEnd() + '\n';
    return { filename: `${safeTitle}-${rangeSlug}.doc`, content: html, copyText: plain, mime: 'application/msword;charset=utf-8', extension: 'doc', filterName: 'Word document', count: entries.length };
  }

  const entries = makeCaraExportEntries(project, startMs, endMs);
  const text = `${stamp}${entries.map((entry) => `${entry.label}: ${entry.text}`).join('\n\n')}`.trimEnd() + '\n';
  return { filename: `${safeTitle}-${rangeSlug}.cara.md`, content: text, copyText: text, mime: 'text/markdown;charset=utf-8', extension: 'md', filterName: 'Markdown', count: entries.length };
}

function rangeSegments(project, startMs, endMs) {
  return project.segments.filter((segment) => Number(segment.endMs || 0) > startMs && Number(segment.startMs || 0) < endMs);
}

function makeTimedText(project, segments) {
  return segments.map((segment) => `[${formatTime(segment.startMs)}] ${getSpeaker(project, segment.speakerId)}: ${segment.text}`).join('\n');
}

function makeSrtText(project, segments) {
  return segments.map((segment, index) => [
    index + 1,
    `${formatSrtTime(segment.startMs)} --> ${formatSrtTime(segment.endMs)}`,
    `${getSpeaker(project, segment.speakerId)}: ${segment.text}`,
  ].join('\n')).join('\n\n') + '\n';
}

function makeCaraExportEntries(project, startMs, endMs) {
  const groups = makeCaraSearchGroups(project).map((group) => {
    const groupStart = Number(group.segments[0]?.startMs || 0);
    const groupEnd = Number(group.segments[group.segments.length - 1]?.endMs || groupStart);
    return {
      label: getKaraLabel(project, group.speakerId),
      text: group.text,
      startMs: groupStart,
      endMs: groupEnd,
    };
  }).filter((group) => group.text && group.endMs > startMs && group.startMs < endMs);

  const merged = [];
  for (const group of groups) {
    const last = merged[merged.length - 1];
    if (last?.label === group.label) last.text = `${last.text} ${group.text}`.trim();
    else merged.push({ label: group.label, text: group.text });
  }
  return merged;
}

function makeWordDocumentHtml(rangeLine, entries, includeRangeStamp) {
  const body = [
    '<!doctype html><html><head><meta charset="utf-8"><title>TypeScribe export</title>',
    '<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.35;}p{margin:0 0 10pt;}strong{font-weight:700;}</style>',
    '</head><body>',
    includeRangeStamp ? `<p><strong>${escapeHtml(rangeLine)}</strong></p>` : '',
    ...entries.map((entry) => `<p><strong>${escapeHtml(entry.label)}: </strong>${escapeHtml(entry.text)}</p>`),
    '</body></html>',
  ];
  return body.join('');
}

function downloadExport(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function safeFilename(value) {
  return String(value || 'export').replace(/[<>:"/\\|?*]+/g, '-').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function SpeakerMergeModal({ project, sourceSpeakerId, targetSpeakerId, onChangeTarget, onCancel, onConfirm }) {
  const sourceSpeaker = project.speakers.find((speaker) => speaker.id === sourceSpeakerId);
  const targetOptions = project.speakers.filter((speaker) => speaker.id !== sourceSpeakerId);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="text-modal editor-settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <strong>Merge speaker</strong>
          <button type="button" aria-label="Close" onClick={onCancel}><X size={15} /></button>
        </header>
        <div className="modal-settings-grid">
          <div className="merge-summary">
            Merge <strong>{sourceSpeaker?.name || 'Speaker'}</strong> into another speaker. Rows keep their timing and text.
          </div>
          <label>
            <span>Merge into</span>
            <select value={targetSpeakerId} onChange={(event) => onChangeTarget(event.target.value)}>
              {targetOptions.map((speaker) => (
                <option key={speaker.id} value={speaker.id}>{speaker.name}</option>
              ))}
            </select>
          </label>
        </div>
        <footer>
          <button type="button" onClick={onCancel}>Cancel</button>
          <button className="primary" type="button" onClick={onConfirm} disabled={!targetSpeakerId}>Merge</button>
        </footer>
      </section>
    </div>
  );
}

function EditorSettingsModal({ settings, setSettings, onClose }) {
  function update(key, value) {
    setSettings?.({ ...settings, [key]: value });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="text-modal editor-settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <strong>Editor settings</strong>
          <button type="button" aria-label="Close" onClick={onClose}><X size={15} /></button>
        </header>
        <div className="modal-settings-grid">
          <label>
            <span>Deepgram model</span>
            <select value={settings.model} onChange={(event) => update('model', event.target.value)}>
              <option>whisper-large</option>
              <option>nova-3</option>
              <option>nova-3-general</option>
              <option>nova-2</option>
            </select>
          </label>
          <label>
            <span>Language</span>
            <select value={settings.language} onChange={(event) => update('language', event.target.value)}>
              <option>Detect automatically</option>
              <option>Kiswahili</option>
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </label>
          <label>
            <span>Export preset</span>
            <select value={settings.exportFormat} onChange={(event) => update('exportFormat', event.target.value)}>
              <option>Cara MD + SRT</option>
              <option>Cara MD only</option>
              <option>SRT + TXT</option>
            </select>
          </label>
          <button className={settings.diarization ? 'primary' : ''} type="button" onClick={() => update('diarization', !settings.diarization)}>
            Speaker detection: {settings.diarization ? 'Enabled' : 'Disabled'}
          </button>
          <button className={settings.wordFollow ? 'primary' : ''} type="button" onClick={() => update('wordFollow', !settings.wordFollow)}>
            Word follow: {settings.wordFollow ? 'Shown' : 'Hidden'}
          </button>
          <div className="modal-shortcuts">
            <strong>Shortcuts</strong>
            <div className="shortcut-list settings-shortcut-list">
              <span><kbd>Space</kbd> Play / pause</span>
              <span><kbd>Ctrl</kbd><kbd>Space</kbd> Play while typing</span>
              <span><kbd>Ctrl</kbd><kbd>Z</kbd> Undo project change</span>
              <span><kbd>Ctrl</kbd><kbd>Y</kbd> Redo project change</span>
              <span><kbd>Ctrl</kbd><kbd>F</kbd> Find / replace</span>
              <span><kbd>Ctrl</kbd><kbd>M</kbd> Add marker</span>
              <span><kbd>Ctrl</kbd><kbd>1</kbd> Rows view</span>
              <span><kbd>Ctrl</kbd><kbd>2</kbd> Cara view</span>
              <span><kbd>Ctrl</kbd><kbd>←</kbd> Back 1s</span>
              <span><kbd>Ctrl</kbd><kbd>→</kbd> Forward 1s</span>
              <span><kbd>Alt</kbd><kbd>←</kbd> Back 2s</span>
              <span><kbd>Alt</kbd><kbd>→</kbd> Forward 2s</span>
              <span><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>←</kbd> Previous row</span>
              <span><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>→</kbd> Next row</span>
              <span><kbd>Ctrl</kbd><kbd>,</kbd> Settings</span>
            </div>
          </div>
        </div>
        <footer>
          <button className="primary" type="button" onClick={onClose}>Done</button>
        </footer>
      </section>
    </div>
  );
}
