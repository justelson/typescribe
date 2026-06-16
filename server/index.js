import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import express from 'express';
import multer from 'multer';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const clientDistDir = path.join(projectRoot, 'dist');
const app = express();
let serverInstance = null;
const port = Number(process.env.PORT || 4177);
const userHome = process.env.USERPROFILE || process.env.HOME || process.cwd();
const tempRoot = path.join(userHome, 'AppData', 'Local', 'Temp', 'typescribe');
const upload = multer({ dest: path.join(tempRoot, 'uploads') });
const mediaDir = process.env.TYPESCRIBE_MEDIA_DIR || path.join(tempRoot, 'media');

app.use(express.json({ limit: '2mb' }));
app.use('/assets', express.static(path.join(clientDistDir, 'assets')));
app.use('/fonts', express.static(path.join(clientDistDir, 'fonts')));
app.use('/demo', express.static(path.join(clientDistDir, 'demo')));
app.get('/', (_req, res) => res.sendFile(path.join(clientDistDir, 'index.html')));
app.get('/projects', (_req, res) => res.sendFile(path.join(clientDistDir, 'index.html')));
app.get('/settings', (_req, res) => res.sendFile(path.join(clientDistDir, 'index.html')));
app.get('/editor/:projectId', (_req, res) => res.sendFile(path.join(clientDistDir, 'index.html')));

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function deepgramWordsToEditorWords(words = []) {
  return words
    .map((word) => ({
      text: String(word?.punctuated_word || word?.word || '').trim(),
      startMs: Math.round(Number(word?.start || 0) * 1000),
      endMs: Math.max(Math.round(Number(word?.end || 0) * 1000), Math.round(Number(word?.start || 0) * 1000) + 80),
    }))
    .filter((word) => word.text);
}

function deepgramToEditorPayload(data) {
  const utterances = data?.results?.utterances || [];
  const speakersSeen = [];
  for (const item of utterances) {
    const speaker = item?.speaker;
    if (!speakersSeen.includes(speaker)) speakersSeen.push(speaker);
  }

  const speakers = speakersSeen.map((speaker, index) => ({
    id: `speaker_${speaker}`,
    name: index === 0 ? 'I' : `P${index}`,
    deepgramSpeaker: speaker,
  }));

  const segments = utterances
    .map((item, index) => ({
      id: `seg_${index + 1}`,
      startMs: Math.round(Number(item.start || 0) * 1000),
      endMs: Math.max(Math.round(Number(item.end || 0) * 1000), Math.round(Number(item.start || 0) * 1000) + 350),
      speakerId: `speaker_${item.speaker}`,
      text: String(item.transcript || '').trim(),
      words: deepgramWordsToEditorWords(item.words || []),
    }))
    .filter((segment) => segment.text);

  if (!segments.length) {
    const alternative = data?.results?.channels?.[0]?.alternatives?.[0] || {};
    const transcript = alternative.transcript || '';
    speakers.push({ id: 'speaker_0', name: 'I', deepgramSpeaker: 0 });
    segments.push({
      id: 'seg_1',
      startMs: 0,
      endMs: Math.round(Number(data?.metadata?.duration || 1) * 1000),
      speakerId: 'speaker_0',
      text: transcript || 'No transcript returned.',
      words: deepgramWordsToEditorWords(alternative.words || []),
    });
  }

  return {
    speakers,
    segments,
    durationSeconds: Number(data?.metadata?.duration || 0),
    requestId: data?.metadata?.request_id || null,
  };
}

function safeFilename(value) {
  return String(value || 'audio-clip')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'audio-clip';
}

function deepgramUrl() {
  const url = new URL('https://api.deepgram.com/v1/listen');
  url.searchParams.set('model', process.env.DEEPGRAM_MODEL || 'whisper-large');
  url.searchParams.set('diarize', 'true');
  url.searchParams.set('utterances', 'true');
  url.searchParams.set('smart_format', 'true');
  if (process.env.DEEPGRAM_LANGUAGE && process.env.DEEPGRAM_LANGUAGE !== 'auto') {
    url.searchParams.set('language', process.env.DEEPGRAM_LANGUAGE);
  } else {
    url.searchParams.set('detect_language', 'true');
  }
  return url;
}

