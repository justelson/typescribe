import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { validateBenchmarkData } from '../landing/src/features/benchmark/benchmarkData.js';
import { methodologyPages } from '../landing/src/features/benchmark/methodology/methodologyPages.js';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const source = path.join(root, 'landing');
const target = path.join(root, 'dist-landing');
const benchmarkDataPath = path.join(source, 'benchmark', 'benchmark-data.json');
const allowedExtensions = new Set(['.css', '.html', '.ico', '.jpeg', '.jpg', '.js', '.jsx', '.json', '.mjs', '.png', '.svg', '.ttf', '.webp', '.woff', '.woff2']);
const textExtensions = new Set(['.css', '.html', '.js', '.jsx', '.json', '.mjs', '.svg']);

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(fullPath) : [fullPath];
  }));
  return nested.flat();
}

async function validatePublicTree() {
  const files = await filesUnder(source);
  for (const file of files) {
    const extension = path.extname(file).toLowerCase();
    const relative = path.relative(source, file).replaceAll('\\', '/');
    if (!allowedExtensions.has(extension)) {
      throw new Error(`Landing build rejected unapproved public file type: ${relative}`);
    }
    if (extension === '.json' && path.resolve(file) !== path.resolve(benchmarkDataPath)) {
      throw new Error(`Landing build rejected unapproved public JSON: ${relative}`);
    }
    if (textExtensions.has(extension)) {
      const content = await readFile(file, 'utf8');
      if (/(?:[a-z]:[\\/](?:users|home)[\\/]|\/(?:users|home)\/[^/\\\s\"'`]+[\\/])/i.test(content)) {
        throw new Error(`Landing build rejected a local filesystem path in: ${relative}`);
      }
    }
  }

  const benchmarkData = JSON.parse(await readFile(benchmarkDataPath, 'utf8'));
  validateBenchmarkData(benchmarkData);
}

await validatePublicTree();
await build({ configFile: path.join(root, 'vite.landing.config.js') });

const homeHtml = await readFile(path.join(target, 'index.html'), 'utf8');
const routePages = [
  {
    directory: 'benchmark',
    title: 'TypeScribe Bench',
    description: 'TypeScribe Bench compares speech-to-text APIs on English and Swahili-English audio using privacy-safe aggregate results.',
  },
  {
    directory: 'downloads',
    title: 'TypeScribe Releases',
    description: 'Browse TypeScribe releases and download installers by operating system.',
  },
  ...methodologyPages.map((page) => ({
    directory: page.path.replace(/^\/+|\/+$/g, ''),
    title: `${page.title} · TypeScribe Bench`,
    description: page.description,
  })),
];

for (const page of routePages) {
  const pageDirectory = path.join(target, page.directory);
  const html = homeHtml
    .replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(" \/>)/, `$1${page.description}$2`);
  await mkdir(pageDirectory, { recursive: true });
  await writeFile(path.join(pageDirectory, 'index.html'), html);
}

await cp(benchmarkDataPath, path.join(target, 'benchmark', 'benchmark-data.json'));
console.log(`Landing built at ${target}`);
