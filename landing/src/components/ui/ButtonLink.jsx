import { SiteLink } from './SiteLink.jsx';

export function ButtonLink({ children, className = '', tone = 'red', ...props }) {
  const tones = {
    red: 'border-red bg-red text-cream shadow-[4px_4px_0_#f6c943] hover:bg-red-dark',
    cream: 'border-cream bg-cream text-ink shadow-[4px_4px_0_#cc3f27] hover:bg-yellow',
    outline: 'border-[var(--page-copy)] bg-transparent text-[var(--page-copy)] shadow-[4px_4px_0_var(--page-copy)] hover:border-yellow hover:text-yellow',
  };

  return (
    <SiteLink
      className={`button button-${tone} site-slide-button inline-flex min-h-11 items-center justify-center gap-2 border px-4 py-2.5 text-center text-[.76rem] font-extrabold no-underline transition-[transform,background,color,border-color] duration-150 hover:-translate-y-0.5 ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </SiteLink>
  );
}
