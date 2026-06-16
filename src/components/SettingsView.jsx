import { ArrowLeft, Mic2, Settings } from 'lucide-react';

export function SettingsView({ settings, setSettings, onBack }) {
  function update(key, value) {
    setSettings({ ...settings, [key]: value });
  }

  return (
    <section className="page settings-page">
      <header className="page-bar">
        <button type="button" onClick={onBack}><ArrowLeft size={15} /> Projects</button>
        <div className="app-title"><Settings size={18} /><strong>Settings</strong></div>
      </header>
      <main className="settings-table">
        <div className="settings-row"><label>Deepgram key status</label><input value={settings.deepgramStatus} onChange={(event) => update('deepgramStatus', event.target.value)} /></div>
        <div className="settings-row"><label>Default model</label><select value={settings.model} onChange={(event) => update('model', event.target.value)}><option>whisper-large</option><option>nova-3</option><option>nova-3-general</option><option>nova-2</option></select></div>
        <div className="settings-row"><label>Language</label><select value={settings.language} onChange={(event) => update('language', event.target.value)}><option>Detect automatically</option><option>Kiswahili</option><option>English</option><option>Spanish</option><option>French</option></select></div>
        <div className="settings-row"><label>Export preset</label><select value={settings.exportFormat} onChange={(event) => update('exportFormat', event.target.value)}><option>Cara MD + SRT</option><option>Cara MD only</option><option>SRT + TXT</option></select></div>
        <div className="settings-row"><label>Speaker detection</label><button className={settings.diarization ? 'primary' : ''} type="button" onClick={() => update('diarization', !settings.diarization)}><Mic2 size={15} /> {settings.diarization ? 'Enabled' : 'Disabled'}</button></div>
        <div className="settings-row"><label>Word follow strip</label><button className={settings.wordFollow ? 'primary' : ''} type="button" onClick={() => update('wordFollow', !settings.wordFollow)}>{settings.wordFollow ? 'Shown' : 'Hidden'}</button></div>
        <div className="settings-row shortcuts-settings-row">
          <label>Shortcuts</label>
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
      </main>
    </section>
  );
}
