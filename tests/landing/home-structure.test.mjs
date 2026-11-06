import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function source(relative) {
  return readFile(path.join(root, relative), 'utf8');
}

test('home preserves the bookends and adds only the approved transcript body', async () => {
  const home = await source('landing/src/pages/HomePage.jsx');
  const hero = await source('landing/src/features/home/HeroSection.jsx');
  const composition = [...home.matchAll(/<([A-Z]\w*)\s*\/>/g)].map((match) => match[1]);
  assert.deepEqual(composition, ['HeroSection', 'CapabilityMarquee', 'ProductPreviewSection', 'TranscriptWorkSection', 'TranscriptConfidenceSection']);
  assert.match(home, /styles\/transcript-story\.css/);
  assert.doesNotMatch(home, /DeskJourneySection|DeskManifestoSection|DeskGallerySection|ToolDeskSection|WorkflowSection|DeskPromiseSection|BenchmarkPreviewSection|InstallSection/);
  assert.doesNotMatch(home, /home-story\.css/);
  assert.doesNotMatch(hero, /href="#editor"|See Rows become Cara/);
  assert.match(hero, /Download for Windows/);
});

test('the public home composition uses transcript objects instead of standing character assets', async () => {
  const home = await source('landing/src/pages/HomePage.jsx');
  const story = await source('landing/src/features/home/DeskStorySections.jsx');
  const benchmarkPreview = await source('landing/src/features/home/BenchmarkPreviewSection.jsx');

  assert.doesNotMatch(`${home}\n${story}\n${benchmarkPreview}`, /character-(?:assistant|researcher|secretary|transcriptionist)/);
  assert.match(story, /transcript-desk-characters\.webp/);
  await access(path.join(root, 'landing/public/assets/transcript-desk-characters.webp'));
});
