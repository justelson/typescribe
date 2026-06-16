import {
  ChevronLeft,
  ChevronRight,
  FastForward,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  Rewind,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { formatTime, getSpeaker } from '../utils/transcript.js';

export function PlayerPane({
  project,
  settings,
  activeSegment,
  currentTime,
  durationSeconds,
  isPlaying,
  audioRef,
  shortcutHud,
  collapsed,
  onLoadedMetadata,
  onTimeChange,
  onPlayStateChange,
  onTogglePlay,
  onStop,
  onSeekBy,
  onSeekTo,
  onPreviousSegment,
  onNextSegment,
  onToggle,
}) {
  const progress = durationSeconds > 0 ? Math.min(100, Math.max(0, (currentTime / durationSeconds) * 100)) : 0;

  const audioElement = project.mediaUrl && (
    <audio
      ref={audioRef}
      src={project.mediaUrl}
      onLoadedMetadata={onLoadedMetadata}
      onTimeUpdate={(event) => onTimeChange(event.currentTarget.currentTime)}
      onPlay={() => onPlayStateChange(true)}
      onPause={() => onPlayStateChange(false)}
      onEnded={() => onPlayStateChange(false)}
    />
  );

  if (collapsed) {
    return (
      <aside className="player-pane collapsed-pane player-collapsed-controls">
        {audioElement}
        <button type="button" title="Expand player" onClick={onToggle}><PanelLeftOpen size={16} /></button>
        <button type="button" title={isPlaying ? 'Pause' : 'Play'} onClick={onTogglePlay}>{isPlaying ? <Pause size={16} /> : <Play size={16} />}</button>
        <button type="button" title="Back 1 second" onClick={() => onSeekBy(-1)}>−1</button>
        <button type="button" title="Forward 1 second" onClick={() => onSeekBy(1)}>+1</button>
        <button type="button" title="Stop" onClick={onStop}><Square size={12} /></button>
        <span className="vertical-time">{formatTime(currentTime * 1000)}</span>
      </aside>
    );
  }

  const activeSpeaker = activeSegment ? getSpeaker(project, activeSegment.speakerId) : 'No speaker';

  return (
    <aside className="player-pane">
      {audioElement}
      <div className="pane-head">
        <span className="pane-title-media">{project.mediaName}</span>
        <button type="button" title="Collapse player" onClick={onToggle}><PanelLeftClose size={15} /></button>
      </div>
      <div className="file-line"><span>{project.title}</span><em>1x</em></div>

      <div className="time-display"><Volume2 size={20} /><strong>{formatTime(currentTime * 1000)}</strong></div>

      <PlayheadBar progress={progress} durationSeconds={durationSeconds} onSeekTo={onSeekTo} />
      <div className="ruler-labels"><span>00:00.00</span><span>{durationSeconds ? formatTime(durationSeconds * 1000) : project.duration}</span></div>

      <div className="big-controls">
        <button type="button" title="Back 5 seconds" onClick={() => onSeekBy(-5)}><Rewind size={20} /><span>-5s</span></button>
        <button className="play-button" type="button" title={isPlaying ? 'Pause playback' : 'Start playback'} onClick={onTogglePlay}>
          {isPlaying ? <Pause size={42} fill="currentColor" /> : <Play size={42} fill="currentColor" />}
        </button>
        <button type="button" title="Stop and return to start" onClick={onStop}><Square size={19} fill="currentColor" /><span>Stop</span></button>
      </div>

      <div className="small-controls">
        <button type="button" title="Previous transcript row" onClick={onPreviousSegment}>Row −</button>
        <button type="button" title="Back 1 second" onClick={() => onSeekBy(-1)}>−1s</button>
        <button type="button" title="Back 0.2 seconds" onClick={() => onSeekBy(-0.2)}>−0.2</button>
        <button type="button" title="Forward 0.2 seconds" onClick={() => onSeekBy(0.2)}>+0.2</button>
        <button type="button" title="Forward 1 second" onClick={() => onSeekBy(1)}>+1s</button>
        <button type="button" title="Next transcript row" onClick={onNextSegment}>Row +</button>
      </div>

      <section className="compact-panel">
        <div className="kv"><span>Active speaker</span><strong>{activeSpeaker}</strong></div>
        <div className="kv"><span>Model</span><strong>{settings.model}</strong></div>
        <div className="kv"><span>Rows</span><strong>{project.segments.length}</strong></div>
        <div className="kv"><span>Audio</span><strong>{project.mediaUrl ? 'Loaded' : 'Demo only'}</strong></div>
      </section>
      <ShortcutHud value={shortcutHud} />
    </aside>
  );
}

function ShortcutHud({ value }) {
  return (
    <div className={`shortcut-hud ${value ? 'visible' : ''}`}>
      {value ? (
        <>
          <strong>{value.label}</strong>
          <span>{value.detail}</span>
        </>
      ) : (
        <>
          <strong>Space</strong>
          <span>Play / pause</span>
        </>
      )}
    </div>
  );
}

function PlayheadBar({ progress, durationSeconds, onSeekTo }) {
  const barRef = useRef(null);
  const [hover, setHover] = useState(null);

  function pointerToTime(event) {
    const node = barRef.current;
    if (!node || !durationSeconds) return 0;
    const rect = node.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    return ratio * durationSeconds;
  }

  function updateHover(event) {
    if (!durationSeconds) return;
    const node = barRef.current;
    const rect = node?.getBoundingClientRect();
    if (!node || !rect) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setHover({ time: ratio * durationSeconds, left: ratio * 100 });
  }

  function seekFromPointer(event) {
    if (!durationSeconds) return;
    onSeekTo(pointerToTime(event));
  }

  function startDrag(event) {
    seekFromPointer(event);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  return (
    <div
      ref={barRef}
      className="playhead-bar"
      role="slider"
      aria-label="Playback position"
      aria-valuemin="0"
      aria-valuemax={durationSeconds || 0}
      aria-valuenow={Math.round((progress / 100) * (durationSeconds || 0))}
      tabIndex={0}
      style={{ '--progress': `${progress}%` }}
      onPointerDown={startDrag}
      onPointerMove={(event) => {
        updateHover(event);
        if (event.buttons === 1) seekFromPointer(event);
      }}
      onPointerLeave={() => setHover(null)}
    >
      {hover && <span className="playhead-tooltip" style={{ left: `${hover.left}%` }}>{formatTime(hover.time * 1000)}</span>}
    </div>
  );
}
