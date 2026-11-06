import { useMemo } from 'react';

export function useDetectedPlatform() {
  return useMemo(() => {
    const value = `${navigator.userAgentData?.platform || ''} ${navigator.platform || ''} ${navigator.userAgent || ''}`.toLowerCase();
    if (value.includes('mac')) return { key: 'macos', label: 'macOS' };
    if (value.includes('linux') && !value.includes('android')) return { key: 'linux', label: 'Linux' };
    return { key: 'windows', label: 'Windows' };
  }, []);
}
