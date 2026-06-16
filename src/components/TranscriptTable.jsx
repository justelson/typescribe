import { MoreHorizontal, Pause, Play, RotateCcw, SkipForward, Trash2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { formatTime } from '../utils/transcript.js';
import { SpeakerMenu } from './SpeakerMenu.jsx';

export function TranscriptTable({
  project,
  viewMode,
  loading,
  activeSegmentId,
  onSeekMarker,
  currentTime,
  isPlaying,
  autoSync,
  showWordFollow,
  onPauseSync,
  onResumeSync,
  onFocusSegment,
  onSeekSegment,
  onChangeSegment,
  onChangeSegments,
  onSplitSegment,
  onSplitDefaultBlock,
  onDeleteSegment,
  onDeleteSegments,
  onExportAudioBlock,
  onCursorMarker,
  onSeekTime,
  onTogglePlay,
  onNextSegment,
  onEditSpeaker,
  onAddSpeaker,
}) {
  const rowsRef = useRef(null);
  const rowRefs = useRef(new Map());
  const programmaticScrollRef = useRef(false);
  const didInitialPositionRef = useRef(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const karaGroups = useMemo(() => makeCaraGroups(project.segments), [project.segments]);
  const markerPositions = useMemo(() => makeMarkerPositions(project), [project]);

  useEffect(() => {
    setLayoutReady(false);
    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setLayoutReady(true));
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
    didInitialPositionRef.current = false;
  }, [project.id, viewMode]);

  useEffect(() => {
    if (!layoutReady || !autoSync || !activeSegmentId) return undefined;
    const row = rowRefs.current.get(activeSegmentId);
    if (!row) return undefined;
    programmaticScrollRef.current = true;
    const behavior = didInitialPositionRef.current ? 'smooth' : 'auto';
    row.scrollIntoView({ block: 'center', behavior });
    didInitialPositionRef.current = true;
    const timeout = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 460);
    return () => window.clearTimeout(timeout);
  }, [activeSegmentId, autoSync, layoutReady]);

  function handleScroll() {
    if (!isPlaying || programmaticScrollRef.current) return;
    onPauseSync?.();
  }

  function updateCaraGroup(group, text) {
    const owner = group.segments[0];
    if (!owner) return;
    const coveredIds = group.segments.map((segment) => segment.id);
    onChangeSegments([{
      id: owner.id,
      patch: group.segments.length === 1
        ? { text, caraText: text, caraTextSegmentIds: coveredIds, isDraftBlock: false }
        : { caraText: text, caraTextSegmentIds: coveredIds },
    }]);
  }

  function splitCaraGroup(group, caretIndex) {
    const target = segmentAtGroupCaret(group, caretIndex);
    onSplitSegment(target.segment.id, target.offset);
  }

  function splitCaraGroupToDefault(group, caretIndex) {
    onSplitDefaultBlock({
      groupText: group.text,
      caretIndex,
      segmentIds: group.segments.map((segment) => segment.id),
    });
  }

  if (viewMode === 'kara') {
    return (
      <main className={`transcript-pane kara-pane editable-kara-pane ${!layoutReady ? 'is-preparing' : ''}`}>
        <div className="transcript-head kara-head single-head">
          <span>Cara view · Simple default editing view. Speaker labels only.</span>
        </div>
        <div className="kara-plain-editor" ref={rowsRef} onScroll={handleScroll} onWheel={handleScroll}>
          {karaGroups.map((group) => {
            const active = group.segments.some((segment) => segment.id === activeSegmentId);
            return (
              <CaraPlainBlock
                key={group.id}
                refCallback={(node) => {
                  for (const segment of group.segments) {
                    if (node) rowRefs.current.set(segment.id, node);
                    else rowRefs.current.delete(segment.id);
                  }
                }}
                group={group}
                speakers={project.speakers}
                active={active}
                activeSegmentId={activeSegmentId}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onSeekTime={onSeekTime}
                onTogglePlay={onTogglePlay}
                onNextSegment={onNextSegment}
                onFocus={() => onFocusSegment(group.segments[0].id)}
                onChangeText={(text) => updateCaraGroup(group, text)}
                onSplit={(caretIndex) => splitCaraGroup(group, caretIndex)}
                onNewDefaultBlock={(caretIndex) => splitCaraGroupToDefault(group, caretIndex)}
                onCursor={(caretIndex) => onCursorMarker?.(markerAtGroupCaret(group, caretIndex))}
                onChangeSpeaker={(speakerId) => onChangeSegments(group.segments.map((segment) => ({ id: segment.id, patch: { speakerId } })))}
                onEditSpeaker={() => onEditSpeaker(group.speakerId)}
                onExportAudio={() => onExportAudioBlock?.({
                  startMs: group.segments[0]?.startMs || 0,
                  endMs: group.segments[group.segments.length - 1]?.endMs || 0,
                  label: `block-${group.segments[0]?.id || 'audio'}`,
                })}
                onDelete={() => onDeleteSegments(group.segments.map((segment) => segment.id))}
                onAddSpeaker={() => onAddSpeaker(group.segments[0].id)}
              />
            );
          })}
        </div>
        {isPlaying && !autoSync && (
          <button className="sync-playback-button" type="button" onClick={onResumeSync}>
            Sync to playback
          </button>
        )}
        <MarkerRail markers={markerPositions} onSeekMarker={onSeekMarker} />
        {(!layoutReady || loading) && <LoadingOverlay label={loading ? 'Switching view' : 'Loading editor'} />}
      </main>
    );
  }

  return (
    <main className={`transcript-pane ${!layoutReady ? 'is-preparing' : ''}`}>
      <div className="transcript-head">
        <span>Timecode</span><span>Speaker</span><span>Transcript</span><span></span>
      </div>
      <div className="transcript-rows" ref={rowsRef} onScroll={handleScroll} onWheel={handleScroll}>
        {project.segments.map((segment) => (
          <TranscriptRow
            key={segment.id}
            refCallback={(node) => {
              if (node) rowRefs.current.set(segment.id, node);
              else rowRefs.current.delete(segment.id);
            }}
            segment={segment}
            speakers={project.speakers}
            active={segment.id === activeSegmentId}
            currentTime={currentTime}
            showWordFollow={showWordFollow}
            onFocus={() => onFocusSegment(segment.id)}
            onSeek={() => onSeekSegment(segment.id)}
            onChange={(patch) => onChangeSegment(segment.id, patch)}
            onDelete={() => onDeleteSegment(segment.id)}
            onCursor={(caretIndex) => onCursorMarker?.(markerAtSegmentCaret(segment, caretIndex))}
            onEditSpeaker={onEditSpeaker}
            onAddSpeaker={() => onAddSpeaker(segment.id)}
          />
        ))}
      </div>
      {isPlaying && !autoSync && (
        <button className="sync-playback-button" type="button" onClick={onResumeSync}>
          Sync to playback
        </button>
      )}
      <MarkerRail markers={markerPositions} onSeekMarker={onSeekMarker} />
      {(!layoutReady || loading) && <LoadingOverlay label={loading ? 'Switching view' : 'Loading editor'} />}
    </main>
  );
}

