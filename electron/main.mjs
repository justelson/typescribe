import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, Menu, app as electronApp, dialog, ipcMain, screen, shell } from 'electron';
import { startServer } from '../server/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4177);
let mainWindow = null;
let apiServer = null;

function getWindowState() {
  if (!mainWindow) return { maximized: false, fullscreen: false, focused: false };
  return {
    maximized: mainWindow.isMaximized(),
    fullscreen: mainWindow.isFullScreen(),
    focused: mainWindow.isFocused(),
  };
}

function sendWindowState() {
  mainWindow?.webContents.send('deepgram-scribe:window-state', getWindowState());
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Find / Replace', accelerator: 'CmdOrCtrl+F', click: () => mainWindow?.webContents.send('deepgram-scribe:command', 'find') },
        { label: 'Export…', accelerator: 'CmdOrCtrl+E', click: () => mainWindow?.webContents.send('deepgram-scribe:command', 'export') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Playback',
      submenu: [
        { label: 'Play / Pause', click: () => mainWindow?.webContents.send('deepgram-scribe:command', 'toggle-play') },
        { label: 'Add Marker', accelerator: 'CmdOrCtrl+M', click: () => mainWindow?.webContents.send('deepgram-scribe:command', 'add-marker') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Rows View', accelerator: 'CmdOrCtrl+1', click: () => mainWindow?.webContents.send('deepgram-scribe:command', 'rows-view') },
        { label: 'Cara View', accelerator: 'CmdOrCtrl+2', click: () => mainWindow?.webContents.send('deepgram-scribe:command', 'cara-view') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'togglefullscreen' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function ensureApiServer() {
  try {
    apiServer = await startServer({ serveClient: true });
  } catch (error) {
    if (error?.code !== 'EADDRINUSE') throw error;
    console.log(`TypeScribe server already listening at http://${host}:${port}`);
  }
}

async function createWindow() {
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.min(1440, Math.max(1100, Math.floor(workArea.width * 0.9)));
  const height = Math.min(920, Math.max(720, Math.floor(workArea.height * 0.88)));

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#242724',
    title: 'TypeScribe',
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('maximize', sendWindowState);
  mainWindow.on('unmaximize', sendWindowState);
  mainWindow.on('enter-full-screen', sendWindowState);
  mainWindow.on('leave-full-screen', sendWindowState);
  mainWindow.on('focus', sendWindowState);
  mainWindow.on('blur', sendWindowState);
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    sendWindowState();
  });

  await mainWindow.loadURL(`http://${host}:${port}`);
}

ipcMain.handle('deepgram-scribe:app-info', () => ({
  name: 'TypeScribe',
  port,
}));

ipcMain.handle('deepgram-scribe:window-state', () => getWindowState());

ipcMain.handle('deepgram-scribe:window-control', (_event, action) => {
  if (!mainWindow) return getWindowState();
  if (action === 'minimize') mainWindow.minimize();
  if (action === 'maximize-toggle') {
    if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
    else if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
  if (action === 'close') mainWindow.close();
  return getWindowState();
});

ipcMain.handle('deepgram-scribe:open-external', async (_event, url) => {
  if (typeof url !== 'string' || !url) return { success: false, error: 'URL is required.' };
  await shell.openExternal(url);
  return { success: true };
});

ipcMain.handle('deepgram-scribe:save-text-file', async (_event, options = {}) => {
  const content = typeof options.content === 'string' ? options.content : '';
  const defaultPath = typeof options.defaultPath === 'string' && options.defaultPath ? options.defaultPath : 'typescribe-export.txt';
  const filters = Array.isArray(options.filters) ? options.filters : [{ name: 'Text', extensions: ['txt'] }];
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export TypeScribe file',
    defaultPath,
    filters,
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await writeFile(result.filePath, content, 'utf8');
  return { success: true, filePath: result.filePath };
});

electronApp.whenReady().then(async () => {
  createMenu();
  await ensureApiServer();
  await createWindow();

  electronApp.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

electronApp.on('before-quit', () => {
  apiServer?.close?.();
});

electronApp.on('window-all-closed', () => {
  if (process.platform !== 'darwin') electronApp.quit();
});
