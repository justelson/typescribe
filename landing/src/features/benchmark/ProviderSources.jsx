import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '../../components/ui/Reveal.jsx';

const providers = [
  { key: 'deepgram', name: 'Deepgram', href: 'https://deepgram.com/pricing', label: 'Pricing', path: 'M11.203 24H1.517a.364.364 0 0 1-.258-.62l6.239-6.275a.366.366 0 0 1 .259-.108h3.52c2.723 0 5.025-2.127 5.107-4.845a5.004 5.004 0 0 0-4.999-5.148H7.613v4.646c0 .2-.164.364-.365.364H.968a.365.365 0 0 1-.363-.364V.364C.605.164.768 0 .969 0h10.416c6.684 0 12.111 5.485 12.01 12.187C23.293 18.77 17.794 24 11.202 24z' },
  { key: 'elevenlabs', name: 'ElevenLabs', href: 'https://elevenlabs.io/pricing/api?price.section=speech_to_text', label: 'API pricing', path: 'M4.6035 0v24h4.9317V0zm9.8613 0v24h4.9317V0z' },
  { key: 'speechmatics', name: 'Speechmatics', href: 'https://www.speechmatics.com/pricing', label: 'Pricing', image: '/assets/speechmatics-logo.svg', imageClass: 'provider-logo speechmatics-logo' },
  { key: 'assemblyai', name: 'AssemblyAI', href: 'https://www.assemblyai.com/pricing', label: 'Pricing', image: '/assets/assemblyai-logo.svg', imageClass: 'provider-logo assemblyai-logo' },
  { key: 'groq', name: 'Groq', href: 'https://console.groq.com/docs/speech-to-text', label: 'Speech docs', image: '/assets/groq-logo.svg', imageClass: 'groq-logo' },
  { key: 'fish-audio', name: 'Fish Audio', href: 'https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits', label: 'ASR pricing', image: '/assets/fish-audio-logo.svg', imageClass: 'provider-logo fish-audio-logo' },
];

export function ProviderSources() {
  return (
    <section className="sources-section" id="sources" aria-labelledby="sources-title">
      <div className="mx-auto w-[calc(100%-48px)] max-w-[1120px] max-[760px]:w-[calc(100%-16px)]">
        <Reveal className="sources-heading"><h2 id="sources-title">Provider sources</h2><p>Pricing and model documentation used by TypeScribe Bench.</p></Reveal>
        <Reveal className="provider-cloud">
          {providers.map((provider) => (
            <a className={`provider-mark ${provider.key}`} href={provider.href} aria-label={`${provider.name} ${provider.label}`} key={provider.key}>
              <div className="provider-symbol" aria-hidden="true">
                {provider.path ? <svg viewBox="0 0 24 24"><path d={provider.path} /></svg> : <img className={provider.imageClass} src={provider.image} alt="" />}
              </div>
              <strong>{provider.name}</strong>
              <span>{provider.label}<ArrowUpRight size={11} /></span>
            </a>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