function LoadingOverlay({ label }) {
  return (
    <div className="main-loading-overlay" role="status" aria-live="polite">
      <span className="loading-dot" />
      <strong>{label}</strong>
    </div>
  );
}

function MarkerRail({ markers, onSeekMarker }) {
  if (!markers.length) return null;
  return (
    <div className="marker-rail" aria-label="Transcript markers">
      {markers.map((marker) => (
        <button
          key={marker.id}
          type="button"
          title={marker.label}
          style={{ top: `${marker.percent}%`, '--marker-color': marker.color }}
          onClick={() => onSeekMarker?.(marker)}
        />
      ))}
    </div>
  );
}

function TranscriptRow({ refCallback, segment, speakers, active, currentTime, showWordFollow, onFocus, onSeek, onChange, onDelete, onCursor, onEditSpeaker, onAddSpeaker }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article ref={refCallback} className={`transcript-row ${active ? 'active' : ''}`} onFocus={onFocus}>
      <button className="timecode" type="button" onClick={onSeek}>[{formatTime(segment.startMs)}]</button>
      <SpeakerMenu
        speakers={speakers}
        speakerId={segment.speakerId}
        onChangeSpeaker={(speakerId) => onChange({ speakerId })}
        onEditSpeaker={onEditSpeaker}
        onAddSpeaker={onAddSpeaker}
      />
      <div className="transcript-text-cell">
        <AutoResizeTextarea value={segment.text} active={active} onFocus={onFocus} onCursor={onCursor} onChange={(text) => onChange({ text })} />
        {active && showWordFollow && <WordFollow segment={segment} currentTime={currentTime} />}
      </div>
      <div className="row-actions">
        <button className="icon-button row-menu-button" type="button" aria-label="Line actions" onClick={() => setMenuOpen((value) => !value)}><MoreHorizontal size={15} /></button>
        {menuOpen && (
          <div className="row-action-menu">
            <button type="button" onClick={() => { setMenuOpen(false); onDelete(); }}><Trash2 size={13} /> Delete line</button>
          </div>
        )}
      </div>
    </article>
  );
}

