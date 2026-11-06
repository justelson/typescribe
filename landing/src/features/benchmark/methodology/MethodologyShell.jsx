import { ArrowLeft, ArrowRight } from 'lucide-react';
import { methodologyPages } from './methodologyPages.js';
import { SiteLink } from '../../../components/ui/SiteLink.jsx';

export function MethodologyShell({ activePage, data, children }) {
  const index = methodologyPages.findIndex((page) => page.slug === activePage.slug);
  const previous = index > 0 ? methodologyPages[index - 1] : null;
  const next = index < methodologyPages.length - 1 ? methodologyPages[index + 1] : null;

  return (
    <div className="methodology-layout">
      <aside className="methodology-sidebar">
        <SiteLink className="methodology-back-link" href="/benchmark/"><ArrowLeft size={14} />Back to results</SiteLink>
        <div className="methodology-sidebar-title"><strong>Methodology</strong><span>TypeScribe Bench v2</span></div>
        <nav aria-label="Benchmark methodology pages">
          {methodologyPages.map((page, pageIndex) => (
            <SiteLink href={page.path} aria-current={page.slug === activePage.slug ? 'page' : undefined} key={page.slug}>
              <span>{String(pageIndex + 1).padStart(2, '0')}</span>{page.label}
            </SiteLink>
          ))}
        </nav>
        <p>Public methods only. No audio, transcript text, provider responses, or private annotations are served here.</p>
      </aside>

      <article className="methodology-article">
        <header className="methodology-article-header">
          <p><SiteLink href="/benchmark/">TypeScribe Bench</SiteLink><span>/</span>Methodology</p>
          <h1>{activePage.title}</h1>
          <div className="methodology-article-summary">{activePage.description}</div>
          <dl>
            <div><dt>Benchmark</dt><dd>{data?.version ?? '—'}</dd></div>
            <div><dt>Updated</dt><dd>{data?.updated ?? '—'}</dd></div>
            <div><dt>Tracks</dt><dd>English · Swahili-English</dd></div>
          </dl>
        </header>

        <div className="methodology-article-body">{children}</div>

        <nav className="methodology-page-nav" aria-label="Adjacent methodology pages">
          {previous ? <SiteLink href={previous.path}><ArrowLeft size={15} /><span><small>Previous</small><strong>{previous.label}</strong></span></SiteLink> : <span />}
          {next ? <SiteLink href={next.path}><span><small>Next</small><strong>{next.label}</strong></span><ArrowRight size={15} /></SiteLink> : <SiteLink href="/benchmark/"><span><small>Return</small><strong>Benchmark results</strong></span><ArrowRight size={15} /></SiteLink>}
        </nav>
      </article>
    </div>
  );
}
