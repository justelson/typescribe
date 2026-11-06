import { CapabilityMarquee } from '../features/home/CapabilityMarquee.jsx';
import { HeroSection } from '../features/home/HeroSection.jsx';
import { ProductPreviewSection } from '../features/transcript-story/ProductPreviewSection.jsx';
import { TranscriptWorkSection } from '../features/transcript-story/TranscriptWorkSection.jsx';
import { TranscriptConfidenceSection } from '../features/transcript-story/TranscriptConfidenceSection.jsx';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata.js';
import '../styles/home.css';
import '../styles/transcript-story.css';

export function HomePage() {
  useDocumentMetadata('TypeScribe | The transcript desk', 'TypeScribe is a Windows transcript desk for timed Rows, readable Cara documents, playback sync, markers, and controlled exports.');
  return (
    <main id="main-content">
      <HeroSection />
      <CapabilityMarquee />
      <ProductPreviewSection />
      <TranscriptWorkSection />
      <TranscriptConfidenceSection />
    </main>
  );
}