function CaraPlainBlock({ refCallback, group, speakers, active, activeSegmentId, currentTime, isPlaying, onSeekTime, onTogglePlay, onNextSegment, onFocus, onChangeText, onSplit, onNewDefaultBlock, onCursor, onChangeSpeaker, onEditSpeaker, onExportAudio, onDelete, onAddSpeaker }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [draftText, setDraftText] = useState(group.text);
  const displayGroup = useMemo(() => groupWithDraftText(group, draftText), [group, draftText]);

  useEffect(() => {
    setDraftText(group.text);
  }, [group.text]);

  return (
    <section ref={refCallback} className={`kara-plain-block ${active ? 'active' : ''}`} onFocus={onFocus}>
      <div className="kara-label-line">
        <SpeakerMenu
          speakers={speakers}
          speakerId={group.speakerId}
          onChangeSpeaker={onChangeSpeaker}
          onEditSpeaker={onEditSpeaker}
          onAddSpeaker={onAddSpeaker}
        />
      </div>
      <div className="kara-block-actions">
        {active && (
          <BlockMiniPlayer
            group={group}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onSeekTime={onSeekTime}
            onTogglePlay={onTogglePlay}
            onNextSegment={onNextSegment}
          />
        )}
        <button className="icon-button kara-block-menu-button" type="button" aria-label="Cara paragraph actions" onClick={() => setMenuOpen((value) => !value)}><MoreHorizontal size={15} /></button>
        {menuOpen && (
          <div className="row-action-menu kara-action-menu">
            <button type="button" onClick={() => { setMenuOpen(false); onEditSpeaker(); }}>Edit speaker</button>
            <button type="button" onClick={() => { setMenuOpen(false); onExportAudio(); }}>Export block audio</button>
            <button type="button" onClick={() => { setMenuOpen(false); onDelete(); }}><Trash2 size={13} /> Delete paragraph</button>
          </div>
        )}
      </div>
      <div className="kara-text-stack">
        <CaraHighlightLayer group={displayGroup} active={active} activeSegmentId={activeSegmentId} />
        <AutoResizeTextarea
          value={group.text}
          active={active}
          className="kara-plain-textarea"
          onFocus={onFocus}
          onCursor={onCursor}
          onDraftChange={setDraftText}
          onChange={onChangeText}
          onEnterSplit={onSplit}
          onShiftEnter={onNewDefaultBlock}
        />
      </div>
    </section>
  );
}

