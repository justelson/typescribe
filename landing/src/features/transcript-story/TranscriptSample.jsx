import { useState } from 'react';
import { Download } from 'lucide-react';
import { demoExcerpt } from './demoExcerpt.js';
import { formatTime, getSpeaker, sampleExport, sampleFormats, sampleProject, sampleRanges } from './previewFormats.js';
import { saveSampleExport } from './saveSampleExport.js';

export function TranscriptSample({ view }) {
  const [format, setFormat] = useState('cara');
  const [range, setRange] = useState('all');
  const [notice, setNotice] = useState('');
  const output = sampleExport(format, range);
  const download = () => {
    try {
      saveSampleExport(output);
      setNotice('Sample file prepared for download.');
    } catch {
      setNotice('This browser could not prepare the sample download.');
    }
  };
  const changeFormat = (event) => { setFormat(event.target.value); setNotice(''); };
  const changeRange = (event) => { setRange(event.target.value); setNotice(''); };

  return (
    <div className="transcript-sample">
      <div className="transcript-sample-title"><span>{demoExcerpt.title}</span><span>Public demo excerpt</span></div>
      <div role="tabpanel" id="work-view-rows-panel" aria-labelledby="work-view-rows-tab" tabIndex="0" hidden={view !== 'rows'} className="transcript-sample-panel">
        <table aria-label="Timed rows from the public demo">
          <thead><tr><th scope="col">Time</th><th scope="col">Speaker</th><th scope="col">Transcript</th></tr></thead>
          <tbody>{sampleProject().segments.map((segment) => <tr key={segment.id}><td>{formatTime(segment.startMs)}</td><td>{getSpeaker(demoExcerpt, segment.speakerId)}</td><td>{segment.text}</td></tr>)}</tbody>
        </table>
        <p className="transcript-sample-note">Every line keeps its time and speaker.</p>
      </div>
      <div role="tabpanel" id="work-view-cara-panel" aria-labelledby="work-view-cara-tab" tabIndex="0" hidden={view !== 'cara'} className="transcript-sample-panel">
        <pre className="transcript-reading-copy">{sampleExport('cara').content}</pre>
        <p className="transcript-sample-note">The same seven rows, grouped into a conversation.</p>
      </div>
      <div role="tabpanel" id="work-view-export-panel" aria-labelledby="work-view-export-tab" tabIndex="0" hidden={view !== 'export'} className="transcript-sample-panel">
        <div className="transcript-export-controls">
          <label>Range<select value={range} onChange={changeRange} name="sample-range">{sampleRanges.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
          <label>Format<select value={format} onChange={changeFormat} name="sample-format">{sampleFormats.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
        </div>
        <pre className={`transcript-export-copy ${format === 'cara' ? 'is-reading-copy' : ''}`} role="region" aria-label="Sample export contents" tabIndex="0">{output.content}</pre>
        <div className="transcript-export-actions">
          <button type="button" onClick={download}><Download size={17} aria-hidden="true" />Download this sample</button>
          <span>Generated on this device.</span>
        </div>
        <p className="transcript-export-notice" role="status">{notice}</p>
      </div>
    </div>
  );
}
