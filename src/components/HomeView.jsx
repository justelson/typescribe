import { FileAudio, FilePlus2, ListFilter, Search, Settings, Users } from 'lucide-react';
import { useRef, useState } from 'react';

export function HomeView({ projects, settings, onOpenProject, onCreateProject, onOpenSettings }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const filteredProjects = projects.filter((project) => `${project.title} ${project.mediaName}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="page home-page">
      <header className="page-bar">
        <div className="app-title"><FileAudio size={18} /><strong>TypeScribe</strong></div>
        <div className="bar-actions">
          <button type="button" onClick={onOpenSettings}><Settings size={15} /> Settings</button>
          <input ref={inputRef} className="hidden-input" type="file" accept="audio/*,video/*" onChange={(event) => onCreateProject(event.target.files?.[0])} />
          <button className="primary" type="button" onClick={() => inputRef.current?.click()}><FilePlus2 size={15} /> New transcript</button>
        </div>
      </header>

      <div className="home-layout">
        <section className="project-table-panel">
          <div className="table-toolbar">
            <label className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" /></label>
            <span><ListFilter size={14} /> {filteredProjects.length} shown</span>
          </div>
          <div className="project-table" role="table" aria-label="Recent transcript projects">
            <div className="project-table-head" role="row">
              <span>Project</span><span>Media</span><span>Length</span><span>Speakers</span><span>Status</span><span>Updated</span>
            </div>
            {filteredProjects.map((project) => (
              <button key={project.id} className="project-table-row" type="button" role="row" onClick={() => onOpenProject(project.id)}>
                <span><FileAudio size={14} /> <strong>{project.title}</strong></span>
                <span>{project.mediaName}</span>
                <span className="mono">{project.duration}</span>
                <span><Users size={14} /> {project.speakers.length}</span>
                <span>{project.status}</span>
                <span>{project.updatedAt}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="status-column">
          <section className="side-section">
            <h2>Transcription</h2>
            <div className="kv"><span>Provider</span><strong>Deepgram</strong></div>
            <div className="kv"><span>Model</span><strong>{settings.model}</strong></div>
            <div className="kv"><span>Speakers</span><strong>{settings.diarization ? 'Detect' : 'Off'}</strong></div>
            <div className="kv"><span>Language</span><strong>{settings.language}</strong></div>
          </section>
          <section className="side-section">
            <h2>Editor</h2>
            <p>Open any project to edit rows, switch to Cara view, and export the transcript without timestamps.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}