function BlockMiniPlayer({ group, currentTime, isPlaying, onSeekTime, onTogglePlay, onNextSegment }) {
  const startMs = group.segments[0]?.startMs || 0;
  const endMs = group.segments[group.segments.length - 1]?.endMs || startMs + 1;
  const actualMs = currentTime * 1000;
  const currentInsideBlock = actualMs >= startMs && actualMs <= endMs;
  const currentMs = Math.min(endMs, Math.max(startMs, actualMs));
  const progress = ((currentMs - startMs) / Math.max(1, endMs - startMs)) * 100;

  function playThisBlock() {
    if (isPlaying) {
      onTogglePlay?.();
      return;
    }
    if (!currentInsideBlock) onSeekTime?.(startMs);
    onTogglePlay?.();
  }

  function nextBit() {
    const current = group.segments.find((segment) => currentMs >= segment.startMs && currentMs <= segment.endMs);
    const index = group.segments.findIndex((segment) => segment.id === current?.id);
    const next = group.segments[index + 1];
    if (next) onSeekTime?.(next.startMs);
    else onNextSegment?.();
  }

  return (
    <div className="block-mini-player">
      <button type="button" title="Start paragraph" onClick={() => onSeekTime?.(startMs)}><RotateCcw size={13} /></button>
      <button type="button" title={isPlaying ? 'Pause' : 'Play this paragraph'} onClick={playThisBlock}>{isPlaying ? <Pause size={13} /> : <Play size={13} />}</button>
      <BlockMiniPlayhead
        startMs={startMs}
        endMs={endMs}
        currentMs={currentMs}
        progress={progress}
        onSeekTime={onSeekTime}
      />
      <button type="button" title="Next bit" onClick={nextBit}><SkipForward size={13} /></button>
    </div>
  );
}

function BlockMiniPlayhead({ startMs, endMs, currentMs, progress, onSeekTime }) {
  const railRef = useRef(null);
  const [hover, setHover] = useState(null);

  function pointerInfo(event) {
    const rect = railRef.current?.getBoundingClientRect();
    if (!rect) return { timeMs: currentMs, left: 0 };
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    return { timeMs: startMs + (endMs - startMs) * ratio, left: ratio * 100 };
  }

  function seek(event) {
    onSeekTime?.(pointerInfo(event).timeMs);
  }

  function updateHover(event) {
    setHover(pointerInfo(event));
  }

  return (
    <div
      ref={railRef}
      className="block-mini-playhead"
      role="slider"
      aria-label="Paragraph playhead"
      aria-valuemin={startMs}
      aria-valuemax={endMs}
      aria-valuenow={Math.round(currentMs)}
      tabIndex={0}
      style={{ '--progress': `${progress}%` }}
      onPointerDown={(event) => {
        seek(event);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        updateHover(event);
        if (event.buttons === 1) seek(event);
      }}
      onPointerLeave={() => setHover(null)}
    >
      {hover && <span className="block-mini-tooltip" style={{ left: `${hover.left}%` }}>{formatTime(hover.timeMs)}</span>}
    </div>
  );
}

function CaraHighlightLayer({ group, active, activeSegmentId }) {
  return (
    <div className={`kara-highlight-layer ${active ? 'active' : ''}`} aria-hidden="true">
      {group.segments.map((segment, index) => (
        <span key={segment.id} className={segment.id === activeSegmentId ? 'current-bit' : ''}>
          {index > 0 ? ' ' : ''}{segment.text}
        </span>
      ))}
    </div>
  );
}

