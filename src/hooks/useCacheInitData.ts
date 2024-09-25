import { useRef } from 'react';

export const useCacheInitData = <T>() => {
  const cache = useRef(new Map()).current;

  return {
    set: (key: string, data: T) => {
      cache.set(key, data);
    },
    get: (key: string) => cache.get(key) as T | undefined,
    clear: () => cache.clear(),
  };
};
