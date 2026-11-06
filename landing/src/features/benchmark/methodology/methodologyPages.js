export const methodologyPages = [
  {
    slug: 'overview',
    label: 'Overview',
    path: '/benchmark/methodology/',
    title: 'Methodology overview',
    description: 'The benchmark pipeline, comparison boundary, and the question TypeScribe Bench is designed to answer.',
  },
  {
    slug: 'corpus',
    label: 'Corpus',
    path: '/benchmark/methodology/corpus/',
    title: 'Corpus and references',
    description: 'How the two 30-minute tracks were selected, frozen, verified, and kept within their publication boundaries.',
  },
  {
    slug: 'models',
    label: 'Model matrix',
    path: '/benchmark/methodology/models/',
    title: 'Models and eligibility',
    description: 'The tested API configurations, language-support rules, identity checks, probes, and combined-ranking requirements.',
  },
  {
    slug: 'capture',
    label: 'Capture protocol',
    path: '/benchmark/methodology/capture/',
    title: 'Capture protocol',
    description: 'The fresh-run process, request records, budget guardrails, resumability, and remote cleanup used for provider capture.',
  },
  {
    slug: 'scoring',
    label: 'Scoring',
    path: '/benchmark/methodology/scoring/',
    title: 'Normalization and scoring',
    description: 'WER, quality gates, challenge evidence, terminology, numbers, reliable blocks, and the final TypeScribe formula.',
  },
  {
    slug: 'ranking',
    label: 'Ranking and ties',
    path: '/benchmark/methodology/ranking/',
    title: 'Combination, uncertainty, and ranks',
    description: 'Equal track weighting, paired bootstrap intervals, shared ranks, and the evidence excluded from score calculation.',
  },
  {
    slug: 'privacy',
    label: 'Privacy and limits',
    path: '/benchmark/methodology/privacy/',
    title: 'Privacy, disclosure, and limitations',
    description: 'What the public benchmark publishes, what remains private, and the limits readers should retain when using the results.',
  },
];

export function methodologyPageFromPath(pathname) {
  const normalized = `${pathname.replace(/\/+$/, '') || '/benchmark/methodology'}/`;
  return methodologyPages.find((page) => page.path === normalized) ?? methodologyPages[0];
}