function AutoResizeTextarea({ value, active, className = '', onFocus, onCursor, onDraftChange, onChange, onEnterSplit, onShiftEnter }) {
  const textareaRef = useRef(null);
  const commitTimerRef = useRef(0);
  const focusedRef = useRef(false);
  const [draft, setDraft] = useState(value);

  function resize() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const unlimited = textarea.classList.contains('kara-plain-textarea');
    textarea.style.height = unlimited
      ? `${Math.max(34, textarea.scrollHeight)}px`
      : `${Math.min(active ? 280 : 170, Math.max(46, textarea.scrollHeight))}px`;
  }

  function commit(nextValue = draft) {
    window.clearTimeout(commitTimerRef.current);
    if (nextValue !== value) onChange(nextValue);
  }

  function scheduleCommit(nextValue) {
    window.clearTimeout(commitTimerRef.current);
    commitTimerRef.current = window.setTimeout(() => onChange(nextValue), 180);
  }

  function reportCursor(event, sync = false) {
    onCursor?.({ caretIndex: event.currentTarget.selectionStart ?? 0, sync });
  }

  useEffect(() => {
    if (focusedRef.current) return;
    setDraft(value);
    onDraftChange?.(value);
  }, [value]);

  useEffect(() => () => window.clearTimeout(commitTimerRef.current), []);

  useLayoutEffect(() => {
    resize();
  }, [draft, active]);

  return (
    <textarea
      ref={textareaRef}
      className={className}
      rows={2}
      value={draft}
      onFocus={(event) => {
        focusedRef.current = true;
        onFocus?.(event);
        reportCursor(event, false);
      }}
      onBlur={() => {
        focusedRef.current = false;
        commit();
      }}
      onClick={(event) => reportCursor(event, true)}
      onKeyUp={(event) => reportCursor(event, false)}
      onSelect={(event) => reportCursor(event, false)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.shiftKey && onShiftEnter) {
          event.preventDefault();
          const caretIndex = event.currentTarget.selectionStart ?? draft.length;
          commit(draft);
          onShiftEnter(caretIndex);
          return;
        }
        if (event.key !== 'Enter' || event.shiftKey || !onEnterSplit) return;
        event.preventDefault();
        commit(draft);
        onEnterSplit(event.currentTarget.selectionStart ?? draft.length);
      }}
      onChange={(event) => {
        const nextValue = event.target.value;
        setDraft(nextValue);
        onDraftChange?.(nextValue);
        scheduleCommit(nextValue);
        window.requestAnimationFrame(resize);
      }}
    />
  );
}

function WordFollow({ segment, currentTime }) {
  const words = useMemo(() => timedWordsForSegment(segment), [segment]);
  if (!words.length) return null;

  const nowMs = currentTime * 1000;
  let activeIndex = words.findIndex((word) => nowMs >= word.startMs && nowMs <= word.endMs);
  if (activeIndex === -1) {
    const previous = words.findLastIndex((word) => nowMs >= word.endMs);
    activeIndex = previous >= 0 ? previous : 0;
  }

  const start = Math.max(0, activeIndex - 8);
  const end = Math.min(words.length, activeIndex + 12);
  const visibleWords = words.slice(start, end);

  return (
    <div className="word-follow" aria-label="Current words">
      {start > 0 && <span className="word-fade">…</span>}
      {visibleWords.map((word, offset) => {
        const index = start + offset;
        const className = index === activeIndex ? 'current' : index < activeIndex ? 'past' : '';
        return <span key={`${word.text}-${index}`} className={className}>{word.text}</span>;
      })}
      {end < words.length && <span className="word-fade">…</span>}
    </div>
  );
}

function makeMarkerPositions(project) {
  const segments = project.segments || [];
  const markers = project.markers || [];
  const first = segments[0]?.startMs || 0;
  const last = segments[segments.length - 1]?.endMs || first + 1;
  const duration = Math.max(1, last - first);
  return markers.map((marker) => {
    const segment = segments.find((item) => item.id === marker.segmentId);
    const ratio = Math.min(1, Math.max(0, Number(marker.ratio || 0)));
    const timeMs = segment
      ? segment.startMs + Math.max(0, segment.endMs - segment.startMs) * ratio
      : Number(marker.timeMs || first);
    return {
      ...marker,
      color: marker.color || '#9cff00',
      percent: Math.min(100, Math.max(0, ((timeMs - first) / duration) * 100)),
    };
  });
}

