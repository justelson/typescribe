import { useReveal } from '../../hooks/useReveal.js';
import { ParallaxImage } from '../../components/ui/ParallaxImage.jsx';
import { Reveal } from '../../components/ui/Reveal.jsx';
import { roles, tools, workflow } from './content.js';

export function ToolDeskSection() {
  return (
    <section className="desk-menu">
      <div className="desk-menu-scallop" aria-hidden="true" />
      <div className="site-shell">
        <Reveal className="menu-heading"><h2>Your whole transcript desk.</h2><p>Every tool stays close to the sentence being fixed.</p></Reveal>
        <div className="tool-menu">
          {tools.map((tool, index) => (
            <Reveal as="article" direction="sticker" delay={(index % 3) * 45} className={`tool-item ${tool.tone}`} style={{ '--sticker-rotate': tool.rotate }} key={tool.number}>
              <img src={`/assets/${tool.image}`} loading="lazy" alt={tool.alt} />
              <span>{tool.number}</span><h3>{tool.title}</h3><p>{tool.copy}</p>
              {tool.noteType === 'key' ? <kbd>{tool.note}</kbd> : <small>{tool.note}</small>}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WorkflowSection() {
  return (
    <section className="workflow-section" id="workflow">
      <div className="workflow-hills" aria-hidden="true" />
      <ParallaxImage className="workflow-sticker" src="/assets/tool-highlighter.webp" loading="lazy" alt="" speed={0.1} aria-hidden="true" />
      <div className="site-shell workflow-grid">
        <Reveal direction="left" className="workflow-title"><h2>Audio in. Clean copy out.</h2><p>Five steps. The timing stays attached.</p></Reveal>
        <ol className="workflow-list">
          {workflow.map(([number, title, copy, status]) => (
            <Reveal as="li" key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div><strong>{status}</strong></Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

function TypedHeadline() {
  const { ref, visible } = useReveal({ threshold: 0.32 });
  return (
    <h2 className={`type-line ${visible ? 'is-typed' : ''}`} ref={ref}>
      {'MEETING OVER. CLEAN COPY DUE.'.split(' ').map((word, index) => <span style={{ '--word-index': index }} key={word}>{word}{index < 4 ? ' ' : ''}</span>)}
    </h2>
  );
}

export function AudienceSection() {
  return (
    <section className="audience-section">
      <div className="audience-burst" aria-hidden="true" />
      <div className="site-shell audience-inner">
        <ParallaxImage className="audience-character" src="/assets/character-secretary.webp" loading="lazy" alt="" speed={0.045} aria-hidden="true" />
        <TypedHeadline />
        <Reveal as="p" className="audience-copy">Check the spelling, separate the voices, find the quote, and hand over a file someone else can use.</Reveal>
        <div className="role-ledger">
          {roles.map(([role, copy]) => <Reveal key={role}><span>{role}</span><p>{copy}</p></Reveal>)}
        </div>
      </div>
    </section>
  );
}
