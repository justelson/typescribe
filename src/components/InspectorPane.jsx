import { Download, Lock, MapPin, MoreHorizontal, PanelRightClose, PanelRightOpen, Plus, Trash2, Unlock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function InspectorPane({
  project,
  viewMode,
  onSetViewMode,
  positionLocked,
  onTogglePositionLock,
  onEditSpeaker,
  onMergeSpeaker,
  onDeleteSpeakerSegments,
  onAddMarker,
  onSeekMarker,
  onPreviousMarker,
  onNextMarker,
  onDeleteMarker,
  onDownloadTxt,
  onDownloadKara,
  onDownloadSrt,
  collapsed,
  onToggle,
}) {
  if (collapsed) {
    return (
      <aside className="inspector-pane collapsed-pane inspector-collapsed-controls">
        <button type="button" title="Expand inspector" onClick={onToggle}><PanelRightOpen size={16} /></button>
        <button className={viewMode === 'rows' ? 'selected' : ''} type="button" title="Rows" onClick={() => onSetViewMode('rows')}>R</button>
        <button className={viewMode === 'kara' ? 'selected' : ''} type="button" title="Cara view" onClick={() => onSetViewMode('kara')}>C</button>
        <button className={positionLocked ? 'selected' : ''} type="button" title={positionLocked ? 'Playhead locked to cursor' : 'Playhead unlocked'} onClick={onTogglePositionLock}>{positionLocked ? <Lock size={12} /> : <Unlock size={12} />}</button>
        <button type="button" title="Add marker" onClick={onAddMarker}><MapPin size={13} /></button>
      </aside>
    );
  }

  return (
    <aside className="inspector-pane">
      <div className="pane-head">
        <span>Inspector</span>
        <button type="button" title="Collapse inspector" onClick={onToggle}><PanelRightClose size={15} /></button>
      </div>

      <section className="compact-panel view-panel">
        <h2>View</h2>
        <div className="side-view-toggle" role="group" aria-label="Transcript view">
          <button className={viewMode === 'rows' ? 'selected' : ''} type="button" onClick={() => onSetViewMode('rows')}>Rows</button>
          <button className={viewMode === 'kara' ? 'selected' : ''} type="button" onClick={() => onSetViewMode('kara')}>Cara view</button>
        </div>
        <button className={`position-lock-button ${positionLocked ? 'selected' : ''}`} type="button" onClick={onTogglePositionLock}>
          {positionLocked ? <Lock size={13} /> : <Unlock size={13} />}
          {positionLocked ? 'Playhead locked to cursor' : 'Playhead unlocked'}
        </button>
      </section>

      <section className="compact-panel speaker-panel">
        <h2>Speakers</h2>
        <div className="speaker-list">
          {project.speakers.map((speaker) => (
            <SpeakerRow
              key={speaker.id}
              speaker={speaker}
              count={project.segments.filter((segment) => segment.speakerId === speaker.id).length}
              canMerge={project.speakers.length > 1}
              onRename={() => onEditSpeaker(speaker.id)}
              onMerge={() => onMergeSpeaker(speaker.id)}
              onDeleteSegments={() => onDeleteSpeakerSegments(speaker.id)}
            />
          ))}
        </div>
      </section>

      <section className="compact-panel marker-panel">
        <div className="panel-title-row">
          <h2><MapPin size={13} /> Markers</h2>
          <div className="marker-panel-actions">
            <button type="button" title="Previous marker" onClick={onPreviousMarker}>‹</button>
            <button type="button" title="Next marker" onClick={onNextMarker}>›</button>
            <button type="button" title="Add marker at current position" onClick={onAddMarker}><Plus size={13} /></button>
          </div>
        </div>
        <div className="marker-list">
          {(project.markers || []).length === 0 && <span className="empty-note">No markers yet</span>}
          {(project.markers || []).map((marker) => (
            <div className="marker-row" key={marker.id}>
              <button type="button" onClick={() => onSeekMarker(marker)}><span className="marker-color-dot" style={{ background: marker.color || '#9cff00' }} />{marker.label}</button>
              <button type="button" title="Delete marker" onClick={() => onDeleteMarker(marker.id)}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      </section>


      <section className="compact-panel export-panel inspector-footer-export">
        <h2><Download size={14} /> Export</h2>
        <button type="button" onClick={onDownloadTxt}>TXT</button>
        <button type="button" onClick={onDownloadSrt}>SRT</button>
        <button className="wide-export" type="button" onClick={onDownloadKara}>Cara MD</button>
      </section>
    </aside>
  );
}

function SpeakerRow({ speaker, count, canMerge, onRename, onMerge, onDeleteSegments }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function close(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);

  return (
    <div className="speaker-list-row" ref={rootRef}>
      <div className="speaker-row-main">
        <span>{speaker.name}</span>
        <em>{count}</em>
      </div>
      <button className="speaker-clear-button" type="button" title={`Delete all ${speaker.name} lines`} onClick={onDeleteSegments}>
        <Trash2 size={12} />
      </button>
      <button className="speaker-more-button" type="button" aria-label={`${speaker.name} actions`} onClick={() => setOpen((value) => !value)}>
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="speaker-action-menu">
          <button type="button" onClick={() => { setOpen(false); onRename(); }}>Rename speaker</button>
          <button type="button" disabled={!canMerge} onClick={() => { setOpen(false); onMerge(); }}>Merge speaker</button>
        </div>
      )}
    </div>
  );
}
