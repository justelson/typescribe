import { Check, ChevronDown, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function SpeakerMenu({ speakers, speakerId, onChangeSpeaker, onAddSpeaker }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = speakers.find((speaker) => speaker.id === speakerId) || speakers[0];

  useEffect(() => {
    function close(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);

  function choose(nextId) {
    onChangeSpeaker(nextId);
    setOpen(false);
  }

  return (
    <div className="speaker-menu" ref={rootRef}>
      <button className="speaker-trigger" type="button" onClick={() => setOpen((value) => !value)}>
        <span>{current?.name || 'Speaker'}</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="speaker-popover">
          {speakers.map((speaker) => (
            <button key={speaker.id} type="button" onClick={() => choose(speaker.id)}>
              <span>{speaker.name}</span>
              {speaker.id === speakerId && <Check size={13} />}
            </button>
          ))}
          <button className="speaker-add" type="button" onClick={() => { setOpen(false); onAddSpeaker(); }}>
            <Plus size={13} /> Add speaker
          </button>
        </div>
      )}
    </div>
  );
}
