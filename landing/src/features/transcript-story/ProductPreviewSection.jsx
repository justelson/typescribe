import { useState } from 'react';
import { Reveal } from '../../components/ui/Reveal.jsx';
import { PaperWorld } from './PaperWorld.jsx';
import { PreviewTabs } from './PreviewTabs.jsx';
import { productViews } from './storyContent.js';

export function ProductPreviewSection() {
  const [view, setView] = useState('cara');
  return (
    <section className="transcript-story transcript-product" id="the-desk" aria-labelledby="transcript-product-title">
      <PaperWorld className="transcript-product-world" />
      <div className="transcript-story-shell">
        <Reveal className="transcript-story-heading">
          <h2 id="transcript-product-title">One transcript.<br /><span>Two ways to work.</span></h2>
          <p>Check timed Rows against the recording. Switch to Cara for a readable, speaker-labelled document.</p>
        </Reveal>
        <Reveal className="transcript-product-stage">
          <div className="transcript-product-toolbar">
            <span>TypeScribe demo interview</span>
            <PreviewTabs id="product-view" label="Desktop app preview" items={productViews} value={view} onChange={setView} className="transcript-product-tabs" />
          </div>
          {productViews.map((item) => (
            <div role="tabpanel" id={`product-view-${item.id}-panel`} aria-labelledby={`product-view-${item.id}-tab`} tabIndex="0" hidden={view !== item.id} className="transcript-product-panel" key={item.id}>
              <picture>
                <source media="(max-width: 620px)" srcSet={item.mobile} type="image/webp" />
                <img src={item.image} width="1440" height="900" alt={item.alt} loading="lazy" decoding="async" />
              </picture>
              <p className="transcript-product-caption"><span>{item.detail}</span><span className="transcript-preview-desktop-label">Desktop screenshot · public demo</span><span className="transcript-preview-mobile-label">Desktop detail · public demo</span></p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
