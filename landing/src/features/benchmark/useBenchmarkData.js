import { useCallback, useEffect, useRef, useState } from 'react';
import { loadBenchmarkData } from './benchmarkData.js';

export function useBenchmarkData() {
  const [request, setRequest] = useState(0);
  const [state, setState] = useState({ phase: 'loading', data: null, error: null });
  const requestId = useRef(0);

  const retry = useCallback(() => setRequest((value) => value + 1), []);

  useEffect(() => {
    const id = ++requestId.current;
    setState({ phase: 'loading', data: null, error: null });
    loadBenchmarkData('/benchmark/benchmark-data.json')
      .then((data) => {
        if (requestId.current === id) setState({ phase: data.models.length ? 'ready' : 'empty', data, error: null });
      })
      .catch((error) => {
        if (requestId.current === id) setState({ phase: 'error', data: null, error });
      });
  }, [request]);

  return { ...state, retry };
}
