import { useLocation } from 'react-router-dom';
import { useBenchmarkData } from '../features/benchmark/useBenchmarkData.js';
import { CaptureMethodology } from '../features/benchmark/methodology/CaptureMethodology.jsx';
import { CorpusMethodology } from '../features/benchmark/methodology/CorpusMethodology.jsx';
import { MethodologyShell } from '../features/benchmark/methodology/MethodologyShell.jsx';
import { ModelsMethodology } from '../features/benchmark/methodology/ModelsMethodology.jsx';
import { OverviewMethodology } from '../features/benchmark/methodology/OverviewMethodology.jsx';
import { PrivacyMethodology } from '../features/benchmark/methodology/PrivacyMethodology.jsx';
import { RankingMethodology } from '../features/benchmark/methodology/RankingMethodology.jsx';
import { ScoringMethodology } from '../features/benchmark/methodology/ScoringMethodology.jsx';
import { methodologyPageFromPath } from '../features/benchmark/methodology/methodologyPages.js';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata.js';
import '../styles/benchmark.css';
import '../styles/benchmark-methodology.css';

const contentBySlug = {
  overview: OverviewMethodology,
  corpus: CorpusMethodology,
  models: ModelsMethodology,
  capture: CaptureMethodology,
  scoring: ScoringMethodology,
  ranking: RankingMethodology,
  privacy: PrivacyMethodology,
};

export function BenchmarkMethodologyPage() {
  const { pathname } = useLocation();
  const activePage = methodologyPageFromPath(pathname);
  const { phase, data } = useBenchmarkData();
  const Content = contentBySlug[activePage.slug] ?? OverviewMethodology;
  useDocumentMetadata(`${activePage.title} · TypeScribe Bench`, activePage.description);

  return (
    <main className="methodology-page" id="main-content">
        <MethodologyShell activePage={activePage} data={data}>
          <Content data={data} phase={phase} />
        </MethodologyShell>
    </main>
  );
}
