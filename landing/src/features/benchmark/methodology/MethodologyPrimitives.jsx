export function DocSection({ id, title, intro, children }) {
  return (
    <section className="method-doc-section" id={id}>
      <div className="method-doc-section-heading"><h2>{title}</h2>{intro && <p>{intro}</p>}</div>
      {children}
    </section>
  );
}

export function DocCallout({ title, children, tone = 'default' }) {
  return (
    <aside className={`method-doc-callout is-${tone}`}>
      <strong>{title}</strong>
      <div>{children}</div>
    </aside>
  );
}

export function Formula({ label, children }) {
  return (
    <div className="method-formula">
      <span>{label}</span>
      <code>{children}</code>
    </div>
  );
}

export function MethodTable({ label, headings, children }) {
  return (
    <div className="method-table-scroll" tabIndex={0} aria-label={label}>
      <table>
        <caption className="sr-only">{label}</caption>
        <thead><tr>{headings.map((heading) => <th scope="col" key={heading}>{heading}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function NumberedMethod({ items }) {
  return (
    <ol className="method-numbered-list">
      {items.map((item, index) => (
        <li key={item.title}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.title}</strong><p>{item.copy}</p></div></li>
      ))}
    </ol>
  );
}

export function DefinitionRows({ rows }) {
  return (
    <dl className="method-definition-rows">
      {rows.map(([term, definition]) => <div key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}
    </dl>
  );
}
