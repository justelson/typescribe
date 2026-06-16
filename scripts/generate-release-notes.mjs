import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));

const notes = `# TypeScribe v${pkg.version}\n\n## Highlights\n\n- Local Electron transcript editor.\n- Deepgram-powered transcription endpoint.\n- Timed Rows view and document-style Cara view.\n- Playback highlighting, markers, find/replace, and export modal.\n- Export to Cara MD, timed TXT, SRT, and Word-readable DOC.\n\n## Install\n\nDownload the Windows installer from the release assets, or build locally:\n\n\`\`\`bash\nnpm install\nnpm run desktop\n\`\`\`\n\n## Notes\n\nSet \`DEEPGRAM_API_KEY\` locally before running transcription. Do not upload private audio/transcripts to public issues.\n`;

const outDir = path.join(root, 'dist');
await fs.mkdir(outDir, { recursive: true });
const out = path.join(outDir, `release-notes-v${pkg.version}.md`);
await fs.writeFile(out, notes, 'utf8');
console.log(out);
