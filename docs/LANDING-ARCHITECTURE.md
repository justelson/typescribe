# Landing site architecture

The public TypeScribe website is a React and Tailwind multi-route Vite application rooted at `landing/`, with static entry documents for direct route visits.

## Public routes

- `/` — product landing page
- `/benchmark/` — TypeScribe Bench results
- `/benchmark/methodology/` — methodology overview
- `/benchmark/methodology/{corpus,models,capture,scoring,ranking,privacy}/` — focused methodology subpages
- `/downloads/` — releases and OS installers

`landing/index.html` is the only source HTML template. Vite serves it for every development route; the validated production build generates route-specific copies with the correct metadata. All entry documents mount `landing/src/main.jsx`. `App.jsx` defines lazy React Router routes beneath one persistent `SiteLayout`.

## Module boundaries

```text
landing/src/
  app/                  Client routes, internal-link classification, and route focus
  components/layout/    Shared header, footer, shell, and page chrome
  components/ui/        Shared buttons, reveal, and parallax primitives
  hooks/                Theme, media, header, metadata, reveal, and motion state
  features/home/        Hero, capability ribbon and retained section source
  features/transcript-story/  Approved product preview, safe excerpt and export UI
  features/benchmark/   Public contract, charts, ranking table, methodology pages, and sections
  features/releases/    GitHub data access, release domain logic, and archive UI
  pages/                Route composition only
  styles/               Shared tokens plus route-specific visual compositions
```

Page components orchestrate features. Data access and domain rules do not live in page markup.

The home route keeps `HeroSection` and the unmarked `CapabilityMarquee`, then renders the approved Vestris-informed `ProductPreviewSection`, `TranscriptWorkSection`, and `TranscriptConfidenceSection` before the router-owned footer. Elson's crossed-out journey, manifesto, gallery, tool grid, workflow, promise, benchmark preview, and install/build components remain unmounted and unimported. Their source files and shared assets are retained. The hero keeps its real Windows download and no orphaned `#editor` action. `home-story.css` remains unloaded.

`features/transcript-story/` separates screenshot/content records, accessible keyboard tabs, public sample data, domain formatting, user-initiated file downloads, and section rendering. `styles/transcript-story.css` is scoped to those sections, including both themes and reduced motion. The original `typescribe-paper-world.svg` surrounds the product and work compositions. It is deliberately not repeated in the closing section, where its clipped bottom edge would duplicate the footer artwork. The footer font and component layout are unchanged; Elson's later screenshot-directed artwork refinement adds reel detail and paints the existing green base in front of the lower paper and hands. Mobile screenshot details are crops of the existing public-demo screenshots, not invented mobile app screens.

The transcript explorer contains seven allowlisted segments of the synthetic public demo. It does not import the seed-project collection, benchmark transcripts, media, or provider responses. `previewFormats.js` reuses the app's unchanged `src/utils/transcript.js` formatters for Cara Markdown, timed text, and SRT. Range/format selectors update the visible output and the downloaded file together. Downloads are generated locally on explicit click, with no API request or persistence. This sample and the screenshot tabs are not a browser-hosted editor or transcription service.

## Shared design system

`styles/index.css` is the single source for:

- color and font tokens
- light/dark surfaces
- the continuous 36px page grid and grain
- sharp scrollbars and focus treatment
- common buttons and status marks

`SiteLayout` owns `SiteHeader`, `SiteFooter`, the skip link, router outlet, route focus, and scroll restoration. It stays mounted during internal page changes. Header behavior, mobile navigation, theme persistence, and compact-scroll state are implemented once.

`useSmoothScroll` owns one Lenis 1.3.26 session in the persistent shell. `smoothScrollSession.js` handles lifecycle/menu locking and `scrollPolicy.js` handles motion/input policy. Fine-pointer desktop wheel input is eased on the real native window, without a transformed wrapper. Reduced-motion and coarse-pointer devices remain native; policy changes destroy or create the driver. Touch, nested overflow areas, modified gestures and editable controls stay native. Keyed route restoration cancels old inertia after the router restores the native position; delayed hash scrolling emits a reset event before its native jump. Pointer/keyboard intent and menu locking stop current inertia. Cleanup removes the driver's frame loop and all session listeners. The public build carries the full Lenis MIT notice in `assets/lenis-license.html`, with a repository copy in `docs/licenses/Lenis-MIT.txt`.

`SiteLink` uses client navigation only for known site routes. External sources, repository URLs, installers, public assets, and same-document fragment anchors retain native link behavior. Modified clicks and opening a new tab are handled by React Router's standard link contract. Back and Forward restore keyed scroll positions. `RouteFocus` focuses new content and briefly watches for data-backed hash targets that appear after navigation.

Route handles provide footer and skip-target defaults. `useSiteFooter` lets the releases page synchronize the persistent footer with its actual latest release tag and Windows installer destination. Overrides are pathname-scoped so release metadata cannot leak into another route.

The shared footer follows the inspected Breaver Studios composition from footer.design: an illustrated upper boundary, navigation/message/utilities row, and large closing wordmark. `styles/footer.css` owns this composition; `public/assets/typescribe-footer-edge.svg` is original TypeScribe vector artwork. All footer destinations remain real. `useFooterBackground` reads the last section's computed background through `footerSurface.js`, including transparent ancestor fallback, and updates the join on route changes, theme changes, last-section insertion, and resize. The artwork's upper field and reel cutouts are genuinely transparent; physical paper keeps its cream fill. The closing wordmark alone uses the locally bundled `public/assets/fonts/patriot-bold.woff2`; the full publisher-attributed OFL notice is embedded in its standard name-table license field, with a readable copy in `docs/licenses/Patriot-OFL.txt`. This keeps the public-file/privacy allowlist unchanged. Desktop and mobile source captures and the selection record are retained privately in `.coord/footer-research/`.

