# TypeScribe Architecture

TypeScribe is a small local desktop/web app with three layers:

1. **React renderer** in `src/`
   - project home, settings, editor, player, transcript rows, Cara document view, markers, find/replace, and export modal.
2. **Local Express server** in `server/`
   - health endpoint, Deepgram transcription endpoint, audio clip export helper, and built React route serving for Electron.
3. **Electron shell** in `electron/`
   - frameless desktop window, app menu, IPC bridge, native save dialog, and local server startup.

## Transcript model

The source project contains timed `segments`:

```js
{
  id: 'seg_1',
  startMs: 0,
  endMs: 8500,
  speakerId: 'speaker_1',
  text: 'Transcript text',
  words: []
}
```

Rows view edits timed segments directly.

Cara view groups adjacent segments by speaker and stores document-style overrides with:

- `caraText`
- `caraTextSegmentIds`

That lets Cara paragraphs be edited like document text while hidden timing segments still drive playback, highlighting, markers, and range export.

## Local persistence

TypeScribe currently uses localStorage keys that intentionally remain named `deepgram-scribe:*` to preserve compatibility with early local builds.

## Deepgram

`POST /api/transcribe` sends the uploaded media file to Deepgram using `DEEPGRAM_API_KEY`. The default model is `whisper-large`, which has worked better for Kiswahili in the original development tests.
