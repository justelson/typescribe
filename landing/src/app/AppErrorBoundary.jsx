import { Component } from 'react';

export class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('TypeScribe site render failed', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--page-bg)] px-6 text-[var(--page-copy)]">
        <div className="max-w-lg border border-[var(--page-line)] bg-[var(--surface)] p-8">
          <h1 className="font-display text-3xl">This page could not render.</h1>
          <p className="mt-3 text-sm text-[var(--page-muted)]">Reload the page to try the public site again.</p>
          <button className="site-slide-button mt-6 min-h-11 bg-yellow px-4 font-bold text-ink" type="button" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </main>
    );
  }
}