Tailwind utilities handle ordinary layout, spacing, typography, responsive behavior, and states. Route CSS is reserved for the bespoke editorial hero, benchmark chart geometry, and other compositions that are clearer as named visual rules.

## Benchmark data boundary

`landing/benchmark/benchmark-data.json` remains the public source artifact. `benchmarkData.js` strictly rejects unapproved fields and invalid policy/cost relationships. `scripts/build-landing.mjs` validates this JSON before Vite writes `dist-landing` and copies the validated artifact to the public benchmark route.

Chart calculations remain framework-independent in `chartModel.js`. React chart components consume those pure functions, preserving pending, partial, and published score behavior. `languagePairData` retains complete paired rows and their existing order. `languageTrackData` appends independently scored single-track rows without inventing the missing value or an average; the language chart draws connectors only for complete pairs. `benchmarkStats.js` derives tested, ranked, full-English and probe-policy counts from that same validated data. The brief, methodology overview, matrix and updated date share the source rather than embedding a roster count.

The user-approved public schema `typescribe.transcriptbench.public.v2` retains the combined fields and adds each model's required `trackResults` object. Its `english` and `swahiliEnglish` entries are either null or complete full-track records containing coverage, TypeScribe score/display/rank/95% interval, and scalar word accuracy, WER, quality, gate and TypeScribe metrics. The validator rejects extra fields at every added level, partial coverage, unranked/inconsistent track scores, and scored Swahili probes. Legacy v1 data still validates and renders its original combined view; individual-track controls remain unavailable rather than inferring missing score components.

`scripts/export-benchmark-tracks.mjs` reads saved private reports and uses the explicit scalar selector in `scripts/lib/benchmark-track-export.mjs`. It verifies track identity, complete processing, existing metrics and unchanged combined fields before atomically replacing the validated public JSON. It does not load credentials, call providers or rerun scoring. No word dictionaries, bootstrap distributions, annotations, paths, hypotheses or raw responses are copied.

`BenchmarkPage` owns one language state, defaulting to All languages. `benchmarkScope.js` produces an immutable projection shared by all five charts and the table. All languages keeps the original combined results; English uses ten full-track results; Swahili-English uses six and excludes probes. Metric titles, counts, table columns/captions and rank/interval cards follow the projection. Expanded/disclosure state persists, hidden sort columns fall back to rank, and scope changes clear active chart cards. Ranks come from the frozen paired-bootstrap reports, including real English ties, not point-estimate sorting.

`chartGeometry.js` owns measured label packing and hover-card flip/shift rules separately from scoring geometry. `useChartLabels` measures full names, avoids other names and marks, and updates on chart/font size changes. Thin leaders identify displaced labels; SVG masks keep trails/leaders out of text. Marker/value coordinates remain unchanged. `useLanguageLabels` keeps numeric labels inside each language track; 60px minimum rows keep upper/lower values clear of adjacent rows.

`ChartModelCard` renders a tooltip portal outside horizontal scroll clipping. `useChartCardPosition` measures its actual hovered/focused point or name and content, chooses visible chart/viewport bounds, prioritizes not covering the active mark, and observes resize, nested/page/visual-viewport scroll, fonts and anchor-style movement. `useChartInteraction` keeps content available while moving across the gap into the card or retaining keyboard focus, then dismisses on Escape or metric/language change. Points use `aria-describedby` and a chart group rather than hiding button semantics inside an image role. All timers/observers/listeners/frame requests are cleaned up. Geometry/JSDOM and offline bundled-font diagnostics do not replace direct painted-browser/input QA.

Existing `policy`, `coverageMinutes`, `languageSupport`, `corpus.trials` and matrix/probe cost totals still describe the root Swahili-English configuration. They are not both-track expenditure. Nested track coverage resolves the former ambiguity for individual views. Native per-minute rates were verified equal across the two tracks for every model, so all views preserve the existing comparable 30-minute prices. Actual batch estimates remain separately documented. The footer's report label no longer hardcodes schema v1; navigation/layout and the public-tree file allowlist remain unchanged.

The Fish addition uses aggregate output from the unchanged private TranscriptBench pipeline. Both models completed the frozen English files but failed the separate Swahili eligibility check. They have real English scores and ranks, while Swahili and combined results remain null. Existing combined ranks, confidence intervals and metrics remain unchanged. The captured audio, hypotheses, raw responses and diagnostic probe comparisons stay private.

The benchmark results route keeps methodology compact. Its five-step brief uses a connected ordered process, compact run facts, and a separate reference-audit note, with styling in `methodology-brief.css`. It links to real nested methodology routes. Methodology documents use locally scoped forest/cream tokens in both site themes, without changing the chart palette elsewhere. Those routes share a sticky documentation sidebar on desktop and a horizontal tab rail on smaller screens; each route renders one bounded topic rather than one long methodology page. Nested route HTML is generated by `scripts/build-landing.mjs` for static hosting.

## Release data boundary

`releaseData.js` owns GitHub normalization and installer classification. Only executable OS artifacts count as installers. `useReleases` renders the bundled snapshot immediately, then replaces it with live GitHub data when available.

The archive owns UI state for OS filtering, disclosures, and pagination. Latest-release presentation does not perform data access.

## Commands

```bash
npm run dev:landing       # Vite development server on 127.0.0.1:8780
npm run test:landing      # Domain and privacy-contract tests
npm run build:landing     # Validated production build
npm run preview:landing   # Preview dist-landing
```
