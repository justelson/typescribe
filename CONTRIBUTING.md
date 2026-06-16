# Contributing to TypeScribe

Thanks for helping improve TypeScribe.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev:web
npm run dev:api
```

For the desktop shell:

```bash
npm run desktop
```

## Checks

Before opening a pull request:

```bash
npm run check
```

## Pull request guidelines

- Keep changes scoped and explain the editing workflow affected.
- Do not commit private audio, transcripts, exported documents, API keys, or Electron local storage.
- Include screenshots or short screen recordings for UI changes when possible.
- Keep Cara view behavior aligned with Rows view timing: visible text can be edited as document text, while hidden timings support playback and export range logic.