async function transcribeWithDeepgram(filePath, mimeType) {
  const apiKey = process.env.DEEPGRAM_API_KEY || process.env.DG_API_KEY;
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY is not set locally.');
  const media = await fs.readFile(filePath);
  const response = await fetch(deepgramUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': mimeType || 'application/octet-stream',
    },
    body: media,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.err_msg || data?.message || `Deepgram request failed with ${response.status}`);
  }
  return data;
}

app.get('/api/health', (_req, res) => {
  const configured = Boolean(process.env.DEEPGRAM_API_KEY || process.env.DG_API_KEY);
  res.json({
    ok: true,
    deepgram: {
      configured,
      defaultModel: process.env.DEEPGRAM_MODEL || 'whisper-large',
      diarization: true,
      models: [
        { id: 'whisper-large', label: 'Whisper Large' },
        { id: 'nova-3', label: 'Nova-3' },
        { id: 'nova-3-general', label: 'Nova-3 General' },
        { id: 'nova-2', label: 'Nova-2' },
      ],
    },
  });
});

app.post('/api/export-audio-clip', async (req, res) => {
  let outputPath = '';
  try {
    const mediaName = path.basename(String(req.body?.mediaName || ''));
    const startMs = Math.max(0, Number(req.body?.startMs || 0));
    const endMs = Math.max(startMs + 250, Number(req.body?.endMs || startMs + 1000));
    const title = safeFilename(req.body?.title || 'typescribe-block');
    const inputPath = path.join(mediaDir, mediaName);
    if (!mediaName || !(await exists(inputPath))) {
      throw new Error('Audio clip export needs a file in TYPESCRIBE_MEDIA_DIR. Text export still works without it.');
    }

    const durationSeconds = Math.max(0.25, (endMs - startMs) / 1000);
    outputPath = path.join(tempRoot, `${title}-${Date.now()}.mp3`);
    await execFileAsync('ffmpeg', [
      '-hide_banner',
      '-y',
      '-ss', String(startMs / 1000),
      '-i', inputPath,
      '-t', String(durationSeconds),
      '-vn',
      '-codec:a', 'libmp3lame',
      '-q:a', '2',
      outputPath,
    ], { timeout: 120000 });

    res.download(outputPath, `${title}.mp3`, async () => {
      if (outputPath) await fs.rm(outputPath, { force: true }).catch(() => {});
    });
  } catch (error) {
    if (outputPath) await fs.rm(outputPath, { force: true }).catch(() => {});
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to export audio clip.' });
  }
});

app.post('/api/transcribe', upload.single('media'), async (req, res) => {
  const uploaded = req.file;
  try {
    if (!uploaded) throw new Error('No media file was uploaded.');
    const data = await transcribeWithDeepgram(uploaded.path, uploaded.mimetype);
    const editorPayload = deepgramToEditorPayload(data);
    res.json({ success: true, ...editorPayload });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Transcription failed.' });
  } finally {
    if (uploaded?.path) await fs.rm(uploaded.path, { force: true }).catch(() => {});
  }
});

app.get('/api/projects', (_req, res) => {
  res.json({
    projects: [
      {
        id: 'demo-interview',
        title: 'Demo interview',
        duration: '03:20',
        updatedAt: 'Demo project',
        status: 'Ready',
        speakerCount: 3,
      },
    ],
  });
});

export async function startServer(options = {}) {
  if (serverInstance) return serverInstance;

  serverInstance = app.listen(port, '127.0.0.1', () => {
    console.log(`TypeScribe API listening at http://127.0.0.1:${port}`);
  });
  return serverInstance;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