function makeCaraGroups(segments) {
  const groups = [];
  for (const segment of segments.filter((item) => String(item.text || item.caraText || '').trim() || item.isDraftBlock)) {
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
  return groups.map((group) => ({ ...group, text: caraGroupText(group.segments) }));
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

function distributeTextAcrossSegments(text, segments) {
  if (segments.length <= 1) return [text];
  const cleanText = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleanText) return segments.map(() => '');

  const originalLengths = segments.map((segment) => Math.max(1, String(segment.text || '').trim().length));
  const totalOriginal = originalLengths.reduce((sum, value) => sum + value, 0);
  const words = cleanText.split(/\s+/);
  const parts = [];
  let wordStart = 0;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const targetRatio = originalLengths.slice(0, index + 1).reduce((sum, value) => sum + value, 0) / totalOriginal;
    const targetWord = Math.max(wordStart + 1, Math.round(words.length * targetRatio));
    parts.push(words.slice(wordStart, Math.min(targetWord, words.length)).join(' '));
    wordStart = Math.min(targetWord, words.length);
  }
  parts.push(words.slice(wordStart).join(' '));
  return parts;
}

function segmentAtGroupCaret(group, caretIndex) {
  let cursor = 0;
  for (const segment of group.segments) {
    const text = String(segment.text || '').trim();
    const end = cursor + text.length;
    if (caretIndex <= end) return { segment, offset: Math.max(0, caretIndex - cursor) };
    cursor = end + 1;
  }
  const last = group.segments[group.segments.length - 1];
  return { segment: last, offset: String(last?.text || '').length };
}

function groupWithDraftText(group, draftText) {
  const parts = distributeTextAcrossSegments(draftText, group.segments);
  return {
    ...group,
    text: draftText,
    segments: group.segments.map((segment, index) => ({ ...segment, text: parts[index] || '' })),
  };
}

function markerAtGroupCaret(group, cursor) {
  const caretIndex = typeof cursor === 'object' ? cursor.caretIndex : cursor;
  const target = segmentAtGroupCaret(group, caretIndex);
  return markerAtSegmentCaret(target.segment, { caretIndex: target.offset, sync: Boolean(cursor?.sync) });
}

function markerAtSegmentCaret(segment, cursor) {
  const caretIndex = typeof cursor === 'object' ? cursor.caretIndex : cursor;
  const sync = typeof cursor === 'object' ? Boolean(cursor.sync) : false;
  const text = String(segment?.text || '');
  const textLength = Math.max(1, text.length);
  const safeCaret = Math.min(text.length, Math.max(0, caretIndex));
  const ratio = Math.min(1, Math.max(0, safeCaret / textLength));
  const timeMs = Math.round(Number(segment?.startMs || 0) + Math.max(0, Number(segment?.endMs || 0) - Number(segment?.startMs || 0)) * ratio);
  const before = text.slice(Math.max(0, safeCaret - 18), safeCaret).trimStart();
  const after = text.slice(safeCaret, safeCaret + 28).trimEnd();
  const snippet = `${before}${before && after ? '|' : ''}${after}`.replace(/\s+/g, ' ').trim();
  return { segmentId: segment?.id || null, caretIndex: safeCaret, ratio, timeMs, snippet, sync };
}

function timedWordsForSegment(segment) {
  if (Array.isArray(segment.words) && segment.words.length) {
    return segment.words
      .map((word) => ({
        text: String(word.text || word.word || '').trim(),
        startMs: Number(word.startMs ?? word.start ?? segment.startMs),
        endMs: Number(word.endMs ?? word.end ?? segment.endMs),
      }))
      .filter((word) => word.text);
  }

  const parts = String(segment.text || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return [];
  const duration = Math.max(600, segment.endMs - segment.startMs);
  const slice = duration / parts.length;
  return parts.map((part, index) => ({
    text: part,
    startMs: segment.startMs + (slice * index),
    endMs: segment.startMs + (slice * (index + 1)),
  }));
}
