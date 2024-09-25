import { useRef } from 'react';

export const useCacheInitData = <T>(key: string, data: T) => {
  const cache = useRef(new Map()).current;

  return {
    set: () => {
      cache.set(key, data);
    },
    get: () => cache.get(key) as T | undefined,
    clear: () => cache.clear(),
  };
};
