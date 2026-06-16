import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('deepgramScribeDesktop', {
  desktop: true,
  platform: process.platform,
  appInfo: () => ipcRenderer.invoke('deepgram-scribe:app-info'),
  windowState: () => ipcRenderer.invoke('deepgram-scribe:window-state'),
  windowControl: (action) => ipcRenderer.invoke('deepgram-scribe:window-control', action),
  openExternal: (url) => ipcRenderer.invoke('deepgram-scribe:open-external', url),
  saveTextFile: (options) => ipcRenderer.invoke('deepgram-scribe:save-text-file', options),
  onWindowState: (handler) => {
    if (typeof handler !== 'function') return () => {};
    const listener = (_event, state) => handler(state);
    ipcRenderer.on('deepgram-scribe:window-state', listener);
    return () => ipcRenderer.removeListener('deepgram-scribe:window-state', listener);
  },
  onCommand: (handler) => {
    if (typeof handler !== 'function') return () => {};
    const listener = (_event, command) => handler(command);
    ipcRenderer.on('deepgram-scribe:command', listener);
    return () => ipcRenderer.removeListener('deepgram-scribe:command', listener);
  },
});
