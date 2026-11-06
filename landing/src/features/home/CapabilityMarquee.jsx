import { Fragment } from 'react';
import { capabilities } from './content.js';

export function CapabilityMarquee() {
  return (
    <div className="office-marquee" aria-label="TypeScribe capabilities">
      <div className="marquee-track">
        {[...capabilities, ...capabilities].map((capability, index) => (
          <Fragment key={`${capability}-${index}`}>
            <span aria-hidden={index >= capabilities.length ? 'true' : undefined}>{capability}</span><i aria-hidden="true">✳</i>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
