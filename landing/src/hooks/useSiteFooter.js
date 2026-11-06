import { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

export function useSiteFooter({ statement, metaLeft, metaRight, downloadHref }) {
  const updateFooter = useOutletContext();
  useEffect(() => {
    const values = Object.fromEntries(Object.entries({ statement, metaLeft, metaRight, downloadHref }).filter(([, value]) => value !== undefined));
    updateFooter(values);
  }, [downloadHref, metaLeft, metaRight, statement, updateFooter]);
}
