import { Copy, Minus, Square, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EditorView } from './components/EditorView.jsx';
import { HomeView } from './components/HomeView.jsx';
import { SettingsView } from './components/SettingsView.jsx';
import { seedProjects, settingDefaults } from './data/projects.js';

const STORAGE_KEY = 'deepgram-scribe:v1';

function safeReadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

function routeFromPath() {
  const path = window.location.pathname;
  if (path.startsWith('/settings')) return { screen: 'settings', selectedId: null };
  if (path.startsWith('/projects')) return { screen: 'home', selectedId: null };
  const editorMatch = path.match(/^\/editor\/([^/]+)/);
  if (editorMatch) return { screen: 'editor', selectedId: decodeURIComponent(editorMatch[1]) };
  return null;
}

function sanitizeProjects(projects) {
  return projects.map(({ mediaFile, ...project }) => project);
}

function cloneProjects(projects) {
  return JSON.parse(JSON.stringify(sanitizeProjects(projects)));
}

export function App() {
  const desktopApi = typeof window !== 'undefined' ? window.deepgramScribeDesktop : null;
  const saved = useMemo(safeReadState, []);
  const initialRoute = routeFromPath();
  const initialSelectedId = initialRoute?.selectedId || saved.selectedId || seedProjects[0]?.id || null;
  const [screen, setScreen] = useState(initialRoute?.screen || (initialSelectedId ? 'editor' : 'home'));
  const [projects, setProjects] = useState(saved.projects?.length ? saved.projects : seedProjects);
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [settings, setSettings] = useState({ ...settingDefaults, ...(saved.settings || {}) });
  const [history, setHistory] = useState({ past: [], future: [] });
  const selectedProject = projects.find((project) => project.id === selectedId) || projects[0] || null;

  useEffect(() => {
    function onPopState() {
      const route = routeFromPath() || { screen: 'editor', selectedId: saved.selectedId || seedProjects[0]?.id || null };
      setScreen(route.screen);
      if (route.selectedId) setSelectedId(route.selectedId);
      if (route.screen !== 'editor') setSelectedId(route.selectedId);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [saved.selectedId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      projects: sanitizeProjects(projects),
      settings,
      selectedId,
    }));
  }, [projects, settings, selectedId]);

  function navigate(path, nextScreen, nextSelectedId = null) {
    window.history.pushState({}, '', path);
    setScreen(nextScreen);
    setSelectedId(nextSelectedId);
  }

  function openProject(id) {
    navigate(`/editor/${encodeURIComponent(id)}`, 'editor', id);
  }

  function closeProject() {
    navigate('/projects', 'home', null);
  }

  function updateProject(nextProject, options = {}) {
    const track = options.track !== false;
    setProjects((items) => {
      const nextItems = items.map((project) => project.id === nextProject.id ? nextProject : project);
      if (track) {
        setHistory((value) => ({
          past: [...value.past.slice(-49), cloneProjects(items)],
          future: [],
        }));
      }
      return nextItems;
    });
  }

  function undoProjectChange() {
    setHistory((value) => {
      if (!value.past.length) return value;
      const previous = value.past[value.past.length - 1];
      setProjects((current) => {
        const nextSelectedExists = previous.some((project) => project.id === selectedId);
        if (!nextSelectedExists) setSelectedId(previous[0]?.id || null);
        return previous;
      });
      return {
        past: value.past.slice(0, -1),
        future: [cloneProjects(projects), ...value.future].slice(0, 50),
      };
    });
  }

  function redoProjectChange() {
    setHistory((value) => {
      if (!value.future.length) return value;
      const next = value.future[0];
      setProjects((current) => {
        const nextSelectedExists = next.some((project) => project.id === selectedId);
        if (!nextSelectedExists) setSelectedId(next[0]?.id || null);
        return next;
      });
      return {
        past: [...value.past, cloneProjects(projects)].slice(-50),
        future: value.future.slice(1),
      };
    });
  }

  function createProject(file) {
    if (!file) return;
    const id = `project_${Date.now()}`;
    const title = file.name.replace(/\.[^.]+$/, '') || 'Untitled transcript';
    const project = {
      id,
      title,
      mediaName: file.name,
      duration: '00:00',
      updatedAt: 'Just now',
      status: 'Queued',
      notes: 'Run Deepgram to create speaker-timed transcript rows.',
      mediaUrl: URL.createObjectURL(file),
      mediaFile: file,
      speakers: [{ id: 'speaker_0', name: 'Speaker 0' }],
      segments: [
        { id: 'seg_1', startMs: 0, endMs: 3500, speakerId: 'speaker_0', text: 'New Deepgram transcript will appear here.' },
      ],
    };
    setProjects((items) => {
      setHistory((value) => ({ past: [...value.past.slice(-49), cloneProjects(items)], future: [] }));
      return [project, ...items];
    });
    openProject(id);
  }

  const appContent = (
    <main className="app-shell">
      {screen === 'home' && (
        <HomeView
          projects={projects}
          settings={settings}
          onOpenProject={openProject}
          onCreateProject={createProject}
          onOpenSettings={() => navigate('/settings', 'settings')}
        />
      )}
      {screen === 'settings' && <SettingsView settings={settings} setSettings={setSettings} onBack={() => navigate('/projects', 'home')} />}
      {screen === 'editor' && selectedProject && <EditorView project={selectedProject} updateProject={updateProject} settings={settings} setSettings={setSettings} canUndo={history.past.length > 0} canRedo={history.future.length > 0} onUndo={undoProjectChange} onRedo={redoProjectChange} onBack={closeProject} />}
      {screen === 'editor' && !selectedProject && (
        <HomeView projects={projects} settings={settings} onOpenProject={openProject} onCreateProject={createProject} onOpenSettings={() => navigate('/settings', 'settings')} />
      )}
    </main>
  );

  if (desktopApi?.desktop) {
    return (
      <section className="desktop-shell">
        <DesktopTitleBar desktopApi={desktopApi} title={selectedProject?.title || 'TypeScribe'} screen={screen} />
        <div className="desktop-workspace">{appContent}</div>
      </section>
    );
  }

  return appContent;
}

function DesktopTitleBar({ desktopApi, title, screen }) {
  const [windowState, setWindowState] = useState({ maximized: false, fullscreen: false });
  const expanded = windowState.maximized || windowState.fullscreen;

  useEffect(() => {
    let mounted = true;
    desktopApi.windowState?.().then((state) => {
      if (mounted && state) setWindowState(state);
    }).catch(() => {});
    const unsubscribe = desktopApi.onWindowState?.((state) => setWindowState(state || { maximized: false, fullscreen: false }));
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [desktopApi]);

  function control(action) {
    void desktopApi.windowControl?.(action).then((state) => {
      if (state) setWindowState(state);
    });
  }

  return (
    <header className="desktop-titlebar">
      <div className="desktop-title-main">
        <strong>{title}</strong>
        <span>{screen === 'editor' ? 'Saved locally' : 'TypeScribe'}</span>
      </div>
      <div className="desktop-window-controls" aria-label="Window controls">
        <button type="button" title="Minimize" aria-label="Minimize" onClick={() => control('minimize')}><Minus size={15} /></button>
        <button type="button" title={expanded ? 'Restore' : 'Maximize'} aria-label={expanded ? 'Restore' : 'Maximize'} onClick={() => control('maximize-toggle')}>
          {expanded ? <Copy size={13} /> : <Square size={13} />}
        </button>
        <button className="desktop-close" type="button" title="Close" aria-label="Close" onClick={() => control('close')}><X size={16} /></button>
      </div>
    </header>
  );
}
